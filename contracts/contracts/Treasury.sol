// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Treasury
 * @dev Holds HRN and releases funds to TaskManager under simple rules.
 */
contract Treasury is Ownable, ReentrancyGuard {
    /// @dev Thrown when an address parameter is the zero address.
    error ZeroAddress();

    /// @dev Thrown when an amount parameter is zero.
    error ZeroAmount();

    /// @dev Thrown when caller is not the TaskManager.
    error NotTaskManager();

    /// @dev Thrown when requested amount exceeds the max per-task cap.
    error AmountExceedsCap();

    /// @dev Thrown when treasury balance is insufficient.
    error InsufficientBalance();

    /// @dev HRN token held by the treasury.
    IERC20 public token;

    /// @dev TaskManager authorized to pull funds.
    address public taskManager;

    /// @dev Optional max per-task reward cap (0 means no cap).
    uint256 public maxTaskReward;

    /// @dev Emitted when the TaskManager address is updated.
    event TaskManagerUpdated(address indexed oldTaskManager, address indexed newTaskManager);

    /// @dev Emitted when the max per-task reward cap is updated.
    event MaxTaskRewardUpdated(uint256 oldCap, uint256 newCap);

    /// @dev Emitted when TaskManager is funded.
    event TaskFunded(address indexed taskManager, uint256 amount);

    /// @dev Emitted when treasury funds are withdrawn.
    event Withdrawn(address indexed to, uint256 amount);

    /**
     * @dev Deploys the Treasury.
     */
    constructor() Ownable(msg.sender) {}

    /**
    * @dev Sets the HRN token address. Can only be set once.
    * @param token_ Address of the HRN token contract.
    */
    function setToken(address token_) external onlyOwner {
        if (token_ == address(0)) revert ZeroAddress();
        if (address(token) != address(0)) revert("Token address is immutable");
        token = IERC20(token_);
    }

    /**
     * @dev Sets the TaskManager address allowed to request funds.
     * @param newTaskManager TaskManager contract address.
     */
    function setTaskManager(address newTaskManager) external onlyOwner {
        if (newTaskManager == address(0)) revert ZeroAddress();
        address old = taskManager;
        taskManager = newTaskManager;
        emit TaskManagerUpdated(old, newTaskManager);
    }

    /**
     * @dev Sets the max per-task reward cap (0 means no cap).
     * @param newCap New cap amount.
     */
    function setMaxTaskReward(uint256 newCap) external onlyOwner {
        uint256 oldCap = maxTaskReward;
        maxTaskReward = newCap;
        emit MaxTaskRewardUpdated(oldCap, newCap);
    }

    /**
     * @dev Funds TaskManager for a task reward. Only callable by TaskManager.
     * @param amount Amount of HRN to transfer to TaskManager.
     */
    function fundTask(uint256 amount) external nonReentrant {
        if (msg.sender != taskManager) revert NotTaskManager();
        if (amount == 0) revert ZeroAmount();
        if (maxTaskReward != 0 && amount > maxTaskReward) revert AmountExceedsCap();

        uint256 balance = token.balanceOf(address(this));
        if (amount > balance) revert InsufficientBalance();

        bool success = token.transfer(taskManager, amount);
        require(success, "Treasury: transfer failed");

        emit TaskFunded(taskManager, amount);
    }

    /**
     * @dev Withdraws HRN from treasury. Only callable by owner.
     * @param to Recipient address.
     * @param amount Amount of HRN to withdraw.
     */
    function withdraw(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 balance = token.balanceOf(address(this));
        if (amount > balance) revert InsufficientBalance();

        bool success = token.transfer(to, amount);
        require(success, "Treasury: transfer failed");

        emit Withdrawn(to, amount);
    }
}
