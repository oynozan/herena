"use client";

import { useState, useMemo } from "react";

import ProposalWrapper from "./ProposalWrapper";
import Pagination from "@/components/Table/Pagination";
import { mockProposals } from "@/lib/mock-data";

const PER_PAGE = 5;

export default function GovernanceTable() {
    const [activePage, setActivePage] = useState(1);
    const [pastPage, setPastPage] = useState(1);

    const activeProposals = useMemo(() => mockProposals.filter(p => p.status === "active"), []);
    const pastProposals = useMemo(() => mockProposals.filter(p => p.status !== "active"), []);

    const activeTotalPages = Math.max(1, Math.ceil(activeProposals.length / PER_PAGE));
    const activeCurrentPage = Math.min(activePage, activeTotalPages);
    const paginatedActive = activeProposals.slice(
        (activeCurrentPage - 1) * PER_PAGE,
        activeCurrentPage * PER_PAGE,
    );

    const pastTotalPages = Math.max(1, Math.ceil(pastProposals.length / PER_PAGE));
    const pastCurrentPage = Math.min(pastPage, pastTotalPages);
    const paginatedPast = pastProposals.slice(
        (pastCurrentPage - 1) * PER_PAGE,
        pastCurrentPage * PER_PAGE,
    );

    return (
        <div className="w-full flex flex-col gap-4">
            <div className="w-full pb-4 border border-border rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b py-3 px-4 rounded-t-xl">
                    <h2 className="text-xl">Active Proposals</h2>
                    <span className="text-sm text-foreground/70 font-medium">
                        ({activeProposals.length})
                    </span>
                </div>
                {activeProposals.length === 0 ? (
                    <p className="text-second-foreground text-center text-sm py-4">
                        No active proposals at the moment.
                    </p>
                ) : (
                    <>
                        <div className="flex flex-col gap-2 mt-2 px-4">
                            {paginatedActive.map(proposal => (
                                <ProposalWrapper key={proposal.id} proposal={proposal} />
                            ))}
                        </div>
                        <Pagination
                            currentPage={activeCurrentPage}
                            totalPages={activeTotalPages}
                            totalItems={activeProposals.length}
                            perPage={PER_PAGE}
                            label="proposals"
                            onPageChange={setActivePage}
                        />
                    </>
                )}

                <div className="flex items-center justify-between gap-2 bg-primary/5 border-border border-b border-t py-3 px-4 !mt-2">
                    <h2 className="text-xl">Past Proposals</h2>
                    <span className="text-sm text-foreground/70 font-medium">
                        ({pastProposals.length})
                    </span>
                </div>
                {pastProposals.length === 0 ? (
                    <p className="text-second-foreground text-center text-sm py-4">
                        No past proposals.
                    </p>
                ) : (
                    <>
                        <div className="flex flex-col gap-2 mt-2 px-4">
                            {paginatedPast.map(proposal => (
                                <ProposalWrapper key={proposal.id} proposal={proposal} />
                            ))}
                        </div>
                        <Pagination
                            currentPage={pastCurrentPage}
                            totalPages={pastTotalPages}
                            totalItems={pastProposals.length}
                            perPage={PER_PAGE}
                            label="proposals"
                            onPageChange={setPastPage}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
