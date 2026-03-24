import { Router } from "express";
import type { Request, Response } from "express";

import Task from "../../../models/Task";
import Proof from "../../../models/Proof";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
    try {
        const {
            search,
            category,
            minReward,
            maxReward,
            status,
            page = "1",
            limit = "10",
        } = req.query;

        const filter: Record<string, any> = {};

        if (status) {
            filter.status = status;
        }

        if (category) {
            filter.category = category;
        }

        if (search) {
            const q = String(search);
            filter.$or = [
                { title: { $regex: q, $options: "i" } },
                { description: { $regex: q, $options: "i" } },
            ];
        }

        if (minReward || maxReward) {
            filter.reward = {};
            if (minReward) filter.reward.$gte = Number(minReward);
            if (maxReward) filter.reward.$lte = Number(maxReward);
        }

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [tasks, total] = await Promise.all([
            Task.find(filter).sort({ taskId: -1 }).skip(skip).limit(limitNum).lean(),
            Task.countDocuments(filter),
        ]);

        res.json({
            tasks: tasks.map(t => ({
                id: String(t.taskId),
                title: t.title,
                description: t.description,
                category: t.category,
                reward: t.reward,
                proofType: t.proofType,
                status: t.status,
                deadline: t.deadline.toISOString().split("T")[0],
                participants: t.participants,
                maxParticipants: t.maxParticipants,
                completedCount: t.completedCount,
                createdAt: t.createdAt.toISOString().split("T")[0],
                metadataURI: t.metadataURI || null,
                txHash: t.txHash || null,
            })),
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("GET /tasks error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/:id/proofs", async (req: Request, res: Response) => {
    try {
        const taskId = Number(req.params.id);
        const { page = "1", limit = "10" } = req.query;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.min(100, Math.max(1, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [proofs, total] = await Promise.all([
            Proof.find({ taskId })
                .sort({ proofId: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Proof.countDocuments({ taskId }),
        ]);

        res.json({
            proofs: proofs.map(p => ({
                proofId: p.proofId,
                submitter: p.submitter,
                proofURI: p.proofURI,
                timestamp: p.timestamp.toISOString(),
                resolved: p.resolved,
                txHash: p.txHash || null,
                resolveTxHash: p.resolveTxHash || null,
            })),
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("GET /tasks/:id/proofs error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
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
            deadline: task.deadline.toISOString().split("T")[0],
            participants: task.participants,
            maxParticipants: task.maxParticipants,
            completedCount: task.completedCount,
            createdAt: task.createdAt.toISOString().split("T")[0],
            metadataURI: task.metadataURI || null,
            txHash: task.txHash || null,
        });
    } catch (err) {
        console.error("GET /tasks/:id error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
