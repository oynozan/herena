import { Suspense } from "react";

import TableLoading from "@/components/Table/Loading";
import UserProofsTable from "@/components/User/Proofs/Table";

export default function MyProofsPage() {
    return (
        <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full pl-2 flex items-end justify-between">
                <div className="flex flex-col">
                    <h2 className="text-xl">My Proofs</h2>
                    <p className="text-second-foreground text-sm">
                        Track your submitted proofs and verification status.
                    </p>
                </div>
            </div>
            <Suspense fallback={<TableLoading />}>
                <UserProofsTable />
            </Suspense>
        </div>
    );
}
