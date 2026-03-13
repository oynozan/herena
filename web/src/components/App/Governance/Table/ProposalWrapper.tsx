"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { Proposal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import VotingPanel from "../Voting";

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
    const [isOpen, setIsOpen] = useState(false);
    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const yesPercent = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 0;

    return (
        <div className="w-full">
            <div
                className={`border border-border hover:bg-primary/3 transition-all duration-200 rounded-xl`}
            >
                <div
                    className="group flex justify-between py-6 px-4 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
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
                                    {proposal.yesVotes}
                                </span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-destructive font-medium">
                                    {proposal.noVotes}
                                </span>
                            </div>
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
                            <div className="p-4 border-t border-border">
                                <div className="flex gap-4 w-full">
                                    <div className="w-2/3 flex flex-col gap-4 border border-border rounded-xl p-6 bg-primary/3">
                                        <div>
                                            <h3 className="text-lg font-semibold">Description</h3>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                {proposal.description}
                                            </p>
                                        </div>
                                        {proposal.taskProof && (
                                            <div className="border border-border rounded-lg p-4 bg-background">
                                                <h4 className="font-semibold text-sm">
                                                    Task Proof Details
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Task
                                                        </p>
                                                        <p className="text-sm font-medium">
                                                            {proposal.taskProof.taskTitle}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Volunteer
                                                        </p>
                                                        <p className="text-sm font-medium font-mono">
                                                            {proposal.taskProof.volunteer}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-semibold text-sm mb-2">
                                                Voting Progress
                                            </h4>
                                            <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="bg-primary h-3 rounded-full transition-all"
                                                    style={{ width: `${yesPercent}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                                <span>
                                                    Yes: {proposal.yesVotes} votes (
                                                    {yesPercent.toFixed(1)}%)
                                                </span>
                                                <span>
                                                    No: {proposal.noVotes} votes (
                                                    {(100 - yesPercent).toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-1/3">
                                        <VotingPanel proposal={proposal} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
