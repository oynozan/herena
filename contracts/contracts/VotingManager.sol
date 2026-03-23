// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {StakingManager} from "./StakingManager.sol";
import {TaskManager} from "./TaskManager.sol";
import {ProofManager} from "./ProofManager.sol";

/**
 * @title VotingManager
 * @dev Quadratic voting and reward distribution for proof-based tasks.
 */
contract VotingManager is Ownable, ReentrancyGuard {
    struct Proposal {
        uint256 id;
        uint256 proofId;
        uint256 approveVotes;
        uint256 rejectVotes;
        uint256 voteStart;
        uint256 voteEnd;
        bool resolved;
        bool approved;
    }

    /// @dev Emitted when a new proposal is created for a proof.
    event ProposalCreated(uint256 indexed id, uint256 indexed proofId, uint256 voteStart, uint256 voteEnd);

    /// @dev Emitted when a user casts a vote.
    event Voted(uint256 indexed proposalId, address indexed voter, bool approve, uint256 votingPower);

    /// @dev Emitted when a proposal is resolved.
    event ProposalResolved(uint256 indexed id, bool approved);

    /// @dev Emitted when voting duration is changed by the owner.
    event VotingDurationUpdated(uint256 newDuration);

    /// @dev Emitted when a proposal is deleted by the owner.
    event ProposalDeleted(uint256 indexed id);

    /// @dev Thrown when an address parameter is the zero address.
    error ZeroAddress();

    /// @dev Thrown when a proposal id is invalid.
    error InvalidProposal();

    /// @dev Thrown when a proposal is already resolved.
    error ProposalAlreadyResolved();

    /// @dev Thrown when voting is not active.
    error VotingNotActive();

    /// @dev Thrown when voting period has not ended yet.
    error VotingNotEnded();

    /// @dev Thrown when a user attempts to vote twice on the same proposal.
    error AlreadyVoted();

    /// @dev Thrown when caller is not the ProofManager.
    error NotProofManager();

    /// @dev Thrown when user does not meet minimum staking requirement.
    error BelowMinimumStake();

    /// @dev Thrown when computed approve power is zero.
    error ZeroVotingPower();

    IERC20 public immutable token;
    StakingManager public immutable stakingManager;
    TaskManager public immutable taskManager;
    ProofManager public immutable proofManager;

    /// @dev Voting duration in seconds.
    uint256 public votingDuration;

    /// @dev Incremental id for proposals.
    uint256 public nextProposalId;

    /// @dev Mapping from proposal id to Proposal.
    mapping(uint256 => Proposal) private _proposals;

    /// @dev Tracks whether a user has voted on a proposal.
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @dev List of voters that approved a given proposal.
    mapping(uint256 => address[]) private _approveVoters;

    /// @dev Voting power contributed by each approve-voter for a proposal.
    mapping(uint256 => mapping(address => uint256)) public approveVotingPower;

    /**
     * @dev Deploys the VotingManager.
     * @param token_ HRN token contract.
     * @param stakingManager_ StakingManager contract.
     * @param taskManager_ TaskManager contract.
     * @param proofManager_ ProofManager contract.
     * @param votingDuration_ Voting duration in seconds (default: 48h).
     */
    constructor(
        address token_,
        address stakingManager_,
        address taskManager_,
        address proofManager_,
        uint256 votingDuration_
    ) Ownable(msg.sender) {
        if (token_ == address(0) || stakingManager_ == address(0) || taskManager_ == address(0) || proofManager_ == address(0)) {
            revert ZeroAddress();
        }

        token = IERC20(token_);
        stakingManager = StakingManager(stakingManager_);
        taskManager = TaskManager(taskManager_);
        proofManager = ProofManager(proofManager_);

        votingDuration = votingDuration_ != 0 ? votingDuration_ : 48 hours;
    }

    /**
     * @dev Returns details of a proposal.
     * @param proposalId Id of the proposal.
     * @return proposal The Proposal struct.
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory proposal) {
        proposal = _proposals[proposalId];
        if (proposal.id != proposalId) revert InvalidProposal();
    }

    /**
     * @dev Creates a new proposal for a proof. Only callable by ProofManager.
     * @param proofId Id of the proof.
     * @return proposalId Id of the created proposal.
     */
    function createProposal(uint256 proofId) external nonReentrant returns (uint256 proposalId) {
        if (msg.sender != address(proofManager)) revert NotProofManager();

        proposalId = nextProposalId;
        nextProposalId = proposalId + 1;

        uint256 start = block.timestamp;
        uint256 end = start + votingDuration;

        Proposal storage p = _proposals[proposalId];
        p.id = proposalId;
        p.proofId = proofId;
        p.voteStart = start;
        p.voteEnd = end;

        emit ProposalCreated(proposalId, proofId, start, end);
    }

    /**
     * @dev Casts a vote on a proposal.
     * @param proposalId Id of the proposal.
     * @param approve True to approve, false to reject.
     */
    function vote(uint256 proposalId, bool approve) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id != proposalId) revert InvalidProposal();
        if (p.resolved) revert ProposalAlreadyResolved();
        if (block.timestamp < p.voteStart || block.timestamp > p.voteEnd) revert VotingNotActive();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 stakedAmount = stakingManager.getStakedAmount(msg.sender);
        if (stakedAmount < stakingManager.minStake()) revert BelowMinimumStake();

        uint256 power = stakingManager.getVotingPower(msg.sender);
        if (power == 0) revert ZeroVotingPower();

        hasVoted[proposalId][msg.sender] = true;

        if (approve) {
            p.approveVotes += power;
            approveVotingPower[proposalId][msg.sender] = power;
            _approveVoters[proposalId].push(msg.sender);
        } else {
            p.rejectVotes += power;
        }

        emit Voted(proposalId, msg.sender, approve, power);
    }

    /**
     * @dev Resolves a proposal after the voting period ends and distributes rewards on approval.
     * @param proposalId Id of the proposal.
     */
    function resolveProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id != proposalId) revert InvalidProposal();
        if (p.resolved) revert ProposalAlreadyResolved();
        if (block.timestamp <= p.voteEnd) revert VotingNotEnded();

        p.resolved = true;

        if (p.approveVotes > p.rejectVotes && p.approveVotes > 0) {
            p.approved = true;

            // Fetch proof and task data.
            ProofManager.Proof memory proof = proofManager.getProof(p.proofId);
            TaskManager.Task memory task = taskManager.getTask(proof.taskId);

            // Update task completion via TaskManager (assumes VotingManager is configured as proofManager for this call).
            taskManager.incrementCompletion(proof.taskId);

            uint256 totalReward = task.rewardPerCompletion;
            if (totalReward > 0) {
                uint256 submitterReward = (totalReward * 80) / 100;
                uint256 votersReward = totalReward - submitterReward;

                // Payout submitter reward from TaskManager-held balance.
                if (submitterReward > 0) {
                    token.transferFrom(address(taskManager), proof.submitter, submitterReward);
                }

                if (votersReward > 0 && p.approveVotes > 0) {
                    address[] storage voters = _approveVoters[proposalId];
                    uint256 totalApprovePower = p.approveVotes;

                    uint256 distributed;
                    uint256 votersLen = voters.length;

                    for (uint256 i = 0; i < votersLen; i++) {
                        address voter = voters[i];
                        uint256 power = approveVotingPower[proposalId][voter];
                        if (power == 0) continue;

                        uint256 reward = (votersReward * power) / totalApprovePower;
                        if (reward > 0) {
                            distributed += reward;
                            token.transferFrom(address(taskManager), voter, reward);
                        }
                    }

                    // Any dust remains locked in TaskManager for the task.
                    if (distributed > votersReward) {
                        // Should not happen, but guard against rounding overflow.
                        revert();
                    }
                }
            }
        }

        emit ProposalResolved(proposalId, p.approved);
    }

    /**
     * @dev Updates the voting duration. Only callable by the owner.
     * @param _newDuration New voting duration in seconds.
     */
    function setVotingDuration(uint256 _newDuration) external onlyOwner {
        require(_newDuration > 0, "Duration must be > 0");
        votingDuration = _newDuration;
        emit VotingDurationUpdated(_newDuration);
    }

    /**
     * @dev Deletes an unresolved proposal. Only callable by the owner.
     * @param proposalId Id of the proposal to delete.
     */
    function deleteProposal(uint256 proposalId) external onlyOwner {
        Proposal storage p = _proposals[proposalId];
        if (p.id != proposalId) revert InvalidProposal();
        if (p.resolved) revert ProposalAlreadyResolved();
        delete _proposals[proposalId];
        emit ProposalDeleted(proposalId);
    }
}

