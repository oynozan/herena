import { Suspense } from "react";

import TableLoading from "@/components/Table/Loading";
import UserTasksTable from "@/components/User/Tasks/Table";

export default function MyTasksPage() {
    return (
        <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full pl-2 flex items-end justify-between">
                <div className="flex flex-col">
                    <h2 className="text-xl">My Tasks</h2>
                    <p className="text-second-foreground text-sm">
                        Track your sustainability actions and earned rewards.
                    </p>
                </div>
            </div>
            <Suspense fallback={<TableLoading />}>
                <UserTasksTable />
            </Suspense>
        </div>
    );
}
