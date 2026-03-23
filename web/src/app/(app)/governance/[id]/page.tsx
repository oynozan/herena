import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import ProposalContent from "@/components/App/Governance/Voting/ProposalContent";
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

            <ProposalContent proposal={proposal} />
        </div>
    );
}
