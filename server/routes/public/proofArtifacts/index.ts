import { Router, type Request, type Response } from "express";
import multer from "multer";

import { authRequired } from "../../middleware";
import { addBytes, addJson } from "../../../lib/heliProof";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const videoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.post("/image", authRequired, upload.single("file"), async (req: Request, res: Response) => {
    try {
        console.log("[proof-artifacts/image] request received");
        const wallet = req.user && "wallet" in req.user ? req.user.wallet?.toLowerCase() : null;
        console.log("[proof-artifacts/image] wallet", wallet);
        if (!wallet) {
            console.log("[proof-artifacts/image] no wallet, 400");
            res.status(400).json({ error: "Wallet address required" });
            return;
        }
        const file = req.file;
        console.log("[proof-artifacts/image] file", !!file, file?.size);
        if (!file || !file.buffer) {
            console.log("[proof-artifacts/image] no file/buffer, 400");
            res.status(400).json({ error: "No image file provided" });
            return;
        }
        console.log("[proof-artifacts/image] calling addBytes");
        const cid = await addBytes(file.buffer);
        console.log("[proof-artifacts/image] cid", cid);
        res.json({ cid });
    } catch (err) {
        console.error("[proof-artifacts/image] error:", err);
        res.status(500).json({ error: "Failed to add image to IPFS" });
    }
});

router.post("/video", authRequired, videoUpload.single("file"), async (req: Request, res: Response) => {
    try {
        const wallet = req.user && "wallet" in req.user ? req.user.wallet?.toLowerCase() : null;
        if (!wallet) {
            res.status(400).json({ error: "Wallet address required" });
            return;
        }
        const file = req.file;
        if (!file || !file.buffer) {
            res.status(400).json({ error: "No video file provided" });
            return;
        }
        if (!file.mimetype.startsWith("video/")) {
            res.status(400).json({ error: "File must be a video" });
            return;
        }
        console.log(`[proof-artifacts/video] uploading ${file.size} bytes from ${wallet}`);
        const cid = await addBytes(file.buffer);
        console.log(`[proof-artifacts/video] cid ${cid}`);
        res.json({ cid });
    } catch (err) {
        console.error("[proof-artifacts/video] error:", err);
        res.status(500).json({ error: "Failed to add video to IPFS" });
    }
});

router.post("/", authRequired, async (req: Request, res: Response) => {
    try {
        console.log("[proof-artifacts] request received");
        const wallet = req.user && "wallet" in req.user ? req.user.wallet?.toLowerCase() : null;
        console.log("[proof-artifacts] wallet", wallet);
        if (!wallet) {
            console.log("[proof-artifacts] no wallet, 400");
            res.status(400).json({ error: "Wallet address required" });
            return;
        }
        const payload = req.body.payload;
        console.log("[proof-artifacts] payload", !!payload, typeof payload);
        if (!payload || typeof payload !== "object") {
            console.log("[proof-artifacts] invalid payload, 400");
            res.status(400).json({ error: "Invalid payload: expected TipTap JSON wrapper" });
            return;
        }
        console.log("[proof-artifacts] calling addJson");
        const cid = await addJson(payload);
        const uri = `ipfs://${cid}`;
        console.log("[proof-artifacts] uri", uri);
        res.json({ uri });
    } catch (err) {
        console.error("[proof-artifacts] error:", err);
        res.status(500).json({ error: "Failed to add proof to IPFS" });
    }
});

export default router;
