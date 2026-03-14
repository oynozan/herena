import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import VotingPanel from "@/components/App/Governance/Voting";
import { fetchProposal } from "@/lib/api";

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

export default async function ProposalDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    let proposal;
    try {
        proposal = await fetchProposal(id);
    } catch {
        return notFound();
    }

    if (!proposal) return notFound();

    const totalVotes = proposal.yesVotes + proposal.noVotes;
    const yesPercent = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 0;

    return (
        <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/governance">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl">{proposal.title}</h2>
                            <span
                                className={
                                    "font-medium px-3 py-1 rounded-full text-xs capitalize " +
                                    (statusColors[proposal.status] || "")
                                }
                            >
                                {proposal.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-second-foreground">
                            <span>{typeLabels[proposal.type] || proposal.type}</span>
                            <span>&middot;</span>
                            <span>Ends {proposal.votingEnds}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 w-full">
                <div className="w-2/3 flex flex-col gap-4 px-12 py-6">
                    <div>
                        <h3 className="text-lg font-semibold">Description</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            {proposal.description}
                        </p>
                    </div>
                    {proposal.taskProof && (
                        <div className="border border-border rounded-lg p-4 bg-background">
                            <h4 className="font-semibold text-sm">Task Proof Details</h4>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">Task</p>
                                    <p className="text-sm font-medium">
                                        {proposal.taskProof.taskTitle}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Volunteer</p>
                                    <p className="text-sm font-medium font-mono">
                                        {proposal.taskProof.volunteer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Voting Progress</h4>
                        <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-primary h-3 rounded-full transition-all"
                                style={{ width: `${yesPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>
                                Yes: {proposal.yesVotes} votes ({yesPercent.toFixed(1)}%)
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
    );
}
