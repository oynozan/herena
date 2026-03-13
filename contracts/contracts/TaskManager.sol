// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Treasury} from "./Treasury.sol";

/**
 * @title TaskManager
 * @dev Handles task creation and locking of HRN rewards for the RN platform.
 */
contract TaskManager is Ownable, ReentrancyGuard, Pausable {
    /// @dev Thrown when an address parameter is the zero address.
    error ZeroAddress();

    /// @dev Thrown when an amount parameter is zero.
    error ZeroAmount();

    /// @dev Thrown when a deadline is in the past.
    error DeadlineInPast();

    /// @dev Thrown when a task id is invalid or not yet created.
    error InvalidTask();

    /// @dev Thrown when caller is not the authorized ProofManager.
    error NotProofManager();

    /// @dev Thrown when trying to operate on an inactive task.
    error TaskNotActive();

    /// @dev Thrown when there is no remaining reward to refund.
    error NothingToRefund();

    /// @dev ERC20 reward token (Herena / HRN).
    IERC20 public immutable token;

    /// @dev Treasury contract holding funds for tasks.
    Treasury public treasury;

    /// @dev Address of the ProofManager contract allowed to increment completions.
    address public proofManager;

    /// @dev Address of the VotingManager contract that pulls rewards from this contract.
    address public votingManager;

    /// @dev Incremental id for newly created tasks.
    uint256 public nextTaskId;

    /**
     * @dev Task definition.
     */
    struct Task {
        uint256 id;
        string description;
        uint256 rewardPerCompletion;
        uint256 maxCompletions;
        uint256 completedCount;
        uint256 deadline;
        bool active;
        string metadataURI;
    }

    /// @dev Mapping from task id to Task.
    mapping(uint256 => Task) private _tasks;

    /// @dev Emitted when a new task is created.
    event TaskCreated(uint256 indexed id, string description, uint256 rewardPerCompletion, uint256 maxCompletions, uint256 deadline, string metadataURI);

    /// @dev Emitted when a task completion is incremented.
    event TaskCompletionIncremented(uint256 indexed id, uint256 newCompletedCount);

    /// @dev Emitted when a task is cancelled and remaining rewards are refunded.
    event TaskCancelled(uint256 indexed id, uint256 refundedAmount);

    /// @dev Emitted when the ProofManager address is updated.
    event ProofManagerUpdated(address indexed oldProofManager, address indexed newProofManager);

    /// @dev Emitted when the treasury address is updated.
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @dev Emitted when the VotingManager address is updated.
    event VotingManagerUpdated(address indexed oldVotingManager, address indexed newVotingManager);

    /**
     * @dev Deploys the TaskManager.
     * @param token_ Address of the HRN token contract.
     * @param treasury_ Address of the Treasury contract that will fund tasks.
     */
    constructor(address token_, address treasury_) Ownable(msg.sender) {
        if (token_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        token = IERC20(token_);
        treasury = Treasury(treasury_);
    }

    /**
     * @dev Creates a new task and locks its total reward from treasury.
     * @param description Human-readable description of the task.
     * @param rewardPerCompletion Reward paid per successful completion.
     * @param maxCompletions Maximum number of completions for this task.
     * @param deadline Unix timestamp after which the task is no longer active.
     * @param metadataURI Off-chain metadata URI.
     */
    function createTask(
        string calldata description,
        uint256 rewardPerCompletion,
        uint256 maxCompletions,
        uint256 deadline,
        string calldata metadataURI
    ) external onlyOwner whenNotPaused nonReentrant {
        if (rewardPerCompletion == 0 || maxCompletions == 0) revert ZeroAmount();
        if (deadline <= block.timestamp) revert DeadlineInPast();

        uint256 id = nextTaskId;
        nextTaskId = id + 1;

        uint256 totalReward = rewardPerCompletion * maxCompletions;

        treasury.fundTask(totalReward);

        Task storage task = _tasks[id];
        task.id = id;
        task.description = description;
        task.rewardPerCompletion = rewardPerCompletion;
        task.maxCompletions = maxCompletions;
        task.completedCount = 0;
        task.deadline = deadline;
        task.active = true;
        task.metadataURI = metadataURI;

        emit TaskCreated(id, description, rewardPerCompletion, maxCompletions, deadline, metadataURI);
    }

    /**
     * @dev Returns task details.
     * @param taskId Id of the task.
     * @return task The Task struct.
     */
    function getTask(uint256 taskId) external view returns (Task memory task) {
        task = _tasks[taskId];
        if (task.id != taskId) revert InvalidTask();
    }

    /**
     * @dev Returns whether a task is currently active.
     * @param taskId Id of the task.
     * @return isActive True if task is active, deadline not passed and completion limit not reached.
     */
    function isTaskActive(uint256 taskId) public view returns (bool isActive) {
        Task storage task = _tasks[taskId];
        if (task.id != taskId) return false;
        if (!task.active) return false;
        if (block.timestamp > task.deadline) return false;
        if (task.completedCount >= task.maxCompletions) return false;
        isActive = true;
    }

    /**
     * @dev Increments task completion count. Only callable by ProofManager.
     * @param taskId Id of the task.
     */
    function incrementCompletion(uint256 taskId) external whenNotPaused nonReentrant {
        if (msg.sender != proofManager && msg.sender != votingManager) revert NotProofManager();

        Task storage task = _tasks[taskId];
        if (task.id != taskId) revert InvalidTask();
        if (!isTaskActive(taskId)) revert TaskNotActive();

        task.completedCount += 1;

        if (task.completedCount >= task.maxCompletions || block.timestamp > task.deadline) {
            task.active = false;
        }

        emit TaskCompletionIncremented(taskId, task.completedCount);
    }

    /**
     * @dev Cancels a task and refunds remaining locked rewards back to treasury.
     * @param taskId Id of the task.
     */
    function cancelTask(uint256 taskId) external onlyOwner whenNotPaused nonReentrant {
        Task storage task = _tasks[taskId];
        if (task.id != taskId) revert InvalidTask();
        if (!task.active) revert TaskNotActive();

        uint256 remainingCompletions = task.maxCompletions - task.completedCount;
        uint256 refundAmount = remainingCompletions * task.rewardPerCompletion;
        if (refundAmount == 0) revert NothingToRefund();

        task.active = false;
        task.deadline = block.timestamp;

        bool success = token.transfer(address(treasury), refundAmount);
        require(success, "TaskManager: refund failed");

        emit TaskCancelled(taskId, refundAmount);
    }

    /**
     * @dev Updates the ProofManager contract address.
     * @param newProofManager New ProofManager address.
     */
    function setProofManager(address newProofManager) external onlyOwner {
        if (newProofManager == address(0)) revert ZeroAddress();
        address old = proofManager;
        proofManager = newProofManager;
        emit ProofManagerUpdated(old, newProofManager);
    }

    /**
     * @dev Updates the treasury address.
     * @param newTreasury New treasury address.
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address old = address(treasury);
        treasury = Treasury(newTreasury);
        emit TreasuryUpdated(old, newTreasury);
    }

    /**
     * @dev Updates the VotingManager contract and optionally approves it to pull rewards.
     * @param newVotingManager New VotingManager address.
     * @param allowance Amount of HRN tokens TaskManager allows VotingManager to pull (use type(uint256).max for max).
     */
    function setVotingManager(address newVotingManager, uint256 allowance) external onlyOwner {
        if (newVotingManager == address(0)) revert ZeroAddress();
        address old = votingManager;
        votingManager = newVotingManager;
        emit VotingManagerUpdated(old, newVotingManager);

        if (allowance > 0) {
            token.approve(newVotingManager, allowance);
        }
    }

    /**
     * @dev Pauses mutating functions. Only callable by owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses mutating functions. Only callable by owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
