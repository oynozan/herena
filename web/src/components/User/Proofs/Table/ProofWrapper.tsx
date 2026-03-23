"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Clock, X } from "lucide-react";

import type { UserProof } from "@/lib/types";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
        label: "Pending Verification",
        className: "bg-gold/15 text-gold",
        icon: <Clock className="h-3 w-3" />,
    },
    approved: {
        label: "Approved",
        className: "bg-success/15 text-success",
        icon: <Check className="h-3 w-3" />,
    },
    rejected: {
        label: "Rejected",
        className: "bg-destructive/15 text-destructive",
        icon: <X className="h-3 w-3" />,
    },
};

export default function ProofWrapper({ proof }: { proof: UserProof }) {
    const [isOpen, setIsOpen] = useState(false);
    const config = statusConfig[proof.status] || statusConfig.pending;

    return (
        <div className="w-full">
            <div className="border border-border hover:bg-primary/3 transition-all duration-200 rounded-xl">
                <div
                    className="group flex justify-between py-6 px-4 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div>
                        <h3 className="text-2xl font-semibold group-hover:text-primary transition-colors">
                            {proof.task?.title ?? "Unknown Task"}
                        </h3>
                        <span className="text-sm text-muted-foreground capitalize">
                            {proof.task?.category}
                        </span>
                    </div>
                    <div className="flex-1 flex justify-end items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span
                                className={
                                    "font-medium px-4 py-2 rounded-full flex items-center gap-1.5 text-sm " +
                                    config.className
                                }
                            >
                                {config.icon}
                                {config.label}
                            </span>
                            {proof.earnedHRN > 0 && (
                                <span className="font-medium bg-primary/15 text-primary px-4 py-2 rounded-full text-sm">
                                    +{proof.earnedHRN} HRN
                                </span>
                            )}
                        </div>
                        <Button size="icon" variant="outline" aria-expanded={isOpen}>
                            <ChevronDown
                                className={`transition-transform duration-300 ${
                                    isOpen ? "rotate-180" : ""
                                }`}
                            />
                        </Button>
                    </div>
                </div>
                {isOpen && (
                    <div className="overflow-hidden border-border rounded-b-xl">
                        <div className="bg-background">
                            <div className="px-4 py-4 space-y-2 border-t border-border">
                                <h3>Proof Details</h3>
                                <div className="flex gap-4 mt-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Task Reward</p>
                                        <p className="font-semibold">{proof.task?.reward ?? "—"} HRN</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Submitted</p>
                                        <p className="font-semibold">{proof.submittedAt}</p>
                                    </div>
                                    {proof.proposal && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Voting Ends</p>
                                            <p className="font-semibold">{proof.proposal.votingEnds}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {proof.proposal && (
                                <div className="px-4 py-4 border-t border-border">
                                    <p className="text-sm text-second-foreground mb-2">
                                        Voting Progress ({proof.proposal.totalVoters} voter{proof.proposal.totalVoters !== 1 ? "s" : ""})
                                    </p>
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-success font-medium">
                                            Yes: {Math.round(proof.proposal.yesVotes)}
                                        </span>
                                        <span className="text-muted-foreground">/</span>
                                        <span className="text-destructive font-medium">
                                            No: {Math.round(proof.proposal.noVotes)}
                                        </span>
                                        <Link
                                            href={`/governance/${proof.proposal.id}`}
                                            className="ml-auto text-primary text-xs hover:underline"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            View Proposal
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
