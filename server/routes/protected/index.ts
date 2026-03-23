import { Router } from "express";

/* Routes */
import Ping from "./ping";
import Admin from "./admin";
import Ipfs from "./ipfs";

const router = Router();

router.use("/ping", Ping);
router.use("/admin", Admin);
router.use("/ipfs", Ipfs);

export default router;
