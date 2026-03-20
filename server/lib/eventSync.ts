import { ethers } from "ethers";
import axios from "axios";

import {
    getProvider,
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

const POLL_INTERVAL_MS = 10_000;

let lastBlock = 0;

async function fetchMetadata(uri: string) {
    try {
        const { data } = await axios.get(uri, { timeout: 10000 });
        return data;
    } catch (err) {
        console.error(`Failed to fetch metadata from ${uri}:`, err);
        return null;
    }
}

async function handleTaskCreated(log: ethers.EventLog) {
    const [id, description, rewardPerCompletion, maxCompletions, deadline, metadataURI] = log.args;
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

        await Task.findOneAndUpdate(
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
        console.log(`Task #${id} created`);
    } catch (err) {
        console.error("Error handling TaskCreated:", err);
    }
}

async function handleTaskCompletionIncremented(log: ethers.EventLog) {
    const [id, newCompletedCount] = log.args;
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
        console.log(`Task #${id} completion: ${newCompletedCount}`);
    } catch (err) {
        console.error("Error handling TaskCompletionIncremented:", err);
    }
}

async function handleTaskCancelled(log: ethers.EventLog) {
    const [id] = log.args;
    try {
        await Task.findOneAndUpdate({ taskId: Number(id) }, { status: "completed" });
        console.log(`Task #${id} cancelled`);
    } catch (err) {
        console.error("Error handling TaskCancelled:", err);
    }
}

async function handleProofSubmitted(log: ethers.EventLog) {
    const [proofId, taskId, submitter, proofURI] = log.args;
    try {
        await Proof.findOneAndUpdate(
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

        await Task.findOneAndUpdate({ taskId: Number(taskId) }, { $inc: { participants: 1 } });

        console.log(`Proof #${proofId} submitted for task #${taskId}`);
    } catch (err) {
        console.error("Error handling ProofSubmitted:", err);
    }
}

async function handleProposalCreated(log: ethers.EventLog) {
    const [id, proofId, voteStart, voteEnd] = log.args;
    try {
        const proof = await Proof.findOne({ proofId: Number(proofId) });
        const task = proof ? await Task.findOne({ taskId: proof.taskId }) : null;

        const title = task
            ? `Verify: ${task.title} - ${proof!.submitter.slice(0, 6)}...${proof!.submitter.slice(-4)}`
            : `Proposal #${id}`;
        const description = task
            ? `Review the proof submitted for "${task.title}".`
            : `Review proof #${proofId}`;

        await Proposal.findOneAndUpdate(
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
        console.log(`Proposal #${id} created for proof #${proofId}`);
    } catch (err) {
        console.error("Error handling ProposalCreated:", err);
    }
}

async function handleVoted(log: ethers.EventLog) {
    const [proposalId, voter, approve, votingPower] = log.args;
    try {
        await Vote.findOneAndUpdate(
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

        await Proposal.findOneAndUpdate({ proposalId: Number(proposalId) }, updateField);
        console.log(`Vote on proposal #${proposalId} by ${voter}`);
    } catch (err) {
        console.error("Error handling Voted:", err);
    }
}

async function handleProposalResolved(log: ethers.EventLog) {
    const [id, approved] = log.args;
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

        console.log(`Proposal #${id} resolved: ${status}`);
    } catch (err) {
        console.error("Error handling ProposalResolved:", err);
    }
}

async function handleStaked(log: ethers.EventLog) {
    const [user, amount] = log.args;
    try {
        await StakeRecord.create({
            user: user.toLowerCase(),
            amount: ethers.formatEther(amount),
            action: "stake",
        });
        console.log(`Staked by ${user}: ${ethers.formatEther(amount)}`);
    } catch (err) {
        console.error("Error handling Staked:", err);
    }
}

async function handleUnstaked(log: ethers.EventLog) {
    const [user, amount] = log.args;
    try {
        await StakeRecord.create({
            user: user.toLowerCase(),
            amount: ethers.formatEther(amount),
            action: "unstake",
        });
        console.log(`Unstaked by ${user}: ${ethers.formatEther(amount)}`);
    } catch (err) {
        console.error("Error handling Unstaked:", err);
    }
}

async function handleSwappedHBARForToken(log: ethers.EventLog) {
    const [user, hbarIn, tokenOut] = log.args;
    try {
        await SwapRecord.create({
            user: user.toLowerCase(),
            type: "hbarToToken",
            amountIn: ethers.formatEther(hbarIn),
            amountOut: ethers.formatEther(tokenOut),
        });
        console.log(`Swap HBAR->Token by ${user}`);
    } catch (err) {
        console.error("Error handling SwappedHBARForToken:", err);
    }
}

async function handleSwappedTokenForHBAR(log: ethers.EventLog) {
    const [user, tokenIn, hbarOut] = log.args;
    try {
        await SwapRecord.create({
            user: user.toLowerCase(),
            type: "tokenToHbar",
            amountIn: ethers.formatEther(tokenIn),
            amountOut: ethers.formatEther(hbarOut),
        });
        console.log(`Swap Token->HBAR by ${user}`);
    } catch (err) {
        console.error("Error handling SwappedTokenForHBAR:", err);
    }
}

async function pollEvents() {
    try {
        const provider = getProvider();
        const currentBlock = await provider.getBlockNumber();

        if (lastBlock === 0) {
            lastBlock = currentBlock;
            console.log(`Event polling initialized at block ${currentBlock}`);
            return;
        }

        if (currentBlock <= lastBlock) return;

        const fromBlock = lastBlock + 1;
        const toBlock = currentBlock;

        const taskManager = getTaskManager();
        const proofManager = getProofManager();
        const votingManager = getVotingManager();
        const stakingManager = getStakingManager();
        const swapPool = getSwapPool();

        const queries = [
            taskManager.queryFilter("TaskCreated", fromBlock, toBlock),
            taskManager.queryFilter("TaskCompletionIncremented", fromBlock, toBlock),
            taskManager.queryFilter("TaskCancelled", fromBlock, toBlock),
            proofManager.queryFilter("ProofSubmitted", fromBlock, toBlock),
            votingManager.queryFilter("ProposalCreated", fromBlock, toBlock),
            votingManager.queryFilter("Voted", fromBlock, toBlock),
            votingManager.queryFilter("ProposalResolved", fromBlock, toBlock),
            stakingManager.queryFilter("Staked", fromBlock, toBlock),
            stakingManager.queryFilter("Unstaked", fromBlock, toBlock),
            swapPool.queryFilter("SwappedHBARForToken", fromBlock, toBlock),
            swapPool.queryFilter("SwappedTokenForHBAR", fromBlock, toBlock),
        ];

        const [
            taskCreatedLogs,
            taskCompletionLogs,
            taskCancelledLogs,
            proofSubmittedLogs,
            proposalCreatedLogs,
            votedLogs,
            proposalResolvedLogs,
            stakedLogs,
            unstakedLogs,
            swapHBARLogs,
            swapTokenLogs,
        ] = await Promise.all(queries);

        for (const log of taskCreatedLogs) await handleTaskCreated(log as ethers.EventLog);
        for (const log of taskCompletionLogs) await handleTaskCompletionIncremented(log as ethers.EventLog);
        for (const log of taskCancelledLogs) await handleTaskCancelled(log as ethers.EventLog);
        for (const log of proofSubmittedLogs) await handleProofSubmitted(log as ethers.EventLog);
        for (const log of proposalCreatedLogs) await handleProposalCreated(log as ethers.EventLog);
        for (const log of votedLogs) await handleVoted(log as ethers.EventLog);
        for (const log of proposalResolvedLogs) await handleProposalResolved(log as ethers.EventLog);
        for (const log of stakedLogs) await handleStaked(log as ethers.EventLog);
        for (const log of unstakedLogs) await handleUnstaked(log as ethers.EventLog);
        for (const log of swapHBARLogs) await handleSwappedHBARForToken(log as ethers.EventLog);
        for (const log of swapTokenLogs) await handleSwappedTokenForHBAR(log as ethers.EventLog);

        const totalEvents =
            taskCreatedLogs.length + taskCompletionLogs.length + taskCancelledLogs.length +
            proofSubmittedLogs.length + proposalCreatedLogs.length + votedLogs.length +
            proposalResolvedLogs.length + stakedLogs.length + unstakedLogs.length +
            swapHBARLogs.length + swapTokenLogs.length;

        if (totalEvents > 0) {
            console.log(`Processed ${totalEvents} events from blocks ${fromBlock}-${toBlock}`);
        }

        lastBlock = currentBlock;
    } catch (err) {
        console.error("Event polling error:", err);
    }
}

export function startEventListeners() {
    console.log("Starting blockchain event polling...");
    pollEvents();
    setInterval(pollEvents, POLL_INTERVAL_MS);
    console.log(`Event polling active (every ${POLL_INTERVAL_MS / 1000}s)`);
}
