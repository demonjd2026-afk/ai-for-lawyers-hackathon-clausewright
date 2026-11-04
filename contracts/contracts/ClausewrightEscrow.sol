// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ClausewrightEscrow
/// @notice Milestone escrow whose parameters are generated from the same term sheet as the
///         natural-language contract, and which is bound to that contract by its SHA-256 hash.
/// @dev Design choices (see docs/ESCROW.md):
///      - Pull payments only (credits + withdraw) to remove push-payment reentrancy and DoS.
///      - Funds are pre-committed, so the 45-day payment cap in s.15 MSMED Act 2006 cannot be
///        breached once a milestone is accepted.
///      - Deemed acceptance after `acceptanceWindow` mirrors s.2(b) MSMED Act (max 15 days in
///        MSME mode).
///      - Arbiter must be neutral (neither party), reflecting the Supreme Court's 2024
///        Constitution Bench view against unilateral appointment of arbitrators.
///      - No admin, no upgradeability, no owner: nobody but the parties and arbiter can move funds.
contract ClausewrightEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        Pending, // awaiting delivery
        Delivered, // payee has submitted delivery; acceptance window running
        Disputed, // payer disputed within the window
        Closed // terminal; see payeeBps
    }

    struct MilestoneInput {
        uint128 amount;
        uint64 dueDate;
    }

    struct Milestone {
        uint128 amount;
        uint64 dueDate;
        uint64 deliveredAt;
        uint64 disputedAt;
        uint16 payeeBps; // share paid to payee on close (10000 = all)
        State state;
    }

    uint256 public constant MAX_MILESTONES = 20;
    uint16 public constant BPS = 10_000;
    uint64 public constant MIN_ACCEPTANCE_WINDOW = 1 days;
    uint64 public constant MSME_MAX_ACCEPTANCE_WINDOW = 15 days;
    uint64 public constant MAX_ACCEPTANCE_WINDOW = 90 days;

    IERC20 public immutable token;
    address public immutable payer;
    address public immutable payee;
    bytes32 public immutable documentHash; // sha256 of canonical contract text
    bytes32 public immutable termsHash; // sha256 of canonical term-sheet JSON
    uint64 public immutable acceptanceWindow;
    uint64 public immutable fundingDeadline;
    bool public immutable msmeMode;
    uint256 public immutable totalAmount;

    address public arbiter;
    bool public payeeAcknowledged;
    bool public funded;
    bool public cancelled;
    uint256 public totalCredits;

    Milestone[] private _milestones;
    mapping(address => uint256) public credits;
    /// @dev milestone => party => proposed payee bps + 1 (0 means no proposal)
    mapping(uint256 => mapping(address => uint256)) private _settlement;
    mapping(address => address) public arbiterProposal; // party => proposed new arbiter
    mapping(address => bool) public cancelProposal; // party => wants mutual cancellation

    error ZeroAddress();
    error PartiesNotDistinct();
    error NotAContract();
    error BadMilestoneCount();
    error BadAmount();
    error BadDate();
    error BadWindow();
    error BadHash();
    error NotParty();
    error NotPayer();
    error NotPayee();
    error NotArbiter();
    error WrongDocument();
    error NotAcknowledged();
    error AlreadyFunded();
    error NotFunded();
    error IsCancelled();
    error FundingClosed();
    error FeeOnTransferToken();
    error BadState();
    error WindowOpen();
    error WindowClosed();
    error BadBps();
    error NothingToWithdraw();
    error BadIndex();

    event Acknowledged(address indexed party, bytes32 documentHash);
    event Funded(address indexed payer, uint256 amount);
    event Delivered(uint256 indexed milestone, uint64 timestamp);
    event Accepted(uint256 indexed milestone, bool deemed);
    event Disputed(uint256 indexed milestone, uint64 timestamp);
    event Closed(uint256 indexed milestone, uint16 payeeBps, uint256 toPayee, uint256 toPayer);
    event SettlementProposed(uint256 indexed milestone, address indexed party, uint16 payeeBps);
    event ArbiterProposed(address indexed party, address indexed newArbiter);
    event ArbiterReplaced(address indexed oldArbiter, address indexed newArbiter);
    event CancelProposed(address indexed party);
    event Cancelled(uint256 refundedToPayer);
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyParty() {
        if (msg.sender != payer && msg.sender != payee) revert NotParty();
        _;
    }

    modifier live() {
        if (cancelled) revert IsCancelled();
        if (!funded) revert NotFunded();
        _;
    }

    constructor(
        IERC20 token_,
        address payer_,
        address payee_,
        address arbiter_,
        bytes32 documentHash_,
        bytes32 termsHash_,
        uint64 acceptanceWindow_,
        uint64 fundingDeadline_,
        bool msmeMode_,
        MilestoneInput[] memory milestones_
    ) {
        if (address(token_) == address(0) || payer_ == address(0) || payee_ == address(0) || arbiter_ == address(0))
        {
            revert ZeroAddress();
        }
        if (address(token_).code.length == 0) revert NotAContract();
        if (payer_ == payee_ || arbiter_ == payer_ || arbiter_ == payee_) revert PartiesNotDistinct();
        if (documentHash_ == bytes32(0) || termsHash_ == bytes32(0)) revert BadHash();
        uint64 maxWindow = msmeMode_ ? MSME_MAX_ACCEPTANCE_WINDOW : MAX_ACCEPTANCE_WINDOW;
        if (acceptanceWindow_ < MIN_ACCEPTANCE_WINDOW || acceptanceWindow_ > maxWindow) revert BadWindow();
        if (fundingDeadline_ <= block.timestamp) revert BadDate();
        uint256 n = milestones_.length;
        if (n == 0 || n > MAX_MILESTONES) revert BadMilestoneCount();

        uint256 total = 0;
        for (uint256 i; i < n; ++i) {
            MilestoneInput memory m = milestones_[i];
            if (m.amount == 0) revert BadAmount();
            if (m.dueDate <= block.timestamp) revert BadDate();
            total += m.amount;
            _milestones.push(
                Milestone({
                    amount: m.amount, dueDate: m.dueDate, deliveredAt: 0, disputedAt: 0, payeeBps: 0, state: State.Pending
                })
            );
        }

        token = token_;
        payer = payer_;
        payee = payee_;
        arbiter = arbiter_;
        documentHash = documentHash_;
        termsHash = termsHash_;
        acceptanceWindow = acceptanceWindow_;
        fundingDeadline = fundingDeadline_;
        msmeMode = msmeMode_;
        totalAmount = total;
    }

    // ------------------------------------------------------------------ views

    function milestoneCount() external view returns (uint256) {
        return _milestones.length;
    }

    function milestone(uint256 i) external view returns (Milestone memory) {
        if (i >= _milestones.length) revert BadIndex();
        return _milestones[i];
    }

    function settlementProposal(uint256 i, address party) external view returns (bool exists, uint16 payeeBps) {
        uint256 v = _settlement[i][party];
        return (v != 0, v == 0 ? 0 : uint16(v - 1));
    }

    /// @notice Amount still held for milestones that are not closed.
    function openAmount() public view returns (uint256 sum) {
        uint256 n = _milestones.length;
        for (uint256 i; i < n; ++i) {
            if (_milestones[i].state != State.Closed) sum += _milestones[i].amount;
        }
    }

    // -------------------------------------------------------- acknowledgement & funding

    /// @notice Payee confirms on-chain that they have read and accept the exact document.
    function acknowledge(bytes32 expectedDocumentHash) external {
        if (msg.sender != payee) revert NotPayee();
        if (cancelled) revert IsCancelled();
        if (expectedDocumentHash != documentHash) revert WrongDocument();
        payeeAcknowledged = true;
        emit Acknowledged(msg.sender, expectedDocumentHash);
    }

    /// @notice Payer funds the full contract value; doing so is the payer's acknowledgement.
    function fund(bytes32 expectedDocumentHash) external nonReentrant {
        if (msg.sender != payer) revert NotPayer();
        if (cancelled) revert IsCancelled();
        if (funded) revert AlreadyFunded();
        if (expectedDocumentHash != documentHash) revert WrongDocument();
        if (!payeeAcknowledged) revert NotAcknowledged();
        if (block.timestamp > fundingDeadline) revert FundingClosed();

        funded = true; // effects before interaction
        uint256 beforeBal = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), totalAmount);
        if (token.balanceOf(address(this)) - beforeBal != totalAmount) revert FeeOnTransferToken();

        emit Acknowledged(msg.sender, expectedDocumentHash);
        emit Funded(msg.sender, totalAmount);
    }

    /// @notice Either party may walk away before money moves, or anyone once funding lapsed.
    function cancelUnfunded() external {
        if (funded) revert AlreadyFunded();
        if (cancelled) revert IsCancelled();
        bool isParty = msg.sender == payer || msg.sender == payee;
        if (!isParty && block.timestamp <= fundingDeadline) revert NotParty();
        cancelled = true;
        emit Cancelled(0);
    }

    // -------------------------------------------------------------- milestone flow

    function submitDelivery(uint256 i) external live {
        if (msg.sender != payee) revert NotPayee();
        Milestone storage m = _get(i);
        if (m.state != State.Pending) revert BadState();
        m.state = State.Delivered;
        m.deliveredAt = uint64(block.timestamp);
        emit Delivered(i, m.deliveredAt);
    }

    function accept(uint256 i) external live {
        if (msg.sender != payer) revert NotPayer();
        Milestone storage m = _get(i);
        if (m.state != State.Delivered) revert BadState();
        _close(i, m, BPS);
        emit Accepted(i, false);
    }

    function dispute(uint256 i) external live {
        if (msg.sender != payer) revert NotPayer();
        Milestone storage m = _get(i);
        if (m.state != State.Delivered) revert BadState();
        if (block.timestamp > uint256(m.deliveredAt) + acceptanceWindow) revert WindowClosed();
        m.state = State.Disputed;
        m.disputedAt = uint64(block.timestamp);
        emit Disputed(i, m.disputedAt);
    }

    /// @notice Deemed acceptance: payer stayed silent past the acceptance window.
    function claimDeemedAcceptance(uint256 i) external live {
        Milestone storage m = _get(i);
        if (m.state != State.Delivered) revert BadState();
        if (block.timestamp <= uint256(m.deliveredAt) + acceptanceWindow) revert WindowOpen();
        _close(i, m, BPS);
        emit Accepted(i, true);
    }

    /// @notice Payer recovers a milestone the payee never delivered (due date + grace passed).
    function reclaimUndelivered(uint256 i) external live {
        if (msg.sender != payer) revert NotPayer();
        Milestone storage m = _get(i);
        if (m.state != State.Pending) revert BadState();
        if (block.timestamp <= uint256(m.dueDate) + acceptanceWindow) revert WindowOpen();
        _close(i, m, 0);
    }

    /// @notice Payee voluntarily releases a milestone back to the payer.
    function waive(uint256 i) external live {
        if (msg.sender != payee) revert NotPayee();
        Milestone storage m = _get(i);
        if (m.state == State.Closed) revert BadState();
        _close(i, m, 0);
    }

    // ------------------------------------------------------------ dispute resolution

    function resolve(uint256 i, uint16 payeeBps) external live {
        if (msg.sender != arbiter) revert NotArbiter();
        if (payeeBps > BPS) revert BadBps();
        Milestone storage m = _get(i);
        if (m.state != State.Disputed) revert BadState();
        _close(i, m, payeeBps);
    }

    /// @notice Parties can settle a dispute themselves; executes when both propose the same split.
    function proposeSettlement(uint256 i, uint16 payeeBps) external live onlyParty {
        if (payeeBps > BPS) revert BadBps();
        Milestone storage m = _get(i);
        if (m.state != State.Disputed) revert BadState();
        _settlement[i][msg.sender] = uint256(payeeBps) + 1;
        emit SettlementProposed(i, msg.sender, payeeBps);
        address other = msg.sender == payer ? payee : payer;
        if (_settlement[i][other] == uint256(payeeBps) + 1) {
            _close(i, m, payeeBps);
        }
    }

    /// @notice Replace an unresponsive arbiter; requires both parties to name the same neutral address.
    function proposeArbiter(address newArbiter) external onlyParty {
        if (cancelled) revert IsCancelled();
        if (newArbiter == address(0)) revert ZeroAddress();
        if (newArbiter == payer || newArbiter == payee) revert PartiesNotDistinct();
        arbiterProposal[msg.sender] = newArbiter;
        emit ArbiterProposed(msg.sender, newArbiter);
        address other = msg.sender == payer ? payee : payer;
        if (arbiterProposal[other] == newArbiter) {
            address old = arbiter;
            arbiter = newArbiter;
            delete arbiterProposal[payer];
            delete arbiterProposal[payee];
            emit ArbiterReplaced(old, newArbiter);
        }
    }

    /// @notice Mutual termination after funding: unresolved amounts return to the payer.
    function proposeCancel() external live onlyParty {
        cancelProposal[msg.sender] = true;
        emit CancelProposed(msg.sender);
        if (cancelProposal[payer] && cancelProposal[payee]) {
            uint256 refund = openAmount();
            uint256 n = _milestones.length;
            for (uint256 i; i < n; ++i) {
                Milestone storage m = _milestones[i];
                if (m.state != State.Closed) {
                    m.state = State.Closed;
                    m.payeeBps = 0;
                }
            }
            cancelled = true;
            _credit(payer, refund);
            emit Cancelled(refund);
        }
    }

    function revokeCancel() external onlyParty {
        cancelProposal[msg.sender] = false;
    }

    // ------------------------------------------------------------------- payouts

    function withdraw() external nonReentrant {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        credits[msg.sender] = 0;
        totalCredits -= amount;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ------------------------------------------------------------------ internals

    function _get(uint256 i) private view returns (Milestone storage) {
        if (i >= _milestones.length) revert BadIndex();
        return _milestones[i];
    }

    function _close(uint256 i, Milestone storage m, uint16 payeeBps) private {
        m.state = State.Closed;
        m.payeeBps = payeeBps;
        uint256 toPayee = (uint256(m.amount) * payeeBps) / BPS;
        uint256 toPayer = uint256(m.amount) - toPayee; // rounding dust goes to the payer
        delete _settlement[i][payer];
        delete _settlement[i][payee];
        if (toPayee != 0) _credit(payee, toPayee);
        if (toPayer != 0) _credit(payer, toPayer);
        emit Closed(i, payeeBps, toPayee, toPayer);
    }

    function _credit(address to, uint256 amount) private {
        credits[to] += amount;
        totalCredits += amount;
    }
}
