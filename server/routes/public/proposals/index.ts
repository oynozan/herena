import { Router } from "express";
import type { Request, Response } from "express";

import Proposal from "../../../models/Proposal";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    try {
        const { status, page = "1", limit = "10" } = req.query;

        const filter: Record<string, any> = {};
        if (status) filter.status = status;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [proposals, total] = await Promise.all([
            Proposal.find(filter).sort({ proposalId: -1 }).skip(skip).limit(limitNum).lean(),
            Proposal.countDocuments(filter),
        ]);

        res.json({
            proposals: proposals.map(p => ({
                id: String(p.proposalId),
                title: p.title,
                type: p.type,
                description: p.description,
                status: p.status,
                votingEnds: p.voteEnd.toISOString().split("T")[0],
                yesVotes: p.approveVotes / 1e9,
                noVotes: p.rejectVotes / 1e9,
                totalVoters: p.totalVoters,
                taskProof: p.taskProof,
                txHash: p.txHash || null,
                resolveTxHash: p.resolveTxHash || null,
            })),
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("GET /proposals error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
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
            votingEnds: proposal.voteEnd.toISOString().split("T")[0],
            yesVotes: proposal.approveVotes / 1e9,
            noVotes: proposal.rejectVotes / 1e9,
            totalVoters: proposal.totalVoters,
            taskProof: proposal.taskProof,
            txHash: proposal.txHash || null,
            resolveTxHash: proposal.resolveTxHash || null,
        });
    } catch (err) {
        console.error("GET /proposals/:id error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
