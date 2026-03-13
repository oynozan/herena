// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {LPToken} from "./LPToken.sol";

/**
 * @title SwapPool
 * @dev Constant-product AMM for swapping Herena (HRN) tokens against native HBAR with LP tokens.
 */
contract SwapPool is ReentrancyGuard {
    /// @dev Emitted when liquidity is added to the pool.
    event LiquidityAdded(address indexed provider, uint256 tokenAmount, uint256 hbarAmount, uint256 lpMinted);

    /// @dev Emitted when liquidity is removed from the pool.
    event LiquidityRemoved(address indexed provider, uint256 tokenAmount, uint256 hbarAmount, uint256 lpBurned);

    /// @dev Emitted when a swap from HBAR to HRN is executed.
    event SwappedHBARForToken(address indexed user, uint256 hbarIn, uint256 tokenOut);

    /// @dev Emitted when a swap from HRN to HBAR is executed.
    event SwappedTokenForHBAR(address indexed user, uint256 tokenIn, uint256 hbarOut);

    /// @dev Thrown when an amount parameter is zero.
    error ZeroAmount();

    /// @dev Thrown when liquidity is insufficient for the requested operation.
    error InsufficientLiquidity();

    /// @dev Thrown when the minimum amount out condition is not met.
    error SlippageTooHigh();

    /// @dev ERC20 token being traded against HBAR (Herena / HRN).
    IERC20 public immutable token;

    /// @dev LP token representing shares in the pool.
    LPToken public immutable lpToken;

    /// @dev Reserve of HRN tokens in the pool.
    uint256 public reserveToken;

    /// @dev Reserve of HBAR in the pool.
    uint256 public reserveHBAR;

    /**
     * @dev Deploys the SwapPool.
     * @param token_ Address of the HRN token contract.
     */
    constructor(address token_) {
        if (token_ == address(0)) revert ZeroAmount();
        token = IERC20(token_);
        lpToken = new LPToken();
    }

    /**
     * @dev Returns the current HBAR balance of the pool.
     * @return balance Current HBAR balance.
     */
    function getHBARBalance() public view returns (uint256 balance) {
        balance = address(this).balance;
    }

    /**
     * @dev Adds liquidity to the pool and mints LP tokens.
     * @param tokenAmount Amount of HRN tokens to add.
     */
    function addLiquidity(uint256 tokenAmount) external payable nonReentrant {
        if (tokenAmount == 0 || msg.value == 0) revert ZeroAmount();

        uint256 _reserveToken = reserveToken;
        uint256 _reserveHBAR = reserveHBAR;

        uint256 lpToMint;
        if (_reserveToken == 0 && _reserveHBAR == 0) {
            // First liquidity provider - initialize pool, mint sqrt(token * hbar) LP tokens
            uint256 liquidity = Math.sqrt(tokenAmount * msg.value);
            if (liquidity == 0) revert ZeroAmount();
            lpToMint = liquidity;
        } else {
            // Enforce ratio to avoid price shift
            if (_reserveToken * msg.value != _reserveHBAR * tokenAmount) {
                revert InsufficientLiquidity();
            }
            uint256 lpTotalSupply = lpToken.totalSupply();
            lpToMint = Math.min(
                (tokenAmount * lpTotalSupply) / _reserveToken,
                (msg.value * lpTotalSupply) / _reserveHBAR
            );
            if (lpToMint == 0) revert ZeroAmount();
        }

        // Pull tokens from provider
        bool success = token.transferFrom(msg.sender, address(this), tokenAmount);
        require(success, "SwapPool: token transfer failed");

        // Update reserves to match balances
        reserveToken = _reserveToken + tokenAmount;
        reserveHBAR = _reserveHBAR + msg.value;

        lpToken.mint(msg.sender, lpToMint);

        emit LiquidityAdded(msg.sender, tokenAmount, msg.value, lpToMint);
    }

    /**
     * @dev Removes liquidity by burning LP tokens and returning proportional HRN/HBAR.
     * @param lpAmount Amount of LP tokens to burn.
     */
    function removeLiquidity(uint256 lpAmount) external nonReentrant {
        if (lpAmount == 0) revert ZeroAmount();

        uint256 lpTotalSupply = lpToken.totalSupply();
        if (lpAmount > lpTotalSupply) revert InsufficientLiquidity();

        uint256 tokenAmount = (reserveToken * lpAmount) / lpTotalSupply;
        uint256 hbarAmount = (reserveHBAR * lpAmount) / lpTotalSupply;
        if (tokenAmount == 0 || hbarAmount == 0) revert InsufficientLiquidity();

        // Burn LP from user
        lpToken.burn(msg.sender, lpAmount);

        reserveToken -= tokenAmount;
        reserveHBAR -= hbarAmount;

        bool success = token.transfer(msg.sender, tokenAmount);
        require(success, "SwapPool: token transfer failed");

        (bool sent, ) = msg.sender.call{value: hbarAmount}("");
        require(sent, "SwapPool: HBAR transfer failed");

        emit LiquidityRemoved(msg.sender, tokenAmount, hbarAmount, lpAmount);
    }

    /**
     * @dev Swaps HBAR for HRN tokens using constant product formula with 0.3% fee.
     * @param minAmountOut Minimum acceptable amount of HRN tokens.
     */
    function swapHBARForToken(uint256 minAmountOut) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        uint256 _reserveToken = reserveToken;
        uint256 _reserveHBAR = reserveHBAR;
        if (_reserveToken == 0 || _reserveHBAR == 0) revert InsufficientLiquidity();

        uint256 amountInWithFee = (msg.value * 997) / 1000;
        uint256 numerator = amountInWithFee * _reserveToken;
        uint256 denominator = _reserveHBAR + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        if (amountOut == 0 || amountOut > _reserveToken) revert InsufficientLiquidity();
        if (amountOut < minAmountOut) revert SlippageTooHigh();

        reserveHBAR = _reserveHBAR + msg.value;
        reserveToken = _reserveToken - amountOut;

        bool success = token.transfer(msg.sender, amountOut);
        require(success, "SwapPool: token transfer failed");

        emit SwappedHBARForToken(msg.sender, msg.value, amountOut);
    }

    /**
     * @dev Swaps HRN tokens for HBAR using constant product formula with 0.3% fee.
     * @param tokenAmount Amount of HRN tokens to swap in.
     * @param minAmountOut Minimum acceptable amount of HBAR.
     */
    function swapTokenForHBAR(uint256 tokenAmount, uint256 minAmountOut) external nonReentrant {
        if (tokenAmount == 0) revert ZeroAmount();

        uint256 _reserveToken = reserveToken;
        uint256 _reserveHBAR = reserveHBAR;
        if (_reserveToken == 0 || _reserveHBAR == 0) revert InsufficientLiquidity();

        bool successIn = token.transferFrom(msg.sender, address(this), tokenAmount);
        require(successIn, "SwapPool: token transfer failed");

        uint256 amountInWithFee = (tokenAmount * 997) / 1000;
        uint256 numerator = amountInWithFee * _reserveHBAR;
        uint256 denominator = _reserveToken + amountInWithFee;
        uint256 amountOut = numerator / denominator;

        if (amountOut == 0 || amountOut > _reserveHBAR) revert InsufficientLiquidity();
        if (amountOut < minAmountOut) revert SlippageTooHigh();

        reserveToken = _reserveToken + tokenAmount;
        reserveHBAR = _reserveHBAR - amountOut;

        (bool sent, ) = msg.sender.call{value: amountOut}("");
        require(sent, "SwapPool: HBAR transfer failed");

        emit SwappedTokenForHBAR(msg.sender, tokenAmount, amountOut);
    }

    /// @dev Allow receiving HBAR.
    receive() external payable {}
}

