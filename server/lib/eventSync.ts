import { EventEmitter } from "events";
import { ethers } from "ethers";
import axios from "axios";

import {
    getTaskManager,
    getProofManager,
    getVotingManager,
    getStakingManager,
    getSwapPool,
} from "./contracts";

import Task from "../models/Task";
import Proof from "../models/Proof";
import Proposal from "../models/Proposal";
import Vote from "../models/Vote";
import UserTask from "../models/UserTask";
import StakeRecord from "../models/StakeRecord";
import SwapRecord from "../models/SwapRecord";

export const blockchainEvents = new EventEmitter();

async function fetchMetadata(uri: string) {
    try {
        const { data } = await axios.get(uri, { timeout: 10000 });
        return data;
    } catch (err) {
        console.error(`Failed to fetch metadata from ${uri}:`, err);
        return null;
    }
}

function setupTaskManagerListeners() {
    const contract = getTaskManager();

    contract.on(
        "TaskCreated",
        async (
            id: bigint,
            description: string,
            rewardPerCompletion: bigint,
            maxCompletions: bigint,
            deadline: bigint,
            metadataURI: string,
        ) => {
            try {
                let title = description;
                let category = "other";
                let proofType = "";
                let fullDescription = description;

                if (metadataURI) {
                    const meta = await fetchMetadata(metadataURI);
                    if (meta) {
                        title = meta.title || title;
                        fullDescription = meta.description || fullDescription;
                        category = meta.category || category;
                        proofType = meta.proofType || proofType;
                    }
                }

                const task = await Task.findOneAndUpdate(
                    { taskId: Number(id) },
                    {
                        taskId: Number(id),
                        title,
                        description: fullDescription,
                        category,
                        reward: Number(ethers.formatEther(rewardPerCompletion)),
                        proofType,
                        status: "active",
                        deadline: new Date(Number(deadline) * 1000),
                        maxParticipants: Number(maxCompletions),
                        completedCount: 0,
                        participants: 0,
                        metadataURI,
                    },
                    { upsert: true, new: true },
                );

                blockchainEvents.emit("task:created", task);
                console.log(`Task #${id} created`);
            } catch (err) {
                console.error("Error handling TaskCreated:", err);
            }
        },
    );

    contract.on("TaskCompletionIncremented", async (id: bigint, newCompletedCount: bigint) => {
        try {
            const task = await Task.findOneAndUpdate(
                { taskId: Number(id) },
                { completedCount: Number(newCompletedCount) },
                { new: true },
            );
            if (task && Number(newCompletedCount) >= task.maxParticipants) {
                task.status = "completed";
                await task.save();
            }

            blockchainEvents.emit("task:updated", task);
            console.log(`Task #${id} completion: ${newCompletedCount}`);
        } catch (err) {
            console.error("Error handling TaskCompletionIncremented:", err);
        }
    });

    contract.on("TaskCancelled", async (id: bigint) => {
        try {
            const task = await Task.findOneAndUpdate(
                { taskId: Number(id) },
                { status: "completed" },
                { new: true },
            );

            blockchainEvents.emit("task:cancelled", task);
            console.log(`Task #${id} cancelled`);
        } catch (err) {
            console.error("Error handling TaskCancelled:", err);
        }
    });
}

function setupProofManagerListeners() {
    const contract = getProofManager();

    contract.on(
        "ProofSubmitted",
        async (proofId: bigint, taskId: bigint, submitter: string, proofURI: string) => {
            try {
                const proof = await Proof.findOneAndUpdate(
                    { proofId: Number(proofId) },
                    {
                        proofId: Number(proofId),
                        taskId: Number(taskId),
                        submitter: submitter.toLowerCase(),
                        proofURI,
                        timestamp: new Date(),
                        resolved: false,
                    },
                    { upsert: true, new: true },
                );

                await UserTask.findOneAndUpdate(
                    { user: submitter.toLowerCase(), taskId: Number(taskId) },
                    {
                        status: "pending_verification",
                        proofUrl: proofURI,
                        submittedAt: new Date(),
                    },
                    { upsert: true, new: true },
                );

                await Task.findOneAndUpdate(
                    { taskId: Number(taskId) },
                    { $inc: { participants: 1 } },
                );

                blockchainEvents.emit("proof:submitted", proof);
                console.log(`Proof #${proofId} submitted for task #${taskId}`);
            } catch (err) {
                console.error("Error handling ProofSubmitted:", err);
            }
        },
    );
}

function setupVotingManagerListeners() {
    const contract = getVotingManager();

    contract.on(
        "ProposalCreated",
        async (id: bigint, proofId: bigint, voteStart: bigint, voteEnd: bigint) => {
            try {
                const proof = await Proof.findOne({ proofId: Number(proofId) });
                const task = proof ? await Task.findOne({ taskId: proof.taskId }) : null;

                const title = task
                    ? `Verify: ${task.title} - ${proof!.submitter.slice(0, 6)}...${proof!.submitter.slice(-4)}`
                    : `Proposal #${id}`;
                const description = task
                    ? `Review the proof submitted for "${task.title}".`
                    : `Review proof #${proofId}`;

                const proposal = await Proposal.findOneAndUpdate(
                    { proposalId: Number(id) },
                    {
                        proposalId: Number(id),
                        proofId: Number(proofId),
                        title,
                        type: "task_verification",
                        description,
                        status: "active",
                        voteStart: new Date(Number(voteStart) * 1000),
                        voteEnd: new Date(Number(voteEnd) * 1000),
                        approveVotes: 0,
                        rejectVotes: 0,
                        totalVoters: 0,
                        resolved: false,
                        approved: false,
                        taskProof: proof
                            ? {
                                  taskTitle: task?.title || `Task #${proof.taskId}`,
                                  volunteer: proof.submitter,
                                  proofUrl: proof.proofURI,
                              }
                            : undefined,
                    },
                    { upsert: true, new: true },
                );

                blockchainEvents.emit("proposal:created", proposal);
                console.log(`Proposal #${id} created for proof #${proofId}`);
            } catch (err) {
                console.error("Error handling ProposalCreated:", err);
            }
        },
    );

    contract.on(
        "Voted",
        async (proposalId: bigint, voter: string, approve: boolean, votingPower: bigint) => {
            try {
                const vote = await Vote.findOneAndUpdate(
                    { proposalId: Number(proposalId), voter: voter.toLowerCase() },
                    {
                        proposalId: Number(proposalId),
                        voter: voter.toLowerCase(),
                        approve,
                        votingPower: Number(votingPower),
                        timestamp: new Date(),
                    },
                    { upsert: true, new: true },
                );

                const updateField = approve
                    ? { $inc: { approveVotes: Number(votingPower), totalVoters: 1 } }
                    : { $inc: { rejectVotes: Number(votingPower), totalVoters: 1 } };

                const proposal = await Proposal.findOneAndUpdate(
                    { proposalId: Number(proposalId) },
                    updateField,
                    { new: true },
                );

                blockchainEvents.emit("proposal:voted", { vote, proposal });
                console.log(`Vote on proposal #${proposalId} by ${voter}`);
            } catch (err) {
                console.error("Error handling Voted:", err);
            }
        },
    );

    contract.on("ProposalResolved", async (id: bigint, approved: boolean) => {
        try {
            const status = approved ? "passed" : "rejected";
            const proposal = await Proposal.findOneAndUpdate(
                { proposalId: Number(id) },
                { resolved: true, approved, status },
                { new: true },
            );

            if (proposal) {
                const proof = await Proof.findOneAndUpdate(
                    { proofId: proposal.proofId },
                    { resolved: true },
                    { new: true },
                );

                if (proof) {
                    const userTaskStatus = approved ? "approved" : "rejected";
                    const task = await Task.findOne({ taskId: proof.taskId });
                    const earnedRN = approved && task ? task.reward : 0;

                    await UserTask.findOneAndUpdate(
                        { user: proof.submitter, taskId: proof.taskId },
                        { status: userTaskStatus, earnedRN },
                    );
                }
            }

            blockchainEvents.emit("proposal:resolved", proposal);
            console.log(`Proposal #${id} resolved: ${status}`);
        } catch (err) {
            console.error("Error handling ProposalResolved:", err);
        }
    });
}

function setupStakingManagerListeners() {
    const contract = getStakingManager();

    contract.on("Staked", async (user: string, amount: bigint) => {
        try {
            const record = await StakeRecord.create({
                user: user.toLowerCase(),
                amount: ethers.formatEther(amount),
                action: "stake",
            });

            blockchainEvents.emit("staking:staked", record);
            console.log(`Staked by ${user}: ${ethers.formatEther(amount)}`);
        } catch (err) {
            console.error("Error handling Staked:", err);
        }
    });

    contract.on("Unstaked", async (user: string, amount: bigint) => {
        try {
            const record = await StakeRecord.create({
                user: user.toLowerCase(),
                amount: ethers.formatEther(amount),
                action: "unstake",
            });

            blockchainEvents.emit("staking:unstaked", record);
            console.log(`Unstaked by ${user}: ${ethers.formatEther(amount)}`);
        } catch (err) {
            console.error("Error handling Unstaked:", err);
        }
    });
}

function setupSwapPoolListeners() {
    const contract = getSwapPool();

    contract.on("SwappedHBARForToken", async (user: string, hbarIn: bigint, tokenOut: bigint) => {
        try {
            const record = await SwapRecord.create({
                user: user.toLowerCase(),
                type: "hbarToToken",
                amountIn: ethers.formatEther(hbarIn),
                amountOut: ethers.formatEther(tokenOut),
            });

            blockchainEvents.emit("swap:executed", record);
            console.log(`Swap HBAR->Token by ${user}`);
        } catch (err) {
            console.error("Error handling SwappedHBARForToken:", err);
        }
    });

    contract.on("SwappedTokenForHBAR", async (user: string, tokenIn: bigint, hbarOut: bigint) => {
        try {
            const record = await SwapRecord.create({
                user: user.toLowerCase(),
                type: "tokenToHbar",
                amountIn: ethers.formatEther(tokenIn),
                amountOut: ethers.formatEther(hbarOut),
            });

            blockchainEvents.emit("swap:executed", record);
            console.log(`Swap Token->HBAR by ${user}`);
        } catch (err) {
            console.error("Error handling SwappedTokenForHBAR:", err);
        }
    });
}

export function startEventListeners() {
    console.log("Starting blockchain event listeners (WebSocket)...");
    setupTaskManagerListeners();
    setupProofManagerListeners();
    setupVotingManagerListeners();
    setupStakingManagerListeners();
    setupSwapPoolListeners();
    console.log("All event listeners active");
}
