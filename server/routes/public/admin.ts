import { Router } from "express";
import { ethers } from "ethers";
import type { Request, Response } from "express";

import { authRequired, adminOnly } from "../../routes/middleware";
import {
    getAdminTaskManager,
    getAdminVotingManager,
    getAdminStakingManager,
} from "../../lib/contracts";

const router = Router();

// Hedera JSON-RPC relay can fail on eth_estimateGas with unhelpful errors,
// so we set an explicit gas limit on all admin write calls.
const GAS = { gasLimit: 3_000_000 };

// All admin routes require authentication + admin wallet
router.use(authRequired, adminOnly);

// Check if current user is admin
router.get("/check", (_req: Request, res: Response) => {
    res.json({ admin: true });
});

// ── Task Management ────────────────────────────────────────

router.post("/task", async (req: Request, res: Response) => {
    try {
        const { description, reward, maxCompletions, deadline, metadataURI } = req.body;

        if (!description || !reward || !maxCompletions || !deadline) {
            res.status(400).json({ error: "Missing required fields: description, reward, maxCompletions, deadline" });
            return;
        }

        const taskManager = getAdminTaskManager();
        const rewardWei = ethers.parseEther(String(reward));
        const deadlineUnix = Math.floor(new Date(deadline).getTime() / 1000);

        console.log("[admin/task] Creating task:", {
            description: description.slice(0, 50),
            rewardWei: rewardWei.toString(),
            maxCompletions,
            deadlineUnix,
            metadataURI: metadataURI?.slice(0, 40),
            contractAddress: await taskManager.getAddress(),
            signerAddress: await (taskManager.runner as ethers.Wallet)?.getAddress?.(),
        });

        // Static call first to get a readable revert reason before sending the real tx
        try {
            await taskManager.createTask.staticCall(
                description,
                rewardWei,
                BigInt(maxCompletions),
                BigInt(deadlineUnix),
                metadataURI || "",
            );
        } catch (simErr: any) {
            const reason = simErr?.revert?.name || simErr?.reason || simErr?.shortMessage || simErr?.message?.slice(0, 200);
            console.error("[admin/task] Static call revert:", reason);
            // Re-throw with a cleaner message
            throw new Error(`Contract would revert: ${reason}`);
        }

        const tx = await taskManager.createTask(
            description,
            rewardWei,
            BigInt(maxCompletions),
            BigInt(deadlineUnix),
            metadataURI || "",
            GAS,
        );
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error("POST /admin/task error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

router.delete("/task/:id", async (req: Request, res: Response) => {
    try {
        const taskId = Number(req.params.id);
        if (isNaN(taskId) || taskId < 0) {
            res.status(400).json({ error: "Invalid task ID" });
            return;
        }

        const taskManager = getAdminTaskManager();
        const tx = await taskManager.cancelTask(taskId, GAS);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error("DELETE /admin/task error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

router.post("/task/pause", async (_req: Request, res: Response) => {
    try {
        const taskManager = getAdminTaskManager();
        const tx = await taskManager.pause(GAS);
        await tx.wait();
        res.json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error("POST /admin/task/pause error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

router.post("/task/unpause", async (_req: Request, res: Response) => {
    try {
        const taskManager = getAdminTaskManager();
        const tx = await taskManager.unpause(GAS);
        await tx.wait();
        res.json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error("POST /admin/task/unpause error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

// ── Voting Management ──────────────────────────────────────

router.put("/voting-duration", async (req: Request, res: Response) => {
    try {
        const { duration } = req.body;
        if (!duration || typeof duration !== "number" || duration <= 0) {
            res.status(400).json({ error: "duration must be a positive number (seconds)" });
            return;
        }

        const votingManager = getAdminVotingManager();
        const tx = await votingManager.setVotingDuration(BigInt(Math.floor(duration)), GAS);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
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
        const tx = await votingManager.deleteProposal(proposalId, GAS);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error("DELETE /admin/proposal error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

router.post("/proposal/:id/resolve", async (req: Request, res: Response) => {
    try {
        const proposalId = Number(req.params.id);
        if (isNaN(proposalId) || proposalId < 0) {
            res.status(400).json({ error: "Invalid proposal ID" });
            return;
        }

        const votingManager = getAdminVotingManager();
        const tx = await votingManager.resolveProposal(proposalId, GAS);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error("POST /admin/proposal/resolve error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

// ── Staking Management ─────────────────────────────────────

router.put("/min-stake", async (req: Request, res: Response) => {
    try {
        const { amount } = req.body;
        if (!amount || Number(amount) <= 0) {
            res.status(400).json({ error: "amount must be a positive number (HRN)" });
            return;
        }

        const stakingManager = getAdminStakingManager();
        const amountWei = ethers.parseEther(String(amount));
        const tx = await stakingManager.setMinStake(amountWei, GAS);
        await tx.wait();

        res.json({ success: true, txHash: tx.hash });
    } catch (err) {
        console.error("PUT /admin/min-stake error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

export default router;
