import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import TaskDetails from "@/components/App/Tasks/Details";
import { fetchTask } from "@/lib/api";

export default async function TaskDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    let task;
    try {
        task = await fetchTask(id);
    } catch {
        return notFound();
    }

    if (!task) return notFound();

    return (
        <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex flex-col">
                        <h2 className="text-2xl">{task.title}</h2>
                        <p className="text-second-foreground text-sm">
                            {task.reward} RN reward &middot; Due {task.deadline}
                        </p>
                    </div>
                </div>
            </div>
            <TaskDetails task={task} />
        </div>
    );
}
