// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ClausewrightEscrow} from "../ClausewrightEscrow.sol";
import {DemoINR} from "../DemoINR.sol";

contract FeeToken is ERC20 {
    constructor() ERC20("Fee", "FEE") {}

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            super._update(from, to, value - value / 100);
            super._update(from, address(0xdead), value / 100);
        } else {
            super._update(from, to, value);
        }
    }
}

/// @dev Token that tries to re-enter withdraw() during transfer.
contract ReentrantToken is ERC20 {
    ClausewrightEscrow public target;
    bool public attacked;

    constructor() ERC20("Re", "RE") {}

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }

    function arm(ClausewrightEscrow t) external {
        target = t;
    }

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (address(target) != address(0) && from == address(target) && !attacked) {
            attacked = true;
            target.withdraw(); // must revert via ReentrancyGuard
        }
    }
}

contract ClausewrightEscrowTest is Test {
    DemoINR token;
    address payer = address(0xA11CE);
    address payee = address(0xB0B);
    address arbiter = address(0xA4B);
    bytes32 docHash = keccak256("contract text");
    bytes32 termsHash = keccak256("terms json");
    uint64 constant WINDOW = 15 days;

    function setUp() public {
        vm.warp(1_800_000_000);
        token = new DemoINR();
        vm.prank(payer);
        token.faucet();
    }

    function _ms(uint128 a, uint128 b) internal view returns (ClausewrightEscrow.MilestoneInput[] memory m) {
        m = new ClausewrightEscrow.MilestoneInput[](2);
        m[0] = ClausewrightEscrow.MilestoneInput(a, uint64(block.timestamp + 30 days));
        m[1] = ClausewrightEscrow.MilestoneInput(b, uint64(block.timestamp + 60 days));
    }

    function _deploy(uint128 a, uint128 b) internal returns (ClausewrightEscrow e) {
        e = new ClausewrightEscrow(
            IERC20(address(token)),
            payer,
            payee,
            arbiter,
            docHash,
            termsHash,
            WINDOW,
            uint64(block.timestamp + 7 days),
            true,
            _ms(a, b)
        );
    }

    function _funded(uint128 a, uint128 b) internal returns (ClausewrightEscrow e) {
        e = _deploy(a, b);
        vm.prank(payee);
        e.acknowledge(docHash);
        vm.startPrank(payer);
        token.approve(address(e), uint256(a) + b);
        e.fund(docHash);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- constructor

    function test_constructorStoresTerms() public {
        ClausewrightEscrow e = _deploy(100_00, 200_00);
        assertEq(e.totalAmount(), 300_00);
        assertEq(e.milestoneCount(), 2);
        assertEq(e.documentHash(), docHash);
        assertTrue(e.msmeMode());
    }

    function test_revert_arbiterIsParty() public {
        vm.expectRevert(ClausewrightEscrow.PartiesNotDistinct.selector);
        new ClausewrightEscrow(
            IERC20(address(token)), payer, payee, payer, docHash, termsHash, WINDOW,
            uint64(block.timestamp + 1 days), true, _ms(1, 1)
        );
    }

    function test_revert_msmeWindowAbove15Days() public {
        vm.expectRevert(ClausewrightEscrow.BadWindow.selector);
        new ClausewrightEscrow(
            IERC20(address(token)), payer, payee, arbiter, docHash, termsHash, 16 days,
            uint64(block.timestamp + 1 days), true, _ms(1, 1)
        );
    }

    function test_nonMsmeAllowsLongerWindow() public {
        new ClausewrightEscrow(
            IERC20(address(token)), payer, payee, arbiter, docHash, termsHash, 30 days,
            uint64(block.timestamp + 1 days), false, _ms(1, 1)
        );
    }

    function test_revert_zeroAmount() public {
        vm.expectRevert(ClausewrightEscrow.BadAmount.selector);
        _deploy(0, 1);
    }

    function test_revert_pastDueDate() public {
        ClausewrightEscrow.MilestoneInput[] memory m = new ClausewrightEscrow.MilestoneInput[](1);
        m[0] = ClausewrightEscrow.MilestoneInput(1, uint64(block.timestamp));
        vm.expectRevert(ClausewrightEscrow.BadDate.selector);
        new ClausewrightEscrow(
            IERC20(address(token)), payer, payee, arbiter, docHash, termsHash, WINDOW,
            uint64(block.timestamp + 1 days), true, m
        );
    }

    function test_revert_tooManyMilestones() public {
        ClausewrightEscrow.MilestoneInput[] memory m = new ClausewrightEscrow.MilestoneInput[](21);
        for (uint256 i; i < 21; ++i) m[i] = ClausewrightEscrow.MilestoneInput(1, uint64(block.timestamp + 1 days));
        vm.expectRevert(ClausewrightEscrow.BadMilestoneCount.selector);
        new ClausewrightEscrow(
            IERC20(address(token)), payer, payee, arbiter, docHash, termsHash, WINDOW,
            uint64(block.timestamp + 1 days), true, m
        );
    }

    function test_revert_eoaToken() public {
        vm.expectRevert(ClausewrightEscrow.NotAContract.selector);
        new ClausewrightEscrow(
            IERC20(address(0x1234)), payer, payee, arbiter, docHash, termsHash, WINDOW,
            uint64(block.timestamp + 1 days), true, _ms(1, 1)
        );
    }

    function test_revert_zeroHash() public {
        vm.expectRevert(ClausewrightEscrow.BadHash.selector);
        new ClausewrightEscrow(
            IERC20(address(token)), payer, payee, arbiter, bytes32(0), termsHash, WINDOW,
            uint64(block.timestamp + 1 days), true, _ms(1, 1)
        );
    }

    // ------------------------------------------------------------------- funding

    function test_revert_fundBeforeAcknowledge() public {
        ClausewrightEscrow e = _deploy(1, 1);
        vm.startPrank(payer);
        token.approve(address(e), 2);
        vm.expectRevert(ClausewrightEscrow.NotAcknowledged.selector);
        e.fund(docHash);
        vm.stopPrank();
    }

    function test_revert_acknowledgeWrongDocument() public {
        ClausewrightEscrow e = _deploy(1, 1);
        vm.prank(payee);
        vm.expectRevert(ClausewrightEscrow.WrongDocument.selector);
        e.acknowledge(keccak256("tampered"));
    }

    function test_revert_fundAfterDeadline() public {
        ClausewrightEscrow e = _deploy(1, 1);
        vm.prank(payee);
        e.acknowledge(docHash);
        vm.warp(block.timestamp + 8 days);
        vm.startPrank(payer);
        token.approve(address(e), 2);
        vm.expectRevert(ClausewrightEscrow.FundingClosed.selector);
        e.fund(docHash);
        vm.stopPrank();
    }

    function test_revert_doubleFund() public {
        ClausewrightEscrow e = _funded(1, 1);
        vm.prank(payer);
        vm.expectRevert(ClausewrightEscrow.AlreadyFunded.selector);
        e.fund(docHash);
    }

    function test_revert_feeOnTransferToken() public {
        FeeToken ft = new FeeToken();
        ft.mint(payer, 1_000_000);
        ClausewrightEscrow e = new ClausewrightEscrow(
            IERC20(address(ft)), payer, payee, arbiter, docHash, termsHash, WINDOW,
            uint64(block.timestamp + 1 days), true, _ms(1000, 1000)
        );
        vm.prank(payee);
        e.acknowledge(docHash);
        vm.startPrank(payer);
        ft.approve(address(e), 2000);
        vm.expectRevert(ClausewrightEscrow.FeeOnTransferToken.selector);
        e.fund(docHash);
        vm.stopPrank();
    }

    function test_cancelUnfundedByStrangerOnlyAfterDeadline() public {
        ClausewrightEscrow e = _deploy(1, 1);
        vm.prank(address(0xBAD));
        vm.expectRevert(ClausewrightEscrow.NotParty.selector);
        e.cancelUnfunded();
        vm.warp(block.timestamp + 8 days);
        vm.prank(address(0xBAD));
        e.cancelUnfunded();
        assertTrue(e.cancelled());
    }

    // ------------------------------------------------------------- happy paths

    function test_deliverAcceptWithdraw() public {
        ClausewrightEscrow e = _funded(100_00, 200_00);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.prank(payer);
        e.accept(0);
        assertEq(e.credits(payee), 100_00);
        vm.prank(payee);
        e.withdraw();
        assertEq(token.balanceOf(payee), 100_00);
        assertEq(token.balanceOf(address(e)), 200_00);
    }

    function test_deemedAcceptanceAfterWindow() public {
        ClausewrightEscrow e = _funded(100_00, 200_00);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.expectRevert(ClausewrightEscrow.WindowOpen.selector);
        e.claimDeemedAcceptance(0);
        vm.warp(block.timestamp + WINDOW + 1);
        e.claimDeemedAcceptance(0); // anyone can trigger
        assertEq(e.credits(payee), 100_00);
    }

    function test_revert_disputeAfterWindow() public {
        ClausewrightEscrow e = _funded(1, 1);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.warp(block.timestamp + WINDOW + 1);
        vm.prank(payer);
        vm.expectRevert(ClausewrightEscrow.WindowClosed.selector);
        e.dispute(0);
    }

    function test_disputeResolvedByArbiterSplit() public {
        ClausewrightEscrow e = _funded(100_01, 1);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.prank(payer);
        e.dispute(0);
        vm.prank(payee);
        vm.expectRevert(ClausewrightEscrow.NotArbiter.selector);
        e.resolve(0, 10_000);
        vm.prank(arbiter);
        e.resolve(0, 5_000);
        assertEq(e.credits(payee), 50_00); // floor
        assertEq(e.credits(payer), 50_01); // dust to payer
    }

    function test_revert_resolveBadBps() public {
        ClausewrightEscrow e = _funded(1, 1);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.prank(payer);
        e.dispute(0);
        vm.prank(arbiter);
        vm.expectRevert(ClausewrightEscrow.BadBps.selector);
        e.resolve(0, 10_001);
    }

    function test_mutualSettlementOnlyOnMatchingSplit() public {
        ClausewrightEscrow e = _funded(1000, 1);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.prank(payer);
        e.dispute(0);
        vm.prank(payer);
        e.proposeSettlement(0, 6_000);
        vm.prank(payee);
        e.proposeSettlement(0, 7_000);
        assertEq(uint8(e.milestone(0).state), uint8(ClausewrightEscrow.State.Disputed));
        vm.prank(payer);
        e.proposeSettlement(0, 7_000);
        assertEq(e.credits(payee), 700);
        assertEq(e.credits(payer), 300);
    }

    function test_reclaimUndeliveredAfterDueDatePlusGrace() public {
        ClausewrightEscrow e = _funded(100, 200);
        vm.prank(payer);
        vm.expectRevert(ClausewrightEscrow.WindowOpen.selector);
        e.reclaimUndelivered(0);
        vm.warp(block.timestamp + 30 days + WINDOW + 1);
        vm.prank(payer);
        e.reclaimUndelivered(0);
        assertEq(e.credits(payer), 100);
    }

    function test_waiveReturnsToPayer() public {
        ClausewrightEscrow e = _funded(100, 200);
        vm.prank(payee);
        e.waive(1);
        assertEq(e.credits(payer), 200);
    }

    function test_mutualCancelRefundsOpenAmounts() public {
        ClausewrightEscrow e = _funded(100, 200);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.prank(payer);
        e.accept(0);
        vm.prank(payer);
        e.proposeCancel();
        assertFalse(e.cancelled());
        vm.prank(payee);
        e.proposeCancel();
        assertTrue(e.cancelled());
        assertEq(e.credits(payer), 200);
        assertEq(e.credits(payee), 100);
        vm.prank(payee);
        vm.expectRevert(ClausewrightEscrow.IsCancelled.selector);
        e.submitDelivery(1);
    }

    function test_revokedCancelDoesNotCount() public {
        ClausewrightEscrow e = _funded(100, 200);
        vm.prank(payer);
        e.proposeCancel();
        vm.prank(payer);
        e.revokeCancel();
        vm.prank(payee);
        e.proposeCancel();
        assertFalse(e.cancelled());
    }

    function test_arbiterReplacementNeedsBothAndNeutral() public {
        ClausewrightEscrow e = _funded(1, 1);
        address newArb = address(0xC0FFEE);
        vm.prank(payer);
        vm.expectRevert(ClausewrightEscrow.PartiesNotDistinct.selector);
        e.proposeArbiter(payee);
        vm.prank(payer);
        e.proposeArbiter(newArb);
        assertEq(e.arbiter(), arbiter);
        vm.prank(payee);
        e.proposeArbiter(newArb);
        assertEq(e.arbiter(), newArb);
    }

    // ----------------------------------------------------------- access control

    function test_revert_strangersCannotAct() public {
        ClausewrightEscrow e = _funded(1, 1);
        address s = address(0xBAD);
        vm.startPrank(s);
        vm.expectRevert(ClausewrightEscrow.NotPayee.selector);
        e.submitDelivery(0);
        vm.expectRevert(ClausewrightEscrow.NotPayer.selector);
        e.accept(0);
        vm.expectRevert(ClausewrightEscrow.NotPayer.selector);
        e.dispute(0);
        vm.expectRevert(ClausewrightEscrow.NotParty.selector);
        e.proposeCancel();
        vm.expectRevert(ClausewrightEscrow.NothingToWithdraw.selector);
        e.withdraw();
        vm.stopPrank();
    }

    function test_revert_doubleAcceptAndBadIndex() public {
        ClausewrightEscrow e = _funded(1, 1);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.startPrank(payer);
        e.accept(0);
        vm.expectRevert(ClausewrightEscrow.BadState.selector);
        e.accept(0);
        vm.expectRevert(ClausewrightEscrow.BadIndex.selector);
        e.accept(9);
        vm.stopPrank();
    }

    function test_revert_actionsBeforeFunding() public {
        ClausewrightEscrow e = _deploy(1, 1);
        vm.prank(payee);
        vm.expectRevert(ClausewrightEscrow.NotFunded.selector);
        e.submitDelivery(0);
    }

    function test_reentrancyBlocked() public {
        ReentrantToken rt = new ReentrantToken();
        rt.mint(payer, 1000);
        ClausewrightEscrow e = new ClausewrightEscrow(
            IERC20(address(rt)), payer, payee, arbiter, docHash, termsHash, WINDOW,
            uint64(block.timestamp + 1 days), true, _ms(500, 500)
        );
        vm.prank(payee);
        e.acknowledge(docHash);
        vm.startPrank(payer);
        rt.approve(address(e), 1000);
        e.fund(docHash);
        vm.stopPrank();
        vm.prank(payee);
        e.submitDelivery(0);
        vm.prank(payer);
        e.accept(0);
        rt.arm(e);
        vm.prank(payee);
        vm.expectRevert(); // ReentrancyGuardReentrantCall bubbles up
        e.withdraw();
        assertEq(rt.balanceOf(address(e)), 1000);
    }

    // ------------------------------------------------------------------- fuzz

    function testFuzz_splitConservesValue(uint128 amount, uint16 bps) public {
        amount = uint128(bound(amount, 1, 1e9 - 1));
        bps = uint16(bound(bps, 0, 10_000));
        ClausewrightEscrow e = _funded(amount, 1);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.prank(payer);
        e.dispute(0);
        vm.prank(arbiter);
        e.resolve(0, bps);
        assertEq(e.credits(payee) + e.credits(payer), amount);
        assertEq(token.balanceOf(address(e)), e.totalCredits() + e.openAmount());
    }

    function testFuzz_acceptanceWindowBoundary(uint64 dt) public {
        dt = uint64(bound(dt, 0, 60 days));
        ClausewrightEscrow e = _funded(10, 10);
        vm.prank(payee);
        e.submitDelivery(0);
        vm.warp(block.timestamp + dt);
        if (dt <= WINDOW) {
            vm.prank(payer);
            e.dispute(0);
            assertEq(uint8(e.milestone(0).state), uint8(ClausewrightEscrow.State.Disputed));
        } else {
            e.claimDeemedAcceptance(0);
            assertEq(e.credits(payee), 10);
        }
    }
}
