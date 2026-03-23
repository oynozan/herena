"use client";

import { useState, useMemo, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

import ProofWrapper from "./ProofWrapper";
import Pagination from "@/components/Table/Pagination";
import { fetchUserProofs } from "@/lib/api";
import type { UserProof } from "@/lib/types";

const PER_PAGE = 5;

export default function UserProofsTable() {
    const { user } = usePrivy();
    const [pendingPage, setPendingPage] = useState(1);
    const [resolvedPage, setResolvedPage] = useState(1);
    const [proofs, setProofs] = useState<UserProof[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const wallet = user?.wallet?.address;
            if (!wallet) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const res = await fetchUserProofs(wallet);
                setProofs(res.proofs.filter(p => p.task !== null));
            } catch (err) {
                console.error("Failed to fetch user proofs:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user?.wallet?.address]);

    const pendingProofs = useMemo(
        () => proofs.filter(p => p.status === "pending"),
        [proofs],
    );
    const resolvedProofs = useMemo(
        () => proofs.filter(p => p.status === "approved" || p.status === "rejected"),
        [proofs],
    );

    const pendingTotalPages = Math.max(1, Math.ceil(pendingProofs.length / PER_PAGE));
    const pendingCurrentPage = Math.min(pendingPage, pendingTotalPages);
    const paginatedPending = pendingProofs.slice(
        (pendingCurrentPage - 1) * PER_PAGE,
        pendingCurrentPage * PER_PAGE,
    );

    const resolvedTotalPages = Math.max(1, Math.ceil(resolvedProofs.length / PER_PAGE));
    const resolvedCurrentPage = Math.min(resolvedPage, resolvedTotalPages);
    const paginatedResolved = resolvedProofs.slice(
        (resolvedCurrentPage - 1) * PER_PAGE,
        resolvedCurrentPage * PER_PAGE,
    );

    if (loading) {
        return <p className="text-second-foreground text-center text-sm py-8">Loading your proofs...</p>;
    }

    return (
        <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-2">
            {proofs.length === 0 ? (
                <p className="px-4 text-second-foreground text-center text-sm pb-4 pt-8">
                    You haven&apos;t submitted any proofs yet.
                </p>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b py-3 px-4 rounded-t-xl">
                        <h2 className="text-xl">Pending Verification</h2>
                        <span className="text-sm text-foreground/70 font-medium">
                            ({pendingProofs.length})
                        </span>
                    </div>
                    {pendingProofs.length === 0 ? (
                        <p className="text-second-foreground text-center text-sm py-4">
                            No pending proofs
                        </p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2 mt-2 px-4">
                                {paginatedPending.map(proof => (
                                    <ProofWrapper key={proof.id} proof={proof} />
                                ))}
                            </div>
                            <Pagination
                                currentPage={pendingCurrentPage}
                                totalPages={pendingTotalPages}
                                totalItems={pendingProofs.length}
                                perPage={PER_PAGE}
                                label="proofs"
                                onPageChange={setPendingPage}
                            />
                        </>
                    )}

                    <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b border-t py-3 px-4 text-xl !mt-2">
                        <h2 className="text-xl">Resolved</h2>
                        <span className="text-sm text-foreground/70 font-medium">
                            ({resolvedProofs.length})
                        </span>
                    </div>
                    {resolvedProofs.length === 0 ? (
                        <p className="text-second-foreground text-center text-sm py-4">
                            No resolved proofs yet
                        </p>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2 mt-2 px-4">
                                {paginatedResolved.map(proof => (
                                    <ProofWrapper key={proof.id} proof={proof} />
                                ))}
                            </div>
                            <Pagination
                                currentPage={resolvedCurrentPage}
                                totalPages={resolvedTotalPages}
                                totalItems={resolvedProofs.length}
                                perPage={PER_PAGE}
                                label="proofs"
                                onPageChange={setResolvedPage}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
}
