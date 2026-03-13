"use client";

import { useState, useMemo } from "react";

import Pagination from "@/components/Table/Pagination";
import { mockProposals } from "@/lib/mock-data";

const statusColors: Record<string, string> = {
    active: "bg-primary/15 text-primary",
    passed: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    expired: "bg-muted text-muted-foreground",
};

const PER_PAGE = 5;

export default function VotesTable() {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(mockProposals.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const paginated = useMemo(
        () => mockProposals.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
        [currentPage],
    );

    return (
        <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-2">
            {mockProposals.length === 0 ? (
                <p className="px-4 text-second-foreground text-center text-sm pb-4 pt-8">
                    You haven&apos;t voted on any proposals yet.
                </p>
            ) : (
                <>
                    <div className="flex flex-col gap-2 py-4 px-4">
                        {paginated.map(proposal => (
                            <div
                                key={proposal.id}
                                className="border border-border rounded-xl p-4 hover:bg-primary/3 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-semibold">{proposal.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {proposal.description}
                                        </p>
                                    </div>
                                    <span
                                        className={
                                            "font-medium px-4 py-2 rounded-full text-sm capitalize whitespace-nowrap " +
                                            (statusColors[proposal.status] || "")
                                        }
                                    >
                                        {proposal.status}
                                    </span>
                                </div>
                                <div className="flex gap-6 mt-3">
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
                                    <div>
                                        <p className="text-xs text-muted-foreground">Voting Ends</p>
                                        <p className="font-semibold">{proposal.votingEnds}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={mockProposals.length}
                        perPage={PER_PAGE}
                        label="votes"
                        onPageChange={setPage}
                    />
                </>
            )}
        </div>
    );
}
