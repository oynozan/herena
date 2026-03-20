"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

import { fetchTaskProofs } from "@/lib/api";
import type { TaskProof } from "@/lib/types";

const extensions = [StarterKit, Image];

function transformIpfsSrcs(doc: object): object {
    const visit = (node: any): any => {
        if (!node) return node;
        if (node.type === "image" && node.attrs?.src?.startsWith("ipfs://")) {
            const cid = node.attrs.src.replace("ipfs://", "");
            return {
                ...node,
                attrs: { ...node.attrs, src: `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/${cid}` },
            };
        }
        if (node.content) {
            return { ...node, content: node.content.map(visit) };
        }
        return node;
    };
    return visit(doc);
}

function resolveProofUrl(uri: string): string {
    if (uri.startsWith("ipfs://")) {
        const cid = uri.replace("ipfs://", "");
        return `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/${cid}`;
    }
    return uri;
}

function ProofCard({ proof }: { proof: TaskProof }) {
    const [content, setContent] = useState<object | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const url = resolveProofUrl(proof.proofURI);
        fetch(url)
            .then(res => res.json())
            .then(data => {
                const doc = transformIpfsSrcs(data?.v === 1 && data?.tiptap ? data.tiptap : data);
                setContent(doc);
            })
            .catch(() => setError(true));
    }, [proof.proofURI]);

    const editor = useEditor({
        extensions,
        content: content ?? "",
        editable: false,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-0",
            },
        },
    });

    useEffect(() => {
        if (content && editor) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const shortAddr = `${proof.submitter.slice(0, 6)}...${proof.submitter.slice(-4)}`;
    const date = new Date(proof.timestamp).toLocaleString();

    if (error) {
        return (
            <div className="border border-border rounded-lg p-4 bg-background">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>{shortAddr}</span>
                    <span>{date}</span>
                </div>
                <a
                    href={resolveProofUrl(proof.proofURI)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    Open proof link
                </a>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="border border-border rounded-lg p-4 bg-background animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-full" />
            </div>
        );
    }

    return (
        <div className="border border-border rounded-lg p-4 bg-background">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{shortAddr}</span>
                <span>{date}</span>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

interface ProofForumProps {
    taskId: string;
    refreshKey?: number;
}

export default function ProofForum({ taskId, refreshKey }: ProofForumProps) {
    const [proofs, setProofs] = useState<TaskProof[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchTaskProofs(taskId)
            .then(res => setProofs(res.proofs))
            .catch(() => setProofs([]))
            .finally(() => setLoading(false));
    }, [taskId, refreshKey]);

    if (loading) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Submissions</h3>
                <div className="h-20 bg-muted rounded animate-pulse" />
            </div>
        );
    }

    if (proofs.length === 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Submissions</h3>
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Submissions</h3>
            <div className="space-y-4">
                {proofs.map(p => (
                    <ProofCard key={p.proofId} proof={p} />
                ))}
            </div>
        </div>
    );
}
