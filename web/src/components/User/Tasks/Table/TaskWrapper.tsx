"use client";

import { useState } from "react";
import { Check, ChevronDown, Clock, X } from "lucide-react";

import type { UserTask } from "@/lib/types";
import { Button } from "@/components/ui/button";

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    joined: {
        label: "Joined",
        className: "bg-primary/15 text-primary",
        icon: <Clock className="h-3 w-3" />,
    },
    proof_submitted: {
        label: "Proof Submitted",
        className: "bg-blue-500/15 text-blue-600",
        icon: <Clock className="h-3 w-3" />,
    },
    pending_verification: {
        label: "Pending Verification",
        className: "bg-gold/15 text-gold",
        icon: <Clock className="h-3 w-3" />,
    },
    approved: {
        label: "Approved",
        className: "bg-success/15 text-success",
        icon: <Check className="h-3 w-3" />,
    },
    rejected: {
        label: "Rejected",
        className: "bg-destructive/15 text-destructive",
        icon: <X className="h-3 w-3" />,
    },
};

export default function UserTaskWrapper({ userTask }: { userTask: UserTask }) {
    const [isOpen, setIsOpen] = useState(false);
    const config = statusConfig[userTask.status] || statusConfig.joined;

    return (
        <div className="w-full">
            <div
                className={`border border-border hover:bg-primary/3 transition-all duration-200 rounded-xl`}
            >
                <div
                    className="group flex justify-between py-6 px-4 cursor-pointer"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div>
                        <h3 className="text-2xl font-semibold group-hover:text-primary transition-colors">
                            {userTask.task.title}
                        </h3>
                        <span className="text-sm text-muted-foreground capitalize">
                            {userTask.task.category}
                        </span>
                    </div>
                    <div className="flex-1 flex justify-end items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span
                                className={
                                    "font-medium px-4 py-2 rounded-full flex items-center gap-1.5 text-sm " +
                                    config.className
                                }
                            >
                                {config.icon}
                                {config.label}
                            </span>
                            {userTask.earnedRN > 0 && (
                                <span className="font-medium bg-primary/15 text-primary px-4 py-2 rounded-full text-sm">
                                    +{userTask.earnedRN} RN
                                </span>
                            )}
                        </div>
                        <Button size="icon" variant="outline" aria-expanded={isOpen}>
                            <ChevronDown
                                className={`transition-transform duration-300 ${
                                    isOpen ? "rotate-180" : ""
                                }`}
                            />
                        </Button>
                    </div>
                </div>
                {isOpen && (
                    <div className="overflow-hidden border-border rounded-b-xl">
                        <div className="bg-background">
                            <div className="px-4 py-4 space-y-2 border-t border-border">
                                <h3>Task Details</h3>
                                <p className="text-sm text-muted-foreground">
                                    {userTask.task.description}
                                </p>
                                <div className="flex gap-4 mt-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Reward</p>
                                        <p className="font-semibold">{userTask.task.reward} RN</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Deadline</p>
                                        <p className="font-semibold">{userTask.task.deadline}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Proof Type</p>
                                        <p className="font-semibold">{userTask.task.proofType}</p>
                                    </div>
                                </div>
                            </div>
                            {userTask.txHash && (
                                <div className="px-4 py-4 border-t border-border">
                                    <p className="text-sm text-second-foreground">
                                        Transaction:{" "}
                                        <code className="bg-accent px-2 py-1 rounded text-xs">
                                            {userTask.txHash}
                                        </code>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
