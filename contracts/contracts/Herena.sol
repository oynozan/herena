// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Herena Token
 * @dev ERC20 token for HRN platform. Owner-controlled minting.
 */
contract Herena is ERC20, ERC20Burnable, Ownable {
    /// @dev Thrown when an address parameter is the zero address.
    error ZeroAddress();

    /// @dev Thrown when an amount parameter is zero.
    error ZeroAmount();

    /// @dev Emitted when the owner mints Herena.
    event Minted(address indexed to, uint256 amount);

    /// @dev Emitted when initial treasury mint happens during deployment.
    event TreasuryMinted(address indexed treasury, uint256 amount);

    /**
     * @dev Deploys Herena token with fixed name/symbol and mints an initial amount to treasury.
     * @param treasury The address receiving the initial minted supply.
     * @param initialTreasuryMint The amount minted to the treasury on deployment.
     */
    constructor(
        address treasury,
        uint256 initialTreasuryMint
    ) ERC20("Herena", "HRN") Ownable(msg.sender) {
        if (treasury == address(0)) revert ZeroAddress();
        if (initialTreasuryMint == 0) revert ZeroAmount();

        _mint(treasury, initialTreasuryMint);
        emit TreasuryMinted(treasury, initialTreasuryMint);
    }
}
