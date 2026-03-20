import { Router } from "express";

/* Routes */
import Ping from "./ping";
import Config from "./config";
import Tasks from "./tasks";
import Proposals from "./proposals";
import UserRoutes from "./user";
import Swap from "./swap";
import ProofArtifacts from "./proofArtifacts";

const router = Router();

router.use("/ping", Ping);
router.use("/config", Config);
router.use("/tasks", Tasks);
router.use("/proposals", Proposals);
router.use("/user", UserRoutes);
router.use("/swap", Swap);
router.use("/proof-artifacts", ProofArtifacts);

export default router;
