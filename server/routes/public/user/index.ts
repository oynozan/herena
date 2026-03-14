import { Router } from "express";
import type { Request, Response } from "express";

import Task from "../../../models/Task";
import Vote from "../../../models/Vote";
import UserTask from "../../../models/UserTask";
import Proposal from "../../../models/Proposal";
import { getStakingManager } from "../../../lib/contracts";

const router = Router();

router.get("/tasks", async (req: Request, res: Response) => {
    try {
        const wallet = (req.query.wallet as string)?.toLowerCase();
        if (!wallet) {
            res.status(400).json({ error: "Wallet address required" });
            return;
        }

        const userTasks = await UserTask.find({ user: wallet }).lean();

        const taskIds = userTasks.map(ut => ut.taskId);
        const tasks = await Task.find({ taskId: { $in: taskIds } }).lean();
        const taskMap = new Map(tasks.map(t => [t.taskId, t]));

        const result = userTasks.map(ut => {
            const task = taskMap.get(ut.taskId);
            return {
                id: ut._id.toString(),
                task: task
                    ? {
                          id: String(task.taskId),
                          title: task.title,
                          description: task.description,
                          category: task.category,
                          reward: task.reward,
                          proofType: task.proofType,
                          status: task.status,
                          deadline: task.deadline.toISOString().split("T")[0],
                          participants: task.participants,
                          maxParticipants: task.maxParticipants,
                          completedCount: task.completedCount,
                          createdAt: task.createdAt.toISOString().split("T")[0],
                      }
                    : null,
                status: ut.status,
                proofUrl: ut.proofUrl,
                submittedAt: ut.submittedAt?.toISOString().split("T")[0],
                earnedRN: ut.earnedRN,
                txHash: ut.txHash,
            };
        });

        res.json({ userTasks: result });
    } catch (err) {
        console.error("GET /user/tasks error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/votes", async (req: Request, res: Response) => {
    try {
        const wallet = (req.query.wallet as string)?.toLowerCase();
        if (!wallet) {
            res.status(400).json({ error: "Wallet address required" });
            return;
        }

        const votes = await Vote.find({ voter: wallet }).sort({ timestamp: -1 }).lean();

        const proposalIds = votes.map(v => v.proposalId);
        const proposals = await Proposal.find({ proposalId: { $in: proposalIds } }).lean();
        const proposalMap = new Map(proposals.map(p => [p.proposalId, p]));

        const result = votes.map(v => {
            const proposal = proposalMap.get(v.proposalId);
            return {
                id: v._id.toString(),
                proposalId: String(v.proposalId),
                proposal: proposal
                    ? {
                          id: String(proposal.proposalId),
                          title: proposal.title,
                          type: proposal.type,
                          description: proposal.description,
                          status: proposal.status,
                          votingEnds: proposal.voteEnd.toISOString().split("T")[0],
                          yesVotes: proposal.approveVotes,
                          noVotes: proposal.rejectVotes,
                          totalVoters: proposal.totalVoters,
                          taskProof: proposal.taskProof,
                      }
                    : null,
                approve: v.approve,
                votingPower: v.votingPower,
                timestamp: v.timestamp.toISOString(),
            };
        });

        res.json({ votes: result });
    } catch (err) {
        console.error("GET /user/votes error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/staking", async (req: Request, res: Response) => {
    try {
        const wallet = req.query.wallet as string;
        if (!wallet) {
            res.status(400).json({ error: "Wallet address required" });
            return;
        }

        let stakedRN = 0;
        let votingPower = 0;

        try {
            const stakingManager = getStakingManager();
            const staked = await stakingManager.getStakedAmount(wallet);
            const power = await stakingManager.getVotingPower(wallet);
            stakedRN = Number(staked) / 1e18;
            votingPower = Number(power);
        } catch {
            // Contract call may fail if not deployed
        }

        res.json({
            stakedRN,
            votingPower,
            rewards: 0,
            apy: 0,
        });
    } catch (err) {
        console.error("GET /user/staking error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
