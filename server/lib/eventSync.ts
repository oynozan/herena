import { ethers } from "ethers";
import axios from "axios";

import {
    getProvider,
    getTaskManager,
    getProofManager,
    getVotingManager,
    getStakingManager,
    getSwapPool,
    getAdminVotingManager,
} from "./contracts";
import { logToHCS } from "./hcs";
import { awardBadge } from "./badges";

import Task from "../models/Task";
import Proof from "../models/Proof";
import Proposal from "../models/Proposal";
import Vote from "../models/Vote";
import UserTask from "../models/UserTask";
import StakeRecord from "../models/StakeRecord";
import SwapRecord from "../models/SwapRecord";

const POLL_INTERVAL_MS = 10_000;

let lastBlock = 0;
let _polling = false;

async function fetchMetadata(uri: string) {
    try {
        const cid = uri.startsWith("ipfs://") ? uri.slice(7) : uri;
        const api = process.env.IPFS_API?.replace(/\/$/, "");

        if (api) {
            // Use Kubo RPC /cat to avoid gateway subdomain redirect issues
            const { data } = await axios.post(`${api}/cat?arg=${cid}`, null, { timeout: 10000 });
            return typeof data === "string" ? JSON.parse(data) : data;
        }

        // Fallback to gateway
        const gateway = process.env.IPFS_GATEWAY || "http://127.0.0.1:8080/ipfs";
        const { data } = await axios.get(`${gateway.replace(/\/$/, "")}/${cid}`, { timeout: 10000 });
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
            const raw = await fetchMetadata(metadataURI);
            if (raw) {
                // Unwrap the { v, tiptap: { title, description, ... } } envelope
                const meta = raw.v && raw.tiptap ? raw.tiptap : raw;
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
                txHash: log.transactionHash || "",
            },
            { upsert: true, new: true },
        );
        const totalBudget = Number(ethers.formatEther(rewardPerCompletion)) * Number(maxCompletions);
        console.log(`[LIFECYCLE] Task #${id} CREATED | "${title}" | reward=${ethers.formatEther(rewardPerCompletion)} HRN | slots=${maxCompletions} | budget=${totalBudget} HRN | deadline=${new Date(Number(deadline) * 1000).toISOString()} | tx=${log.transactionHash}`);
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
            console.log(`[LIFECYCLE] Task #${id} COMPLETED | all ${task.maxParticipants} slots filled`);
        }
        console.log(`[LIFECYCLE] Task #${id} completion incremented → ${newCompletedCount}/${task?.maxParticipants || "?"}`);
    } catch (err) {
        console.error("Error handling TaskCompletionIncremented:", err);
    }
}

async function handleTaskCancelled(log: ethers.EventLog) {
    const [id] = log.args;
    try {
        await Task.findOneAndUpdate({ taskId: Number(id) }, { status: "completed" });
        console.log(`[LIFECYCLE] Task #${id} CANCELLED | unused funds returned to Treasury`);
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
                txHash: log.transactionHash || "",
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

        // HCS audit trail
        logToHCS({ type: "proof_submitted", proofId: Number(proofId), taskId: Number(taskId), submitter: submitter.toLowerCase() });

        // Badge: first submission
        const proofCount = await Proof.countDocuments({ submitter: submitter.toLowerCase() });
        if (proofCount <= 1) {
            awardBadge(submitter.toLowerCase(), 1).catch(err => console.error("Badge award error:", err));
        }

        console.log(`[LIFECYCLE] Proof #${proofId} SUBMITTED | task=#${taskId} | by=${submitter.toLowerCase()} | uri=${proofURI} | tx=${log.transactionHash}`);
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
                txHash: log.transactionHash || "",
                taskProof: proof
                    ? {
                          taskId: proof.taskId,
                          taskTitle: task?.title || `Task #${proof.taskId}`,
                          volunteer: proof.submitter,
                          proofUrl: proof.proofURI,
                      }
                    : undefined,
            },
            { upsert: true, new: true },
        );
        console.log(`[LIFECYCLE] Proposal #${id} CREATED | proof=#${proofId} | voting=${new Date(Number(voteStart) * 1000).toISOString()} → ${new Date(Number(voteEnd) * 1000).toISOString()} | tx=${log.transactionHash}`);
    } catch (err) {
        console.error("Error handling ProposalCreated:", err);
    }
}

async function handleVoted(log: ethers.EventLog) {
    const [proposalId, voter, approve, votingPower] = log.args;
    try {
        // Returns null if freshly inserted (upsert), returns old doc if already existed
        const existing = await Vote.findOneAndUpdate(
            { proposalId: Number(proposalId), voter: voter.toLowerCase() },
            {
                proposalId: Number(proposalId),
                voter: voter.toLowerCase(),
                approve,
                votingPower: Number(votingPower),
                timestamp: new Date(),
            },
            { upsert: true },
        );

        // Only increment proposal totals if this is a genuinely new vote
        if (!existing) {
            const updateField = approve
                ? { $inc: { approveVotes: Number(votingPower), totalVoters: 1 } }
                : { $inc: { rejectVotes: Number(votingPower), totalVoters: 1 } };
            await Proposal.findOneAndUpdate({ proposalId: Number(proposalId) }, updateField);
        }

        // HCS audit trail
        logToHCS({ type: "voted", proposalId: Number(proposalId), voter: voter.toLowerCase(), approve, votingPower: Number(votingPower) });

        // Badge: first vote
        const voteCount = await Vote.countDocuments({ voter: voter.toLowerCase() });
        if (voteCount <= 1) {
            awardBadge(voter.toLowerCase(), 4).catch(err => console.error("Badge award error:", err));
        }

        console.log(`[LIFECYCLE] VOTE on proposal #${proposalId} | by=${voter.toLowerCase()} | direction=${approve ? "APPROVE" : "REJECT"} | power=${Number(votingPower)} | tx=${log.transactionHash}`);
    } catch (err) {
        console.error("Error handling Voted:", err);
    }
}

async function handleProposalResolved(log: ethers.EventLog) {
    const [id, approved] = log.args;
    const txHash = log.transactionHash;
    try {
        const status = approved ? "passed" : "rejected";
        const proposal = await Proposal.findOneAndUpdate(
            { proposalId: Number(id) },
            { resolved: true, approved, status, resolveTxHash: txHash },
            { new: true },
        );

        if (proposal) {
            const proof = await Proof.findOneAndUpdate(
                { proofId: proposal.proofId },
                { resolved: true, resolveTxHash: txHash },
                { new: true },
            );

            if (proof) {
                const userTaskStatus = approved ? "approved" : "rejected";
                const task = await Task.findOne({ taskId: proof.taskId });
                const submitterReward = approved && task ? task.reward * 0.8 : 0;
                const voterRewardPool = approved && task ? task.reward * 0.2 : 0;

                await UserTask.findOneAndUpdate(
                    { user: proof.submitter, taskId: proof.taskId },
                    { status: userTaskStatus, earnedRN: submitterReward },
                );

                if (approved && task) {
                    console.log(`[LIFECYCLE] Proposal #${id} APPROVED | task=#${proof.taskId} | tx=${txHash}`);
                    console.log(`[LIFECYCLE]   → Submitter ${proof.submitter} reward: ${submitterReward} HRN (80% of ${task.reward})`);
                    console.log(`[LIFECYCLE]   → Voter reward pool: ${voterRewardPool} HRN (20% of ${task.reward})`);

                    // Log individual voter rewards
                    const approveVoters = await Vote.find({ proposalId: Number(id), approve: true }).lean();
                    const totalApprovePower = approveVoters.reduce((sum, v) => sum + v.votingPower, 0);
                    if (totalApprovePower > 0) {
                        for (const v of approveVoters) {
                            const share = (voterRewardPool * v.votingPower) / totalApprovePower;
                            console.log(`[LIFECYCLE]   → Voter ${v.voter} reward: ${share.toFixed(4)} HRN (power=${v.votingPower}, ${((v.votingPower / totalApprovePower) * 100).toFixed(1)}%)`);
                        }
                    }
                } else {
                    console.log(`[LIFECYCLE] Proposal #${id} REJECTED | task=#${proof.taskId} | submitter=${proof.submitter} | no rewards | tx=${txHash}`);
                }

                // Badge: first approval
                if (approved) {
                    await Task.findOneAndUpdate({ taskId: proof.taskId }, { $inc: { participants: 1 } });

                    const approvedCount = await UserTask.countDocuments({ user: proof.submitter, status: "approved" });
                    if (approvedCount <= 1) {
                        awardBadge(proof.submitter, 2).catch(err => console.error("Badge award error:", err));
                    }
                }
            }
        }

        // HCS audit trail
        logToHCS({ type: "proposal_resolved", proposalId: Number(id), approved });

        console.log(`[LIFECYCLE] Proposal #${id} RESOLVED → ${status} | tx=${txHash}`);
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

        // Badge: first stake >= 10 HRN
        const stakeRecords = await StakeRecord.find({ user: user.toLowerCase() }).lean();
        const netStaked = stakeRecords.reduce((sum, r) => {
            return sum + (r.action === "stake" ? Number(r.amount) : -Number(r.amount));
        }, 0);
        if (netStaked >= 10) {
            awardBadge(user.toLowerCase(), 3).catch(err => console.error("Badge award error:", err));
        }

        console.log(`[LIFECYCLE] STAKED | by=${user.toLowerCase()} | amount=${ethers.formatEther(amount)} HRN | netStaked=${netStaked.toFixed(2)} HRN | tx=${log.transactionHash}`);
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
        console.log(`[LIFECYCLE] UNSTAKED | by=${user.toLowerCase()} | amount=${ethers.formatEther(amount)} HRN | tx=${log.transactionHash}`);
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
        console.log(`[LIFECYCLE] SWAP HBAR→HRN | by=${user.toLowerCase()} | in=${ethers.formatEther(hbarIn)} HBAR | out=${ethers.formatEther(tokenOut)} HRN | tx=${log.transactionHash}`);
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
        console.log(`[LIFECYCLE] SWAP HRN→HBAR | by=${user.toLowerCase()} | in=${ethers.formatEther(tokenIn)} HRN | out=${ethers.formatEther(hbarOut)} HBAR | tx=${log.transactionHash}`);
    } catch (err) {
        console.error("Error handling SwappedTokenForHBAR:", err);
    }
}

async function markExpiredTasks() {
    try {
        const result = await Task.updateMany(
            { status: "active", deadline: { $lte: new Date() } },
            { status: "expired" },
        );
        if (result.modifiedCount > 0) {
            console.log(`[LIFECYCLE] Marked ${result.modifiedCount} task(s) as expired`);
        }
    } catch (err) {
        console.error("[LIFECYCLE] Error marking expired tasks:", err);
    }
}

async function resolveExpiredProposals() {
    try {
        const adminVotingManager = getAdminVotingManager();
        const votingManager = getVotingManager();

        const expired = await Proposal.find({
            resolved: false,
            status: "active",
            voteEnd: { $lte: new Date() },
        }).lean();

        for (const proposal of expired) {
            try {
                // First check on-chain state — the proposal may already be resolved
                let onChainResolved = false;
                let onChainApproved = false;
                try {
                    const onChain = await votingManager.getProposal(proposal.proposalId);
                    onChainResolved = onChain.resolved;
                    onChainApproved = onChain.approved;
                } catch {
                    // getProposal may revert for deleted proposals
                    console.warn(`[AUTO-RESOLVE] Could not read on-chain state for proposal #${proposal.proposalId}`);
                }

                if (onChainResolved) {
                    // Already resolved on-chain — just sync DB state
                    const status = onChainApproved ? "passed" : "rejected";
                    await Proposal.findOneAndUpdate(
                        { proposalId: proposal.proposalId },
                        { resolved: true, approved: onChainApproved, status },
                    );
                    // Cascade to Proof + UserTask
                    await cascadeProofResolution(proposal.proposalId, proposal.proofId, onChainApproved);
                    console.log(`[AUTO-RESOLVE] Proposal #${proposal.proposalId} was already resolved on-chain (${status}), synced DB`);
                    continue;
                }

                // Not resolved on-chain — attempt to resolve
                console.log(`[AUTO-RESOLVE] Resolving expired proposal #${proposal.proposalId}...`);
                const tx = await adminVotingManager.resolveProposal(proposal.proposalId);
                const receipt = await tx.wait();
                console.log(`[AUTO-RESOLVE] Proposal #${proposal.proposalId} resolved on-chain | tx=${tx.hash} | status=${receipt?.status}`);

                // The ProposalResolved event handler will update DB state via pollEvents,
                // but also cascade here in case the event is missed
                await cascadeProofResolution(proposal.proposalId, proposal.proofId, null);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error(`[AUTO-RESOLVE] Failed to resolve proposal #${proposal.proposalId}: ${msg}`);

                // Check on-chain state to see if it was actually resolved despite the error
                try {
                    const onChain = await votingManager.getProposal(proposal.proposalId);
                    if (onChain.resolved) {
                        const status = onChain.approved ? "passed" : "rejected";
                        await Proposal.findOneAndUpdate(
                            { proposalId: proposal.proposalId },
                            { resolved: true, approved: onChain.approved, status },
                        );
                        await cascadeProofResolution(proposal.proposalId, proposal.proofId, onChain.approved);
                        console.log(`[AUTO-RESOLVE] Proposal #${proposal.proposalId} found resolved on-chain after error (${status}), synced DB`);
                    }
                } catch {
                    // ignore — will retry next cycle
                }
            }
        }
    } catch (err: unknown) {
        // ADMIN_PRIVATE_KEY not set — skip silently
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("ADMIN_PRIVATE_KEY")) {
            console.error("[AUTO-RESOLVE] Error:", msg);
        }
    }
}

/**
 * Cascade resolution from a proposal to its linked Proof and UserTask documents.
 * If `approved` is null, re-reads the Proposal from DB to determine status.
 */
async function cascadeProofResolution(proposalId: number, proofId: number, approved: boolean | null) {
    try {
        if (approved === null) {
            const p = await Proposal.findOne({ proposalId }).lean();
            if (!p || !p.resolved) return;
            approved = p.approved;
        }

        const proof = await Proof.findOne({ proofId }).lean();
        if (!proof) return;

        // Update Proof
        if (!proof.resolved) {
            await Proof.findOneAndUpdate(
                { proofId },
                { resolved: true },
            );
        }

        // Update UserTask
        const userTaskStatus = approved ? "approved" : "rejected";
        const task = approved ? await Task.findOne({ taskId: proof.taskId }).lean() : null;
        const earnedRN = approved && task ? task.reward * 0.8 : 0;

        await UserTask.findOneAndUpdate(
            { user: proof.submitter, taskId: proof.taskId },
            { status: userTaskStatus, earnedRN },
        );

        console.log(`[AUTO-RESOLVE] Cascaded resolution to proof #${proofId} | user=${proof.submitter} | status=${userTaskStatus}`);
    } catch (err) {
        console.error(`[AUTO-RESOLVE] Error cascading resolution for proof #${proofId}:`, err);
    }
}

export async function pollEvents() {
    if (_polling) return;
    _polling = true;
    try {
        const provider = getProvider();
        const currentBlock = await provider.getBlockNumber();

        if (lastBlock === 0) {
            lastBlock = currentBlock - 1;
            console.log(`Event polling initialized at block ${currentBlock}`);
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

        // Mark expired tasks and auto-resolve expired proposals
        await markExpiredTasks();
        await resolveExpiredProposals();
    } catch (err) {
        console.error("Event polling error:", err);
    } finally {
        _polling = false;
    }
}

export function startEventListeners() {
    console.log("Starting blockchain event polling...");
    // One-time repair of vote totals corrupted by the non-idempotent $inc bug
    repairVoteTotals().then(() => {
        async function loop() {
            await pollEvents();
            setTimeout(loop, POLL_INTERVAL_MS);
        }
        loop();
    });
    console.log(`Event polling active (every ${POLL_INTERVAL_MS / 1000}s)`);
}

async function repairVoteTotals() {
    try {
        const proposals = await Proposal.find({}).lean();
        let repaired = 0;
        for (const p of proposals) {
            const votes = await Vote.find({ proposalId: p.proposalId }).lean();
            const approveVotes = votes
                .filter(v => v.approve)
                .reduce((sum, v) => sum + v.votingPower, 0);
            const rejectVotes = votes
                .filter(v => !v.approve)
                .reduce((sum, v) => sum + v.votingPower, 0);
            const totalVoters = votes.length;

            if (p.approveVotes !== approveVotes || p.rejectVotes !== rejectVotes || p.totalVoters !== totalVoters) {
                await Proposal.updateOne(
                    { proposalId: p.proposalId },
                    { $set: { approveVotes, rejectVotes, totalVoters } },
                );
                repaired++;
            }
        }
        if (repaired > 0) {
            console.log(`[LIFECYCLE] Repaired vote totals for ${repaired} proposal(s)`);
        }
    } catch (err) {
        console.error("[LIFECYCLE] Error repairing vote totals:", err);
    }
}
