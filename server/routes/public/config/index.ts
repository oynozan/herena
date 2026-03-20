import { Router, type Request, type Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
    const gw = process.env.IPFS_GATEWAY?.replace(/\/$/, "") ?? "";
    res.json({ ipfsGateway: gw || null });
});

export default router;
