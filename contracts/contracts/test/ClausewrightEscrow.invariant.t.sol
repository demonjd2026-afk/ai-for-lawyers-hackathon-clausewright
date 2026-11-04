// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ClausewrightEscrow} from "../ClausewrightEscrow.sol";
import {DemoINR} from "../DemoINR.sol";

/// @dev Drives random sequences of party actions; failing calls are swallowed.
contract Handler is Test {
    ClausewrightEscrow public e;
    DemoINR public token;
    address public payer;
    address public payee;
    address public arbiter;
    uint256 public withdrawn;

    constructor(ClausewrightEscrow e_, DemoINR t, address p, address q, address a) {
        e = e_;
        token = t;
        payer = p;
        payee = q;
        arbiter = a;
    }

    function deliver(uint256 i) external {
        vm.prank(payee);
        try e.submitDelivery(i % 3) {} catch {}
    }

    function accept(uint256 i) external {
        vm.prank(payer);
        try e.accept(i % 3) {} catch {}
    }

    function dispute(uint256 i) external {
        vm.prank(payer);
        try e.dispute(i % 3) {} catch {}
    }

    function resolve(uint256 i, uint16 bps) external {
        vm.prank(arbiter);
        try e.resolve(i % 3, uint16(bound(bps, 0, 10_000))) {} catch {}
    }

    function settle(uint256 i, uint16 bps, bool byPayer) external {
        vm.prank(byPayer ? payer : payee);
        try e.proposeSettlement(i % 3, uint16(bound(bps, 0, 10_000))) {} catch {}
    }

    function deem(uint256 i) external {
        try e.claimDeemedAcceptance(i % 3) {} catch {}
    }

    function reclaim(uint256 i) external {
        vm.prank(payer);
        try e.reclaimUndelivered(i % 3) {} catch {}
    }

    function waive(uint256 i) external {
        vm.prank(payee);
        try e.waive(i % 3) {} catch {}
    }

    function cancel(bool byPayer) external {
        vm.prank(byPayer ? payer : payee);
        try e.proposeCancel() {} catch {}
    }

    function withdraw(bool byPayer) external {
        address who = byPayer ? payer : payee;
        uint256 c = e.credits(who);
        vm.prank(who);
        try e.withdraw() {
            withdrawn += c;
        } catch {}
    }

    function warp(uint32 dt) external {
        vm.warp(block.timestamp + bound(dt, 0, 20 days));
    }
}

contract ClausewrightEscrowInvariantTest is Test {
    ClausewrightEscrow e;
    DemoINR token;
    Handler h;
    address payer = address(0xA11CE);
    address payee = address(0xB0B);
    address arbiter = address(0xA4B);
    bytes32 docHash = keccak256("doc");
    uint256 constant TOTAL = 600;

    function setUp() public {
        vm.warp(1_800_000_000);
        token = new DemoINR();
        ClausewrightEscrow.MilestoneInput[] memory m = new ClausewrightEscrow.MilestoneInput[](3);
        m[0] = ClausewrightEscrow.MilestoneInput(100, uint64(block.timestamp + 10 days));
        m[1] = ClausewrightEscrow.MilestoneInput(200, uint64(block.timestamp + 20 days));
        m[2] = ClausewrightEscrow.MilestoneInput(300, uint64(block.timestamp + 30 days));
        e = new ClausewrightEscrow(
            IERC20(address(token)), payer, payee, arbiter, docHash, keccak256("terms"), 15 days,
            uint64(block.timestamp + 1 days), true, m
        );
        vm.prank(payer);
        token.faucet();
        vm.prank(payee);
        e.acknowledge(docHash);
        vm.startPrank(payer);
        token.approve(address(e), TOTAL);
        e.fund(docHash);
        vm.stopPrank();
        h = new Handler(e, token, payer, payee, arbiter);
        targetContract(address(h));
    }

    /// Escrow is always exactly solvent: balance == outstanding credits + open milestones.
    function invariant_solvent() public view {
        assertEq(token.balanceOf(address(e)), e.totalCredits() + e.openAmount());
    }

    /// No value is created or destroyed: everything is held, credited, or withdrawn.
    function invariant_conservation() public view {
        assertEq(e.openAmount() + e.totalCredits() + h.withdrawn(), TOTAL);
    }

    /// Only the two parties can ever receive money.
    function invariant_onlyPartiesPaid() public view {
        assertEq(token.balanceOf(arbiter), 0);
        assertEq(e.credits(arbiter), 0);
    }
}
