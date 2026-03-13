import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import TableLoading from "@/components/Table/Loading";
import TasksTable from "@/components/App/Tasks/Table";

export default function TasksPage() {
    return (
        <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full pl-2 flex items-end justify-between">
                <div className="flex flex-col">
                    <h2 className="text-xl">Sustainability Tasks</h2>
                    <p className="text-second-foreground text-sm">
                        Browse and join real-world sustainability actions verified on Hedera
                    </p>
                </div>
                <Button variant="secondary" disabled>
                    Propose a Task
                </Button>
            </div>
            <Suspense fallback={<TableLoading />}>
                <TasksTable />
            </Suspense>
        </div>
    );
}
