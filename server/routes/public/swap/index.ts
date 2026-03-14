import { Router } from "express";
import type { Request, Response } from "express";
import { ethers } from "ethers";

import { getSwapPool, getHerenaToken } from "../../../lib/contracts";

const router = Router();

router.get("/pool-info", async (_req: Request, res: Response) => {
    try {
        const swapPool = getSwapPool();
        const herenaToken = getHerenaToken();

        let hbarReserve = 0;
        let tokenReserve = 0;

        try {
            const hbarBal = await swapPool.getHBARBalance();
            const tokenBal = await herenaToken.balanceOf(await swapPool.getAddress());
            hbarReserve = Number(ethers.formatEther(hbarBal));
            tokenReserve = Number(ethers.formatEther(tokenBal));
        } catch {
            // Contract not deployed or not accessible
        }

        const rate = hbarReserve > 0 ? tokenReserve / hbarReserve : 0;
        const fee = 0.3;

        res.json({
            hbarReserve,
            tokenReserve,
            rate,
            fee,
        });
    } catch (err) {
        console.error("GET /swap/pool-info error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
