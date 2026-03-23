import { Router } from "express";
import type { Request, Response } from "express";

import { getAdminVotingManager } from "../../lib/contracts";

const router = Router();

router.put("/voting-duration", async (req: Request, res: Response) => {
    try {
        const { duration } = req.body;
        if (!duration || typeof duration !== "number" || duration <= 0) {
            res.status(400).json({ error: "duration must be a positive number (seconds)" });
            return;
        }

        const votingManager = getAdminVotingManager();
        const tx = await votingManager.setVotingDuration(duration);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash, duration });
    } catch (err) {
        console.error("PUT /admin/voting-duration error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

router.delete("/proposal/:id", async (req: Request, res: Response) => {
    try {
        const proposalId = Number(req.params.id);
        if (isNaN(proposalId) || proposalId < 0) {
            res.status(400).json({ error: "Invalid proposal ID" });
            return;
        }

        const votingManager = getAdminVotingManager();
        const tx = await votingManager.deleteProposal(proposalId);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash, proposalId });
    } catch (err) {
        console.error("DELETE /admin/proposal error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

export default router;
