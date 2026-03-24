import Link from "next/link";

import type { Task } from "@/lib/types";

const categoryColors: Record<string, string> = {
    trees: "bg-green-500/20 text-green-700",
    carbon: "bg-blue-500/20 text-blue-700",
    recycling: "bg-orange-500/20 text-orange-700",
    water: "bg-cyan-500/20 text-cyan-700",
    energy: "bg-yellow-500/20 text-yellow-700",
    other: "bg-gray-500/20 text-gray-700",
};

const categoryLabels: Record<string, string> = {
    trees: "Trees",
    carbon: "Carbon",
    recycling: "Recycling",
    water: "Water",
    energy: "Energy",
    other: "Other",
};

const statusColors: Record<string, string> = {
    completed: "bg-success/15 text-success",
    expired: "bg-muted text-muted-foreground",
    pending_verification: "bg-yellow-500/15 text-yellow-600",
};

export default function TaskWrapper({ task }: { task: Task }) {
    return (
        <div className="w-full">
            <Link
                href={`/task/${task.id}`}
                className="block border border-border hover:bg-primary/3 transition-all duration-200 rounded-xl"
            >
                <div className="group flex justify-between pl-4">
                    <div className="flex flex-col py-6">
                        <h3 className="text-2xl font-semibold group-hover:text-primary transition-colors">
                            {task.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span
                                className={
                                    "text-xs font-medium px-3 py-1 rounded-full " +
                                    (categoryColors[task.category] || categoryColors.other)
                                }
                            >
                                {categoryLabels[task.category] || task.category}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {task.participants} / {task.maxParticipants} participants
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-end items-center gap-4 py-6 mr-4">
                        <div className="flex items-center gap-4">
                            {task.status !== "active" && statusColors[task.status] && (
                                <span
                                    className={
                                        "font-medium px-4 py-2 rounded-full text-sm capitalize " +
                                        statusColors[task.status]
                                    }
                                >
                                    {task.status}
                                </span>
                            )}
                            {task?.proofType && (
                                <span className="font-medium bg-primary/15 text-primary px-4 py-2 rounded-full text-sm">
                                    {task.proofType}
                                </span>
                            )}
                            <span className="text-sm text-muted-foreground">
                                Due {task.deadline}
                            </span>
                        </div>
                    </div>
                    <div className="px-6 border-l border-border flex flex-col items-center justify-center w-40">
                        <p className="text-primary font-ibm-plex-mono text-xl">{task.reward} HRN</p>
                    </div>
                </div>
            </Link>
        </div>
    );
}
