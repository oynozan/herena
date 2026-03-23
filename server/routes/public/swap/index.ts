import { Router } from "express";
import type { Request, Response } from "express";
import { ethers } from "ethers";

import { getSwapPool } from "../../../lib/contracts";

const router = Router();

router.get("/pool-info", async (_req: Request, res: Response) => {
    try {
        const swapPool = getSwapPool();
        if (!swapPool) {
            console.error("[swap/pool-info] swapPool contract not initialized");
            res.json({ hbarReserve: 0, tokenReserve: 0, rate: 0, fee: 0.3 });
            return;
        }

        let hbarReserve = 0;
        let tokenReserve = 0;

        try {
            const [hbarRaw, tokenRaw] = await Promise.all([
                swapPool.reserveHBAR(),
                swapPool.reserveToken(),
            ]);
            hbarReserve = Number(ethers.formatUnits(hbarRaw, 8));
            tokenReserve = Number(ethers.formatEther(tokenRaw));
            console.log("[swap/pool-info] reserves:", { hbarReserve, tokenReserve });
        } catch (contractErr) {
            console.error("[swap/pool-info] contract call failed:", contractErr);
        }

        const rate = hbarReserve > 0 ? tokenReserve / hbarReserve : 0;
        const fee = 0.3;

        console.log("[swap/pool-info] response:", { hbarReserve, tokenReserve, rate, fee });
        res.json({ hbarReserve, tokenReserve, rate, fee });
    } catch (err) {
        console.error("[swap/pool-info] error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
