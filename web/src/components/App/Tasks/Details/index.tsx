"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task } from "@/lib/types";

export default function TaskDetails({ task }: { task: Task }) {
    return (
        <div className="flex gap-4 w-full">
            <div className="w-2/3 flex flex-col gap-4 border border-border rounded-xl p-6 bg-primary/3">
                <div>
                    <h3 className="text-lg font-semibold">Task Description</h3>
                    <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="border border-border rounded-lg p-4 bg-background">
                        <p className="text-xs text-muted-foreground">Category</p>
                        <p className="font-semibold capitalize">{task.category}</p>
                    </div>
                    <div className="border border-border rounded-lg p-4 bg-background">
                        <p className="text-xs text-muted-foreground">Proof Required</p>
                        <p className="font-semibold">{task.proofType}</p>
                    </div>
                    <div className="border border-border rounded-lg p-4 bg-background">
                        <p className="text-xs text-muted-foreground">Progress</p>
                        <p className="font-semibold">
                            {task.completedCount} / {task.maxParticipants} completed
                        </p>
                        <div className="w-full bg-border rounded-full h-2 mt-2">
                            <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                    width: `${(task.completedCount / task.maxParticipants) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                    <div className="border border-border rounded-lg p-4 bg-background">
                        <p className="text-xs text-muted-foreground">Deadline</p>
                        <p className="font-semibold">{task.deadline}</p>
                    </div>
                </div>
            </div>
            <div className="w-1/3 border border-border rounded-xl bg-primary/3">
                <div className="flex flex-col justify-between gap-8 h-full">
                    <div className="flex flex-col p-4 pb-0 pt-4">
                        <h2 className="text-xl font-semibold">Join Task</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Earn {task.reward} RN upon verified completion
                        </p>
                        <Button
                            className="mt-4 w-full"
                            onClick={() => toast.success("You have joined this task!")}
                        >
                            Join Task
                        </Button>
                    </div>
                    <div className="flex flex-col px-4 py-0">
                        <h2 className="text-xl font-semibold">Submit Proof</h2>
                        <Input
                            className="mt-3 bg-background rounded-[4px]"
                            placeholder="Paste proof URL..."
                            type="url"
                        />
                        <Button
                            className="mt-2 w-full"
                            variant="secondary"
                            onClick={() => toast.success("Proof submitted for verification!")}
                        >
                            Submit Proof
                        </Button>
                    </div>
                    <div className="flex-1 flex flex-col border-t border-border p-4">
                        <p className="text-sm text-second-foreground">
                            After submitting proof, your action will be reviewed by DAO members
                            through quadratic voting. Verified completions are rewarded in RN
                            tokens.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
