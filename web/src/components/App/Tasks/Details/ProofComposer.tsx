"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Video from "@/lib/tiptap-video";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import type { Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { submitTaskProofWithPrivy } from "@/lib/proofContract";
import { uploadProofImage, uploadProofVideo, uploadProofArtifact, triggerSync } from "@/lib/api";
import {
    ImageIcon,
    Video as VideoIcon,
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading2,
    Quote,
    Undo,
    Redo,
} from "lucide-react";

const extensions = [
    StarterKit,
    Image.configure({
        resize: {
            enabled: true,
            directions: ["top", "bottom", "left", "right"],
            minWidth: 50,
            minHeight: 50,
            alwaysPreserveAspectRatio: true,
        },
    }),
    Video,
    Placeholder.configure({ placeholder: "Write your proof and add images or videos..." }),
];

interface ProofComposerProps {
    task: Task;
    wallet: {
        address: string;
        getEthereumProvider: () => Promise<unknown>;
        switchChain?: (chainId: number) => Promise<void>;
    };
    onSuccess: () => void;
}

export default function ProofComposer({ task, wallet, onSuccess }: ProofComposerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        extensions,
        content: "",
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-[240px] px-3 py-2 focus:outline-none",
            },
        },
    });

    const handleImageUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleVideoUpload = useCallback(() => {
        videoInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
            }
            if (!editor) return;
            setUploading(true);
            try {
                const { cid } = await uploadProofImage(file);
                const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
                const src = gateway ? `${gateway.replace(/\/$/, "")}/${cid}` : `ipfs://${cid}`;
                editor.chain().focus().setImage({ src }).run();
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to upload image");
            } finally {
                setUploading(false);
                e.target.value = "";
            }
        },
        [editor],
    );

    const handleVideoChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith("video/")) {
                toast.error("Please select a video file");
                return;
            }
            if (!editor) return;
            setUploading(true);
            try {
                const { cid } = await uploadProofVideo(file);
                const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
                const src = gateway ? `${gateway.replace(/\/$/, "")}/${cid}` : `ipfs://${cid}`;
                editor.chain().focus().setVideo({ src }).run();
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to upload video");
            } finally {
                setUploading(false);
                e.target.value = "";
            }
        },
        [editor],
    );

    const handleSubmit = useCallback(async () => {
        if (!editor || !wallet) return;

        const json = editor.getJSON();
        if (!json.content?.length) {
            toast.error("Please add some content to your proof");
            return;
        }

        setSubmitting(true);

        try {
            const { uri } = await uploadProofArtifact({ v: 1, tiptap: json });

            await submitTaskProofWithPrivy(wallet, {
                taskId: task.id,
                proofUrl: uri,
            });

            toast.success("Proof submitted for verification!");
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            editor.commands.clearContent();

            // Trigger server event sync so the new proof appears immediately
            await triggerSync(() => Promise.resolve(true));
            onSuccess();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to submit proof");
        } finally {
            setSubmitting(false);
        }
    }, [editor, task, wallet, onSuccess]);

    if (!editor) return null;

    return (
        <div className="border border-border rounded-lg bg-background">
            <div className="flex flex-wrap gap-1 p-2 border-b border-border">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive("bold") ? "bg-muted" : ""}
                >
                    <Bold className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive("italic") ? "bg-muted" : ""}
                >
                    <Italic className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive("heading", { level: 2 }) ? "bg-muted" : ""}
                >
                    <Heading2 className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive("bulletList") ? "bg-muted" : ""}
                >
                    <List className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive("orderedList") ? "bg-muted" : ""}
                >
                    <ListOrdered className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={editor.isActive("blockquote") ? "bg-muted" : ""}
                >
                    <Quote className="w-4 h-4" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleImageUpload}
                    disabled={uploading}
                >
                    <ImageIcon className="w-4 h-4" />
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleVideoUpload}
                    disabled={uploading}
                >
                    <VideoIcon className="w-4 h-4" />
                </Button>
                <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoChange}
                />
                <div className="w-px bg-border mx-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo className="w-4 h-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo className="w-4 h-4" />
                </Button>
            </div>
            <EditorContent editor={editor} />
            {uploading && (
                <p className="text-xs text-muted-foreground px-3 py-1">
                    Uploading to IPFS...
                </p>
            )}
            <div className="p-2 border-t border-border">
                <Button onClick={handleSubmit} disabled={submitting || uploading}>
                    {submitting ? "Submitting..." : "Submit Proof"}
                </Button>
            </div>
        </div>
    );
}
