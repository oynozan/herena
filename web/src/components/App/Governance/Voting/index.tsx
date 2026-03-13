"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Proposal } from "@/lib/types";

export default function VotingPanel({ proposal }: { proposal: Proposal }) {
    const [voteCredits, setVoteCredits] = useState("");
    const credits = Number(voteCredits) || 0;
    const votePower = Math.floor(Math.sqrt(credits));

    return (
        <div className="border border-border rounded-xl bg-primary/3 h-full">
            <div className="flex flex-col justify-between gap-6 h-full">
                <div className="flex flex-col p-4">
                    <h2 className="text-xl font-semibold">Quadratic Voting</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enter RN credits to cast your vote. Voting power = sqrt(credits).
                    </p>
                    <div className="mt-4">
                        <Input
                            className="bg-background rounded-[4px]"
                            placeholder="RN credits to spend"
                            type="number"
                            min="0"
                            value={voteCredits}
                            onChange={e => setVoteCredits(e.target.value)}
                        />
                        <div className="flex justify-between mt-2 text-sm">
                            <span className="text-muted-foreground">Vote Power:</span>
                            <span className="font-semibold text-primary">{votePower} votes</span>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button
                            className="flex-1"
                            disabled={proposal.status !== "active" || credits === 0}
                            onClick={() => {
                                toast.success(
                                    `Voted YES with ${votePower} vote power (${credits} RN spent)`,
                                );
                                setVoteCredits("");
                            }}
                        >
                            Vote Yes
                        </Button>
                        <Button
                            className="flex-1"
                            variant="destructive"
                            disabled={proposal.status !== "active" || credits === 0}
                            onClick={() => {
                                toast.success(
                                    `Voted NO with ${votePower} vote power (${credits} RN spent)`,
                                );
                                setVoteCredits("");
                            }}
                        >
                            Vote No
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col border-t border-border p-4">
                    <div className="text-sm text-second-foreground space-y-2">
                        <p>
                            <strong>Quadratic voting</strong> ensures fair influence: spending N
                            credits gives sqrt(N) votes.
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                            <div className="border border-border rounded p-2 bg-background text-center">
                                <p className="text-muted-foreground">1 credit</p>
                                <p className="font-semibold">1 vote</p>
                            </div>
                            <div className="border border-border rounded p-2 bg-background text-center">
                                <p className="text-muted-foreground">9 credits</p>
                                <p className="font-semibold">3 votes</p>
                            </div>
                            <div className="border border-border rounded p-2 bg-background text-center">
                                <p className="text-muted-foreground">100 credits</p>
                                <p className="font-semibold">10 votes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
