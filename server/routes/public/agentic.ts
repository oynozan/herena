import { Router } from "express";
import type { Request, Response } from "express";

import Task, { type ITaskDocument } from "../../models/Task";
import Proposal, { type IProposalDocument } from "../../models/Proposal";
import Proof from "../../models/Proof";

const router = Router();

// Base descriptor for both HOL & OpenClaw
router.get("/", (_req: Request, res: Response) => {
    res.json({
        name: "Herena Agentic API",
        version: "0.2.0",
        description:
            "Unified agent-facing interface for physical sustainability tasks, proofs and governance on Hedera.",
        capabilities: {
            tasks: ["list", "details"],
            proofs: ["submit", "status"],
            voting: ["listProposals", "details"],
        },
        integrations: {
            hol: {
                status: "active",
                mode: "agent-intents-over-http",
            },
            openClaw: {
                status: "active",
                mode: "multi-agent-coordination-over-http",
            },
        },
    });
});

// Shared task listing for agents (HOL + OpenClaw)
router.get("/tasks", async (req: Request, res: Response) => {
    try {
        const { status = "active", page = "1", limit = "10" } = req.query;

        const filter: Record<string, any> = {};
        if (status) filter.status = status;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [tasks, total] = await Promise.all([
            Task.find(filter).sort({ deadline: 1 }).skip(skip).limit(limitNum).lean<ITaskDocument[]>(),
            Task.countDocuments(filter),
        ]);

        res.json({
            source: "herena",
            tasks: tasks.map((t: ITaskDocument) => ({
                id: String(t.taskId),
                title: t.title,
                description: t.description,
                category: t.category,
                reward: t.reward,
                proofType: t.proofType,
                status: t.status,
                deadline: t.deadline.toISOString(),
                participants: t.participants,
                maxParticipants: t.maxParticipants,
                completedCount: t.completedCount,
                metadataURI: t.metadataURI,
            })),
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("GET /agentic/tasks error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Shared single-task details
router.get("/tasks/:id", async (req: Request, res: Response) => {
    try {
        const task = await Task.findOne({ taskId: Number(req.params.id) }).lean();
        if (!task) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        res.json({
            id: String(task.taskId),
            title: task.title,
            description: task.description,
            category: task.category,
            reward: task.reward,
            proofType: task.proofType,
            status: task.status,
            deadline: task.deadline.toISOString(),
            participants: task.participants,
            maxParticipants: task.maxParticipants,
            completedCount: task.completedCount,
            metadataURI: task.metadataURI,
        });
    } catch (err) {
        console.error("GET /agentic/tasks/:id error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Agents submit an off-chain proof URI for a physical task
router.post("/tasks/:id/proof", async (req: Request, res: Response) => {
    try {
        const taskId = Number(req.params.id);
        const { submitter, proofURI } = req.body || {};

        if (!submitter || !proofURI) {
            res.status(400).json({ error: "submitter and proofURI are required" });
            return;
        }

        const task = await Task.findOne({ taskId });
        if (!task) {
            res.status(404).json({ error: "Task not found" });
            return;
        }

        const proofCount = await Proof.countDocuments({ taskId });
        const proof = await Proof.create({
            proofId: proofCount + 1,
            taskId,
            submitter: String(submitter).toLowerCase(),
            proofURI,
            timestamp: new Date(),
            resolved: false,
        });

        res.status(201).json({
            success: true,
            proof: {
                id: proof.proofId,
                taskId: proof.taskId,
                submitter: proof.submitter,
                proofURI: proof.proofURI,
                timestamp: proof.timestamp.toISOString(),
            },
        });
    } catch (err) {
        console.error("POST /agentic/tasks/:id/proof error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Proposals list for governance-aware agents
router.get("/proposals", async (req: Request, res: Response) => {
    try {
        const { status, page = "1", limit = "10" } = req.query;

        const filter: Record<string, any> = {};
        if (status) filter.status = status;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [proposals, total] = await Promise.all([
            Proposal.find(filter)
                .sort({ voteEnd: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean<IProposalDocument[]>(),
            Proposal.countDocuments(filter),
        ]);

        res.json({
            source: "herena",
            proposals: proposals.map((p: IProposalDocument) => ({
                id: String(p.proposalId),
                title: p.title,
                type: p.type,
                description: p.description,
                status: p.status,
                votingEnds: p.voteEnd.toISOString(),
                yesVotes: p.approveVotes,
                noVotes: p.rejectVotes,
                totalVoters: p.totalVoters,
                taskProof: p.taskProof,
            })),
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("GET /agentic/proposals error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Single proposal details
router.get("/proposals/:id", async (req: Request, res: Response) => {
    try {
        const proposal = await Proposal.findOne({ proposalId: Number(req.params.id) }).lean();
        if (!proposal) {
            res.status(404).json({ error: "Proposal not found" });
            return;
        }

        res.json({
            id: String(proposal.proposalId),
            title: proposal.title,
            type: proposal.type,
            description: proposal.description,
            status: proposal.status,
            votingEnds: proposal.voteEnd.toISOString(),
            yesVotes: proposal.approveVotes,
            noVotes: proposal.rejectVotes,
            totalVoters: proposal.totalVoters,
            taskProof: proposal.taskProof,
        });
    } catch (err) {
        console.error("GET /agentic/proposals/:id error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

