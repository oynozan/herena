import { Router } from "express";
import type { Request, Response } from "express";

import Task from "../../../models/Task";
import UserTask from "../../../models/UserTask";
import Proof from "../../../models/Proof";
import Vote from "../../../models/Vote";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        const [
            taskStats,
            proofOutcomes,
            hrnStats,
            volunteers,
            voteCount,
            categoryBreakdown,
            timeline,
            totalProofs,
        ] = await Promise.all([
            Task.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                    },
                },
            ]),
            UserTask.aggregate([
                { $match: { status: { $in: ["approved", "rejected"] } } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            UserTask.aggregate([
                { $match: { status: "approved" } },
                { $group: { _id: null, totalHRN: { $sum: "$earnedRN" } } },
            ]),
            Proof.distinct("submitter"),
            Vote.countDocuments(),
            Task.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } },
            ]),
            UserTask.aggregate([
                { $match: { status: "approved", submittedAt: { $ne: null } } },
                {
                    $group: {
                        _id: {
                            year: { $year: "$submittedAt" },
                            month: { $month: "$submittedAt" },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } },
            ]),
            Proof.countDocuments(),
        ]);

        const ts = taskStats[0] || { total: 0, active: 0, completed: 0 };
        const outcomeMap = Object.fromEntries(
            proofOutcomes.map((o: any) => [o._id, o.count]),
        );

        res.json({
            totalTasks: ts.total,
            activeTasks: ts.active,
            completedTasks: ts.completed,
            totalProofs,
            approvedProofs: outcomeMap.approved || 0,
            rejectedProofs: outcomeMap.rejected || 0,
            totalHRN: hrnStats[0]?.totalHRN || 0,
            uniqueVolunteers: volunteers.length,
            totalVotes: voteCount,
            categories: categoryBreakdown.map((c: any) => ({
                category: c._id,
                count: c.count,
            })),
            timeline: timeline.map((t: any) => ({
                month: `${t._id.year}-${String(t._id.month).padStart(2, "0")}`,
                count: t.count,
            })),
        });
    } catch (err) {
        console.error("GET /stats error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
