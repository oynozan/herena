import { Router } from "express";
import type { Request, Response } from "express";

import { addJson } from "../../lib/heliProof";

const router = Router();

router.post("/upload", async (req: Request, res: Response) => {
    try {
        const { content } = req.body;
        if (!content) {
            res.status(400).json({ error: "content is required" });
            return;
        }

        // If content is a string, wrap it in the TipTap envelope as a paragraph
        let payload: object;
        if (typeof content === "string") {
            payload = {
                v: 1,
                tiptap: {
                    type: "doc",
                    content: content.split("\n").filter(Boolean).map(line => ({
                        type: "paragraph",
                        content: [{ type: "text", text: line }],
                    })),
                },
            };
        } else if (typeof content === "object") {
            // Assume it's already a TipTap JSON document or envelope
            payload = content.v && content.tiptap ? content : { v: 1, tiptap: content };
        } else {
            res.status(400).json({ error: "content must be a string or object" });
            return;
        }

        const cid = await addJson(payload);
        res.json({ uri: `ipfs://${cid}` });
    } catch (err) {
        console.error("POST /ipfs/upload error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

export default router;
