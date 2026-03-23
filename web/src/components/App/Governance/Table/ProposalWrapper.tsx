import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Proposal } from "@/lib/types";

const statusColors: Record<string, string> = {
    active: "bg-primary/15 text-primary",
    passed: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    expired: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
    task_verification: "Task Verification",
    parameter_change: "Parameter Change",
};

export default function ProposalWrapper({ proposal }: { proposal: Proposal }) {
    return (
        <div className="w-full">
            <Link
                href={`/governance/${proposal.id}`}
                className="block border border-border hover:bg-primary/3 transition-all duration-200 rounded-xl"
            >
                <div className="group flex justify-between py-6 px-4">
                    <div>
                        <h3 className="text-2xl font-semibold group-hover:text-primary transition-colors">
                            {proposal.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium bg-accent px-3 py-1 rounded-full">
                                {typeLabels[proposal.type] || proposal.type}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                Ends {proposal.votingEnds}
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-end items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span
                                className={
                                    "font-medium px-4 py-2 rounded-full text-sm capitalize " +
                                    (statusColors[proposal.status] || "")
                                }
                            >
                                {proposal.status}
                            </span>
                            <div className="flex items-center gap-1 text-sm">
                                <span className="text-success font-medium">
                                    {Math.round(proposal.yesVotes)}
                                </span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-destructive font-medium">
                                    {Math.round(proposal.noVotes)}
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </div>
            </Link>
        </div>
    );
}
