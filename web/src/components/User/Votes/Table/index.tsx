"use client";

import { useState, useMemo, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

import Pagination from "@/components/Table/Pagination";
import { fetchUserVotes, type UserVote } from "@/lib/api";

const statusColors: Record<string, string> = {
    active: "bg-primary/15 text-primary",
    passed: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    expired: "bg-muted text-muted-foreground",
};

const PER_PAGE = 5;

export default function VotesTable() {
    const { user } = usePrivy();
    const [page, setPage] = useState(1);
    const [votes, setVotes] = useState<UserVote[]>([]);
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
                const res = await fetchUserVotes(wallet);
                setVotes(res.votes.filter(v => v.proposal !== null));
            } catch (err) {
                console.error("Failed to fetch votes:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user?.wallet?.address]);

    const totalPages = Math.max(1, Math.ceil(votes.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const paginated = useMemo(
        () => votes.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
        [currentPage, votes],
    );

    if (loading) {
        return <p className="text-second-foreground text-center text-sm py-8">Loading your votes...</p>;
    }

    return (
        <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-2">
            {votes.length === 0 ? (
                <p className="px-4 text-second-foreground text-center text-sm pb-4 pt-8">
                    You haven&apos;t voted on any proposals yet.
                </p>
            ) : (
                <>
                    <div className="flex flex-col gap-2 py-4 px-4">
                        {paginated.map(vote => {
                            const proposal = vote.proposal!;
                            return (
                                <div
                                    key={vote.id}
                                    className="border border-border rounded-xl p-4 hover:bg-primary/3 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <h3 className="text-lg font-semibold">
                                                {proposal.title}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {proposal.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={
                                                    "font-medium px-3 py-1.5 rounded-full text-xs whitespace-nowrap " +
                                                    (vote.approve
                                                        ? "bg-success/15 text-success"
                                                        : "bg-destructive/15 text-destructive")
                                                }
                                            >
                                                You voted {vote.approve ? "Yes" : "No"}
                                            </span>
                                            <span
                                                className={
                                                    "font-medium px-4 py-2 rounded-full text-sm capitalize whitespace-nowrap " +
                                                    (statusColors[proposal.status] || "")
                                                }
                                            >
                                                {proposal.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 mt-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Your Vote Power
                                            </p>
                                            <p className="font-semibold">{vote.votingPower}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Yes Votes</p>
                                            <p className="font-semibold text-success">
                                                {proposal.yesVotes}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">No Votes</p>
                                            <p className="font-semibold text-destructive">
                                                {proposal.noVotes}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Total Voters
                                            </p>
                                            <p className="font-semibold">{proposal.totalVoters}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={votes.length}
                        perPage={PER_PAGE}
                        label="votes"
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
}
