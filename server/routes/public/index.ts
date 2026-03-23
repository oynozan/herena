import { Router, type Request, type Response } from "express";

/* Routes */
import Ping from "./ping";
import Config from "./config";
import Tasks from "./tasks";
import Proposals from "./proposals";
import UserRoutes from "./user";
import Swap from "./swap";
import ProofArtifacts from "./proofArtifacts";
import Agentic from "./agentic";
import Stats from "./stats";
import Leaderboard from "./leaderboard";
import Admin from "./admin";
import { pollEvents } from "../../lib/eventSync";

const router = Router();

router.use("/ping", Ping);
router.use("/config", Config);
router.use("/tasks", Tasks);
router.use("/proposals", Proposals);
router.use("/user", UserRoutes);
router.use("/swap", Swap);
router.use("/proof-artifacts", ProofArtifacts);
router.use("/agentic", Agentic);
router.use("/stats", Stats);
router.use("/leaderboard", Leaderboard);
router.use("/admin", Admin);

// Trigger immediate event sync (call after on-chain tx to update DB faster)
router.post("/events/sync", async (_req: Request, res: Response) => {
    try {
        await pollEvents();
        res.json({ synced: true });
    } catch (err) {
        console.error("POST /events/sync error:", err);
        res.status(500).json({ error: "Sync failed" });
    }
});

export default router;
