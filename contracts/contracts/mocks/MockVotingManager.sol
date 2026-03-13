// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title MockVotingManager
 * @dev Minimal mock used in tests to verify ProofManager integration.
 */
contract MockVotingManager {
    event ProposalCreated(uint256 indexed proofId, uint256 indexed proposalId);

    uint256 public nextProposalId;

    function createProposal(uint256 proofId) external returns (uint256 proposalId) {
        proposalId = nextProposalId;
        nextProposalId = proposalId + 1;
        emit ProposalCreated(proofId, proposalId);
    }
}

