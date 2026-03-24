import { Router } from "express";
import type { Request, Response } from "express";

import Task, { type ITaskDocument } from "../../models/Task";
import Proposal, { type IProposalDocument } from "../../models/Proposal";
import Proof from "../../models/Proof";
import {
    assertChainConfig,
    buildChainMeta,
    buildSubmitProofSteps,
    buildVoteSteps,
    buildResolveProposalSteps,
    buildStakeSteps,
    buildUnstakeSteps,
    broadcastSignedTransaction,
    getTxReceipt,
    readOnChainTask,
    readOnChainProposal,
    readOnChainProof,
} from "../../lib/agenticChain";

const router = Router();

function chainError(res: Response, err: unknown, fallbackStatus = 503) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Missing env") || msg.includes("HEDERA_RPC")) {
        return res.status(fallbackStatus).json({ error: "Chain not configured", detail: msg });
    }
    console.error("[agentic/chain]", err);
    return res.status(500).json({ error: "Chain operation failed", detail: msg });
}

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------
router.get("/", (_req: Request, res: Response) => {
    res.json({
        name: "Herena Agentic API",
        version: "0.4.0",
        description:
            "Agent-facing API: MongoDB index + Hedera EVM unsigned tx (prepare → sign → broadcast) for OpenClaw.",
        capabilities: {
            index: ["tasks", "proposals", "offChainProofMirror"],
            chain: [
                "meta",
                "readTask",
                "readProposal",
                "readProof",
                "prepareSubmitProof",
                "prepareVote",
                "prepareResolveProposal",
                "prepareStake",
                "prepareUnstake",
                "broadcast",
                "txReceipt",
            ],
        },
        integrations: {
            openClaw: {
                status: "active",
                mode: "prepare-sign-broadcast-json-rpc",
            },
        },
        flow: {
            write: [
                "1. POST /agentic/chain/tx/prepare-* + body (include `from` for gas hints)",
                "2. Agent signs serialized tx with same chainId as GET /agentic/chain/meta",
                "3. POST /agentic/chain/tx/broadcast { signedTransaction }",
                "4. GET /agentic/chain/tx/:hash — receipt / confirmation",
            ],
        },
    });
});

// ---------------------------------------------------------------------------
// Index (MongoDB — event sync mirror, UX-friendly fields)
// ---------------------------------------------------------------------------
router.get("/tasks", async (req: Request, res: Response) => {
    try {
        const { status = "active", page = "1", limit = "10" } = req.query;

        const filter: Record<string, unknown> = {};
        if (status) filter.status = status;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(50, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [tasks, total] = await Promise.all([
            Task.find(filter).sort({ deadline: 1 }).skip(skip).limit(limitNum).lean<ITaskDocument[]>(),
            Task.countDocuments(filter),
        ]);

        res.json({
            source: "mongodb",
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

router.get("/tasks/:id", async (req: Request, res: Response) => {
    try {
        const task = await Task.findOne({ taskId: Number(req.params.id) }).lean();
        if (!task) {
            res.status(404).json({ error: "Task not found in index" });
            return;
        }

        const body: Record<string, unknown> = {
            source: "mongodb",
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
        };

        try {
            assertChainConfig();
            body.chain = await readOnChainTask(BigInt(task.taskId));
        } catch {
            body.chain = null;
        }

        res.json(body);
    } catch (err) {
        console.error("GET /agentic/tasks/:id error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/** Off-chain Proof model mirror; on-chain sync is handled by `eventSync` */
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
            note: "Off-chain index only. On-chain proof: POST /agentic/chain/tx/prepare-submit-proof then broadcast.",
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

router.get("/proposals", async (req: Request, res: Response) => {
    try {
        const { status, page = "1", limit = "10" } = req.query;

        const filter: Record<string, unknown> = {};
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
            source: "mongodb",
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

router.get("/proposals/:id", async (req: Request, res: Response) => {
    try {
        const proposal = await Proposal.findOne({ proposalId: Number(req.params.id) }).lean();
        if (!proposal) {
            res.status(404).json({ error: "Proposal not found in index" });
            return;
        }

        const body: Record<string, unknown> = {
            source: "mongodb",
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
        };

        try {
            assertChainConfig();
            body.chain = await readOnChainProposal(BigInt(proposal.proposalId));
        } catch {
            body.chain = null;
        }

        res.json(body);
    } catch (err) {
        console.error("GET /agentic/proposals/:id error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ---------------------------------------------------------------------------
// Chain — read
// ---------------------------------------------------------------------------
router.get("/chain/meta", async (_req: Request, res: Response) => {
    try {
        const meta = await buildChainMeta();
        res.json(meta);
    } catch (err) {
        chainError(res, err);
    }
});

router.get("/chain/task/:taskId", async (req: Request, res: Response) => {
    try {
        const taskId = BigInt(req.params.taskId as string);
        const onChain = await readOnChainTask(taskId);
        res.json({ source: "hedera-evm", ...onChain });
    } catch (err) {
        chainError(res, err);
    }
});

router.get("/chain/proposal/:proposalId", async (req: Request, res: Response) => {
    try {
        const proposalId = BigInt(req.params.proposalId as string);
        const onChain = await readOnChainProposal(proposalId);
        res.json({ source: "hedera-evm", ...onChain });
    } catch (err) {
        chainError(res, err);
    }
});

router.get("/chain/proof/:proofId", async (req: Request, res: Response) => {
    try {
        const proofId = BigInt(req.params.proofId as string);
        const onChain = await readOnChainProof(proofId);
        res.json({ source: "hedera-evm", ...onChain });
    } catch (err) {
        chainError(res, err);
    }
});

router.get("/chain/tx/:hash", async (req: Request, res: Response) => {
    try {
        const receipt = await getTxReceipt(req.params.hash as string);
        if (!receipt) {
            res.status(404).json({ error: "Receipt not found yet" });
            return;
        }
        res.json(receipt);
    } catch (err) {
        chainError(res, err);
    }
});

// ---------------------------------------------------------------------------
// Chain — prepare (unsigned tx data for agent signing)
// ---------------------------------------------------------------------------
router.post("/chain/tx/prepare-submit-proof", async (req: Request, res: Response) => {
    try {
        const { taskId, proofURI, from } = req.body || {};
        if (taskId === undefined || !proofURI) {
            res.status(400).json({ error: "taskId and proofURI required" });
            return;
        }
        const tid = BigInt(taskId);
        const out = await buildSubmitProofSteps(tid, String(proofURI), from);
        const meta = await buildChainMeta();
        res.json({
            action: "submitProof",
            chainId: meta.chainId,
            signer: from || null,
            ...out,
        });
    } catch (err) {
        chainError(res, err);
    }
});

router.post("/chain/tx/prepare-vote", async (req: Request, res: Response) => {
    try {
        const { proposalId, approve, from } = req.body || {};
        if (proposalId === undefined || typeof approve !== "boolean") {
            res.status(400).json({ error: "proposalId and approve (boolean) required" });
            return;
        }
        const out = await buildVoteSteps(BigInt(proposalId), approve, from);
        const meta = await buildChainMeta();
        res.json({
            action: "vote",
            chainId: meta.chainId,
            signer: from || null,
            ...out,
        });
    } catch (err) {
        chainError(res, err);
    }
});

router.post("/chain/tx/prepare-resolve-proposal", async (req: Request, res: Response) => {
    try {
        const { proposalId, from } = req.body || {};
        if (proposalId === undefined) {
            res.status(400).json({ error: "proposalId required" });
            return;
        }
        const out = await buildResolveProposalSteps(BigInt(proposalId), from);
        const meta = await buildChainMeta();
        res.json({
            action: "resolveProposal",
            chainId: meta.chainId,
            signer: from || null,
            ...out,
        });
    } catch (err) {
        chainError(res, err);
    }
});

router.post("/chain/tx/prepare-stake", async (req: Request, res: Response) => {
    try {
        const { amountWei, from } = req.body || {};
        if (!amountWei) {
            res.status(400).json({ error: "amountWei required (HRN in wei, string)" });
            return;
        }
        const out = await buildStakeSteps(BigInt(amountWei), from);
        const meta = await buildChainMeta();
        res.json({
            action: "stake",
            chainId: meta.chainId,
            signer: from || null,
            ...out,
        });
    } catch (err) {
        chainError(res, err);
    }
});

router.post("/chain/tx/prepare-unstake", async (req: Request, res: Response) => {
    try {
        const { amountWei, from } = req.body || {};
        if (!amountWei) {
            res.status(400).json({ error: "amountWei required (HRN in wei, string)" });
            return;
        }
        const out = await buildUnstakeSteps(BigInt(amountWei), from);
        const meta = await buildChainMeta();
        res.json({
            action: "unstake",
            chainId: meta.chainId,
            signer: from || null,
            ...out,
        });
    } catch (err) {
        chainError(res, err);
    }
});

// ---------------------------------------------------------------------------
// Chain — broadcast signed tx (relay submits to Hedera JSON-RPC)
// ---------------------------------------------------------------------------
router.post("/chain/tx/broadcast", async (req: Request, res: Response) => {
    try {
        const { signedTransaction } = req.body || {};
        if (!signedTransaction || typeof signedTransaction !== "string" || !signedTransaction.startsWith("0x")) {
            res.status(400).json({ error: "signedTransaction (0x-prefixed hex) required" });
            return;
        }
        const result = await broadcastSignedTransaction(signedTransaction);
        res.json({
            verified: result.pending ? false : result.status === 1,
            ...result,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("nonce") || msg.includes("insufficient funds") || msg.includes("replacement")) {
            res.status(400).json({ error: "Broadcast rejected", detail: msg });
            return;
        }
        chainError(res, err);
    }
});

export default router;
