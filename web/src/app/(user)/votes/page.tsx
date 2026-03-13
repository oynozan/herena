import { Suspense } from "react";

import TableLoading from "@/components/Table/Loading";
import VotesTable from "@/components/User/Votes/Table";

export default function VotesPage() {
    return (
        <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full pl-2 flex items-end justify-between">
                <div className="flex flex-col">
                    <h2 className="text-xl">My Votes</h2>
                    <p className="text-second-foreground text-sm">
                        Your voting history and active governance participation.
                    </p>
                </div>
            </div>
            <Suspense fallback={<TableLoading />}>
                <VotesTable />
            </Suspense>
        </div>
    );
}
