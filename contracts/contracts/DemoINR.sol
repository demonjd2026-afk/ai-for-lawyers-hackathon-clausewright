// SPDX-License-Identifier: MIT
pragma solidity 0.8.38;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title DemoINR
/// @notice TESTNET-ONLY demo token with 2 decimals so 1 unit = 1 paisa. It has no value and
///         is not a representation of the Indian rupee or of RBI's e-rupee. Anyone may mint a
///         capped amount from the faucet so judges can try the full escrow flow.
contract DemoINR is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 10_000_000 * 100; // 1 crore demo rupees, in paise
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastFaucet;

    error FaucetCooldown();

    constructor() ERC20("Clausewright Demo INR (testnet, no value)", "dINR") {}

    function decimals() public pure override returns (uint8) {
        return 2;
    }

    function faucet() external {
        if (lastFaucet[msg.sender] != 0 && block.timestamp < lastFaucet[msg.sender] + FAUCET_COOLDOWN) {
            revert FaucetCooldown();
        }
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
