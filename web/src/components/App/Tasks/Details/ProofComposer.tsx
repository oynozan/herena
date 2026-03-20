"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { uploadProofImage, uploadProofArtifact } from "@/lib/api";
import { submitTaskProofWithPrivy } from "@/lib/proofContract";
import type { Task } from "@/lib/types";

const extensions = [
    StarterKit,
    Image,
    Placeholder.configure({ placeholder: "Write your proof and add images..." }),
];

interface ProofComposerProps {
    task: Task;
    wallet: { address: string; getEthereumProvider: () => Promise<unknown>; switchChain?: (chainId: number) => Promise<void> };
    onSuccess: () => void;
}

export default function ProofComposer({ task, wallet, onSuccess }: ProofComposerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        extensions,
        content: "",
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-[120px] px-3 py-2 focus:outline-none",
            },
        },
    });

    const handleImageUpload = useCallback(async () => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            console.log("[ProofComposer] handleFileChange: file", file?.name);
            if (!file || !file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
            }
            if (!editor) return;
            setUploading(true);
            try {
                console.log("[ProofComposer] handleFileChange: calling uploadProofImage");
                const { cid } = await uploadProofImage(file);
                console.log("[ProofComposer] handleFileChange: cid", cid);
                const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
                const src = gateway ? `${gateway.replace(/\/$/, "")}/ipfs/${cid}` : `ipfs://${cid}`;
                console.log("[ProofComposer] handleFileChange: image src", src);
                editor.chain().focus().setImage({ src }).run();
            } catch (err) {
                console.error("[ProofComposer] handleFileChange: error", err);
                toast.error(err instanceof Error ? err.message : "Failed to upload image");
            } finally {
                setUploading(false);
                e.target.value = "";
            }
        },
        [editor],
    );

    const handleSubmit = useCallback(async () => {
        if (!editor || !wallet) {
            console.log("[ProofComposer] handleSubmit: missing editor or wallet", !!editor, !!wallet);
            return;
        }
        const json = editor.getJSON();
        if (!json.content?.length) {
            toast.error("Please add some content to your proof");
            return;
        }
        console.log("[ProofComposer] handleSubmit: starting", { taskId: task.id });
        setSubmitting(true);
        try {
            console.log("[ProofComposer] handleSubmit: calling uploadProofArtifact");
            const { uri } = await uploadProofArtifact({ v: 1, tiptap: json });
            console.log("[ProofComposer] handleSubmit: uri", uri);
            console.log("[ProofComposer] handleSubmit: calling submitTaskProofWithPrivy");
            await submitTaskProofWithPrivy(wallet, {
                taskId: task.id,
                proofUrl: uri,
            });
            console.log("[ProofComposer] handleSubmit: success");
            toast.success("Proof submitted for verification!");
            editor.commands.clearContent();
            onSuccess();
        } catch (err) {
            console.error("[ProofComposer] handleSubmit: error", err);
            toast.error(err instanceof Error ? err.message : "Failed to submit proof");
        } finally {
            setSubmitting(false);
        }
    }, [editor, task, wallet, onSuccess]);

    if (!editor) return null;

    return (
        <div className="border border-border rounded-lg bg-background">
            <div className="flex gap-1 p-2 border-b border-border">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleImageUpload}
                    disabled={uploading}
                >
                    {uploading ? "Uploading..." : "Add image"}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
            <EditorContent editor={editor} />
            <div className="p-2 border-t border-border">
                <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Proof"}
                </Button>
            </div>
        </div>
    );
}
