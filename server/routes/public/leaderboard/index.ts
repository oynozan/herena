import { Router } from "express";
import type { Request, Response } from "express";

import UserTask from "../../../models/UserTask";
import Vote from "../../../models/Vote";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        const [volunteers, verifiers] = await Promise.all([
            UserTask.aggregate([
                { $match: { status: "approved" } },
                {
                    $group: {
                        _id: "$user",
                        completedTasks: { $sum: 1 },
                        totalEarned: { $sum: "$earnedRN" },
                    },
                },
                { $sort: { completedTasks: -1 } },
                { $limit: 10 },
            ]),
            Vote.aggregate([
                {
                    $group: {
                        _id: "$voter",
                        votesCast: { $sum: 1 },
                    },
                },
                { $sort: { votesCast: -1 } },
                { $limit: 10 },
            ]),
        ]);

        res.json({
            volunteers: volunteers.map((v: any) => ({
                address: v._id,
                completedTasks: v.completedTasks,
                totalEarned: v.totalEarned,
            })),
            verifiers: verifiers.map((v: any) => ({
                address: v._id,
                votesCast: v.votesCast,
            })),
        });
    } catch (err) {
        console.error("GET /leaderboard error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
