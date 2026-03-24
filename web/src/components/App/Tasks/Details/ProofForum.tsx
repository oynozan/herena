"use client";

import { useEffect, useState } from "react";

import { fetchTaskProofs } from "@/lib/api";
import type { TaskProof } from "@/lib/types";
import { resolveIpfsUrl } from "@/lib/ipfs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const PAGE_SIZE = 10;

interface ProofForumProps {
    taskId: string;
    refreshKey?: number;
}

export default function ProofForum({ taskId, refreshKey }: ProofForumProps) {
    const [proofs, setProofs] = useState<TaskProof[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        setLoading(true);
        fetchTaskProofs(taskId, { page, limit: PAGE_SIZE })
            .then(res => {
                setProofs(res.proofs);
                setTotalPages(res.totalPages);
                setTotal(res.total);
            })
            .catch(() => setProofs([]))
            .finally(() => setLoading(false));
    }, [taskId, refreshKey, page]);

    // Reset to page 1 when new submission happens
    useEffect(() => {
        setPage(1);
    }, [refreshKey]);

    if (loading) {
        return <div className="h-20 bg-muted rounded animate-pulse" />;
    }

    if (total === 0) {
        return <p className="text-sm text-muted-foreground">No submissions yet.</p>;
    }

    return (
        <div className="space-y-3">
            <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="text-left px-4 py-2 font-medium">#</th>
                            <th className="text-left px-4 py-2 font-medium">Submitter</th>
                            <th className="text-left px-4 py-2 font-medium">Date</th>
                            <th className="text-left px-4 py-2 font-medium">Status</th>
                            <th className="text-left px-4 py-2 font-medium">Tx</th>
                            <th className="text-left px-4 py-2 font-medium">Resolve Tx</th>
                            <th className="text-right px-4 py-2 font-medium">Proof</th>
                        </tr>
                    </thead>
                    <tbody>
                        {proofs.map((p, i) => {
                            const shortAddr = `${p.submitter.slice(0, 6)}...${p.submitter.slice(-4)}`;
                            const date = new Date(p.timestamp).toLocaleDateString();

                            return (
                                <tr key={p.proofId} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                                    <td className="px-4 py-2 text-muted-foreground">
                                        {(page - 1) * PAGE_SIZE + i + 1}
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">{shortAddr}</td>
                                    <td className="px-4 py-2 text-muted-foreground">{date}</td>
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            p.resolved
                                                ? "bg-green-500/10 text-green-500"
                                                : "bg-yellow-500/10 text-yellow-500"
                                        }`}>
                                            {p.resolved ? "Resolved" : "Pending"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">
                                        {p.txHash ? (
                                            <a
                                                href={`https://hashscan.io/testnet/transaction/${p.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-mono"
                                            >
                                                {p.txHash.slice(0, 8)}... <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {p.resolveTxHash ? (
                                            <a
                                                href={`https://hashscan.io/testnet/transaction/${p.resolveTxHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-mono"
                                            >
                                                {p.resolveTxHash.slice(0, 8)}... <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <a
                                            href={resolveIpfsUrl(p.proofURI)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                                        >
                                            View <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {total} submission{total !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
