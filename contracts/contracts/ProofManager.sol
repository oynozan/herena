// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {TaskManager} from "./TaskManager.sol";

/**
 * @title ProofManager
 * @dev Handles proof submissions for tasks and triggers proposal creation in VotingManager.
 */
interface IVotingManagerForProofs {
    function createProposal(uint256 proofId) external returns (uint256 proposalId);
}

contract ProofManager is Ownable, ReentrancyGuard {
    /// @dev Proof metadata.
    struct Proof {
        uint256 id;
        uint256 taskId;
        address submitter;
        string proofURI;
        uint256 timestamp;
        bool resolved;
    }

    /// @dev Emitted when a new proof is submitted.
    event ProofSubmitted(uint256 indexed proofId, uint256 indexed taskId, address indexed submitter, string proofURI);

    /// @dev Thrown when an address parameter is the zero address.
    error ZeroAddress();

    /// @dev Thrown when a proof URI is empty.
    error EmptyProofURI();

    /// @dev Thrown when a task is not active.
    error TaskNotActive();

    /// @dev Thrown when the completion limit of a task has been reached.
    error CompletionLimitReached();

    /// @dev Thrown when a user tries to submit more than one proof for the same task.
    error AlreadySubmittedForTask();

    /// @dev Thrown when VotingManager is not configured.
    error VotingManagerNotSet();

    /// @dev TaskManager contract used to validate tasks.
    TaskManager public immutable taskManager;

    /// @dev VotingManager contract that receives proposals for each submitted proof.
    address public votingManager;

    /// @dev Next proof id to use.
    uint256 public nextProofId;

    /// @dev Mapping of proof id to Proof.
    mapping(uint256 => Proof) private _proofs;

    /// @dev Tracks whether a submitter has already submitted a proof for a given task.
    mapping(uint256 => mapping(address => bool)) public hasSubmittedForTask;

    /**
     * @dev Deploys the ProofManager.
     * @param taskManager_ Address of the TaskManager contract.
     */
    constructor(address taskManager_) Ownable(msg.sender) {
        if (taskManager_ == address(0)) revert ZeroAddress();
        taskManager = TaskManager(taskManager_);
    }

    /**
     * @dev Submits a proof for a given task and creates a proposal in VotingManager.
     * @param taskId Id of the task.
     * @param proofURI Off-chain URI of the proof (e.g. IPFS/Arweave).
     */
    function submitProof(uint256 taskId, string calldata proofURI) external nonReentrant {
        if (bytes(proofURI).length == 0) revert EmptyProofURI();
        if (votingManager == address(0)) revert VotingManagerNotSet();

        // Load task and validate it's active and not at completion limit.
        TaskManager.Task memory task = taskManager.getTask(taskId);

        if (!taskManager.isTaskActive(taskId)) revert TaskNotActive();
        if (task.completedCount >= task.maxCompletions) revert CompletionLimitReached();

        if (hasSubmittedForTask[taskId][msg.sender]) {
            revert AlreadySubmittedForTask();
        }

        uint256 proofId = nextProofId;
        nextProofId = proofId + 1;

        Proof storage p = _proofs[proofId];
        p.id = proofId;
        p.taskId = taskId;
        p.submitter = msg.sender;
        p.proofURI = proofURI;
        p.timestamp = block.timestamp;
        p.resolved = false;

        hasSubmittedForTask[taskId][msg.sender] = true;

        emit ProofSubmitted(proofId, taskId, msg.sender, proofURI);

        IVotingManagerForProofs(votingManager).createProposal(proofId);
    }

    /**
     * @dev Returns stored proof details.
     * @param proofId Id of the proof.
     * @return proof The stored Proof struct.
     */
    function getProof(uint256 proofId) external view returns (Proof memory proof) {
        proof = _proofs[proofId];
    }

    /**
     * @dev Sets the VotingManager contract.
     * @param newVotingManager Address of the VotingManager contract.
     */
    function setVotingManager(address newVotingManager) external onlyOwner {
        if (newVotingManager == address(0)) revert ZeroAddress();
        votingManager = newVotingManager;
    }
}

