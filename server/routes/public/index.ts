import { Router } from "express";

/* Routes */
import Ping from "./ping";
import Tasks from "./tasks";
import Proposals from "./proposals";
import UserRoutes from "./user";
import Swap from "./swap";
import Agentic from "./agentic";

const router = Router();

router.use("/ping", Ping);
router.use("/tasks", Tasks);
router.use("/proposals", Proposals);
router.use("/user", UserRoutes);
router.use("/swap", Swap);
router.use("/agentic", Agentic);

export default router;
