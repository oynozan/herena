// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LPToken
 * @dev Simple ERC20 token used as liquidity provider token for SwapPool.
 */
contract LPToken is ERC20, Ownable {
    /**
     * @dev Deploys the LP token with a fixed name and symbol.
     */
    constructor() ERC20("Herena LP Token", "HRN-LP") Ownable(msg.sender) {}

    /**
     * @dev Mints LP tokens. Only callable by the owner (the SwapPool).
     * @param to Recipient address.
     * @param amount Amount of LP tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burns LP tokens from an address. Only callable by the owner (the SwapPool).
     * @param from Address to burn LP tokens from.
     * @param amount Amount of LP tokens to burn.
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

