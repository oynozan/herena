"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useWallets } from "@privy-io/react-auth";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/types";
import { castVote } from "@/lib/hedera";
import { triggerSync } from "@/lib/api";

export default function VotingPanel({
    proposal,
    onVoted,
}: {
    proposal: Proposal;
    onVoted?: () => void;
}) {
    const { wallets } = useWallets();
    const [voting, setVoting] = useState(false);

    const handleVote = async (direction: "yes" | "no") => {
        const wallet = wallets[0];
        if (!wallet) {
            toast.error("Please connect your wallet first");
            return;
        }
        setVoting(true);
        try {
            const provider = await wallet.getEthereumProvider();
            await castVote(provider, {
                proposalId: proposal.id,
                direction,
            });
            toast.success(`Voted ${direction.toUpperCase()} on proposal #${proposal.id}`);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

            // Trigger server event sync so vote counts update immediately
            await triggerSync(() => Promise.resolve(true));
            onVoted?.();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("BelowMinimumStake")) {
                toast.error("You must stake HRN tokens before voting");
            } else if (msg.includes("VotingNotActive")) {
                toast.error("Voting period has ended for this proposal");
            } else if (msg.includes("AlreadyVoted")) {
                toast.error("You have already voted on this proposal");
            } else if (msg.includes("ZeroVotingPower")) {
                toast.error("Your staked amount is too low to generate voting power");
            } else {
                toast.error("Failed to cast vote. Make sure you have staked HRN tokens.");
            }
        } finally {
            setVoting(false);
        }
    };

    return (
        <div className="border border-border rounded-xl bg-primary/3 sticky top-4">
            <div className="flex flex-col justify-between gap-6">
                <div className="flex flex-col p-4">
                    <h2 className="text-xl font-semibold">Cast Your Vote</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your voting power is determined by your staked HRN tokens.
                        Vote power = sqrt(staked HRN).
                    </p>
                    <div className="flex gap-2 mt-4">
                        <Button
                            className="flex-1"
                            disabled={proposal.status !== "active" || voting}
                            onClick={() => handleVote("yes")}
                        >
                            {voting ? "Voting..." : "Vote Yes"}
                        </Button>
                        <Button
                            className="flex-1"
                            variant="destructive"
                            disabled={proposal.status !== "active" || voting}
                            onClick={() => handleVote("no")}
                        >
                            {voting ? "Voting..." : "Vote No"}
                        </Button>
                    </div>
                </div>
                <div className="flex flex-col border-t border-border p-4">
                    <div className="text-sm text-second-foreground space-y-2">
                        <p>
                            <strong>Quadratic voting</strong> ensures fair influence: your vote
                            weight is the square root of your staked HRN tokens.
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                            <div className="border border-border rounded p-2 bg-background text-center">
                                <p className="text-muted-foreground">1 HRN staked</p>
                                <p className="font-semibold">1 vote</p>
                            </div>
                            <div className="border border-border rounded p-2 bg-background text-center">
                                <p className="text-muted-foreground">100 HRN staked</p>
                                <p className="font-semibold">10 votes</p>
                            </div>
                            <div className="border border-border rounded p-2 bg-background text-center">
                                <p className="text-muted-foreground">10k HRN staked</p>
                                <p className="font-semibold">100 votes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
