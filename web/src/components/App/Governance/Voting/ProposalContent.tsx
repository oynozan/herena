"use client";

import { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Video from "@/lib/tiptap-video";

import type { Proposal } from "@/lib/types";
import { fetchProposal } from "@/lib/api";
import { resolveIpfsUrl, transformIpfsSrcs } from "@/lib/ipfs";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import VotingPanel from "./index";

const extensions = [
    StarterKit,
    TiptapImage.configure({
        resize: {
            enabled: true,
            directions: ["top", "bottom", "left", "right"],
            minWidth: 50,
            minHeight: 50,
            alwaysPreserveAspectRatio: true,
        },
    }),
    Video,
];

function ProofRenderer({ proofUrl }: { proofUrl: string }) {
    const [content, setContent] = useState<object | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const url = resolveIpfsUrl(proofUrl);
        fetch(url)
            .then(res => res.json())
            .then(data => {
                const tiptap = data?.v === 1 && data?.tiptap ? data.tiptap : data;
                // If tiptap has a nested tiptap field (task metadata format), use the inner one
                const doc = tiptap?.type === "doc" ? tiptap : (tiptap?.tiptap ?? tiptap);
                setContent(transformIpfsSrcs(doc));
            })
            .catch(() => setError(true));
    }, [proofUrl]);

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

    if (error) {
        return <p className="text-sm text-muted-foreground">Failed to load proof content.</p>;
    }

    if (!content) {
        return (
            <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
            </div>
        );
    }

    return <EditorContent editor={editor} />;
}

export default function ProposalContent({ proposal: initial }: { proposal: Proposal }) {
    const [proposal, setProposal] = useState(initial);

    const handleVoted = useCallback(async () => {
        try {
            const updated = await fetchProposal(String(proposal.id));
            if (updated) setProposal(updated);
        } catch {
            // silently ignore refresh failure
        }
    }, [proposal.id]);

    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const yesPercent = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 0;

    return (
        <div className="flex gap-4 w-full">
            <div className="w-2/3 flex flex-col gap-4 pl-6 py-6">
                <div>
                    <h3 className="text-lg font-semibold">Description</h3>
                    <p className="text-sm text-muted-foreground mt-2">{proposal.description}</p>
                </div>
                {proposal.taskProof && (
                    <div className="border border-border rounded-lg p-4 bg-background space-y-3">
                        <h4 className="font-semibold text-sm">Task Proof Details</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-xs text-muted-foreground">Task</p>
                                <p className="text-sm font-medium">
                                    {proposal.taskProof.taskId ? (
                                        <Link
                                            href={`/task/${proposal.taskProof.taskId}`}
                                            className="text-primary hover:underline"
                                        >
                                            {proposal.taskProof.taskTitle}
                                        </Link>
                                    ) : (
                                        proposal.taskProof.taskTitle
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Volunteer</p>
                                <p className="text-sm font-medium font-mono">
                                    {proposal.taskProof.volunteer}
                                </p>
                            </div>
                        </div>
                        {proposal.taskProof.proofUrl && (
                            <div>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Submitted Proof
                                </p>
                                <div className="border border-border rounded-lg p-4 bg-muted/30">
                                    <ProofRenderer proofUrl={proposal.taskProof.proofUrl} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div>
                    <h4 className="font-semibold text-sm mb-2">Voting Progress</h4>
                    <div className={`w-full ${proposal.noVotes === 0 ? "bg-border" : "bg-destructive"} rounded-full h-3 overflow-hidden`}>
                        <div
                            className="bg-primary h-3 rounded-full transition-all"
                            style={{ width: `${yesPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>
                            Yes: {Math.round(proposal.yesVotes)} votes ({yesPercent.toFixed(1)}%)
                        </span>
                        <span>
                            No: {Math.round(proposal.noVotes)} votes (
                            {(100 - yesPercent).toFixed(1)}%)
                        </span>
                    </div>
                </div>
                {(proposal.status === "passed" || proposal.status === "rejected") && proposal.resolveTxHash && (
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Resolution Transaction</h4>
                        <a
                            href={`https://hashscan.io/testnet/transaction/${proposal.resolveTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-mono"
                        >
                            {proposal.resolveTxHash.slice(0, 16)}...
                            <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-xs text-muted-foreground mt-1">
                            Verify reward distribution on HashScan
                        </p>
                    </div>
                )}
            </div>
            <div className="w-1/3">
                <VotingPanel proposal={proposal} onVoted={handleVoted} />
            </div>
        </div>
    );
}
