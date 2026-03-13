import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import TableLoading from "@/components/Table/Loading";
import GovernanceTable from "@/components/App/Governance/Table";

export default function GovernancePage() {
    return (
        <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full pl-2 flex items-end justify-between">
                <div className="flex flex-col">
                    <h2 className="text-xl">Governance</h2>
                    <p className="text-second-foreground text-sm">
                        Review proposals and vote on task verifications using quadratic voting
                    </p>
                </div>
                <Button variant="secondary" disabled>
                    Create Proposal
                </Button>
            </div>
            <Suspense fallback={<TableLoading />}>
                <GovernanceTable />
            </Suspense>
        </div>
    );
}
