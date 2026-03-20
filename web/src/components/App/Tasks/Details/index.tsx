"use client";

import { useState, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";

import type { Task } from "@/lib/types";
import ProofComposer from "./ProofComposer";
import ProofForum from "./ProofForum";

export default function TaskDetails({ task }: { task: Task }) {
    const { wallets } = useWallets();
    const [forumKey, setForumKey] = useState(0);

    const walletProvider = wallets[0];

    const handleProofSuccess = useCallback(() => {
        setForumKey(k => k + 1);
    }, []);

    return (
        <div className="flex flex-col gap-6 w-full px-12 py-6">
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

            <p className="text-sm text-muted-foreground">
                Earn {task.reward} RN upon verified completion. Submit a proof to participate.
            </p>

            {walletProvider && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Submit Proof</h3>
                    <ProofComposer
                        task={task}
                        wallet={walletProvider}
                        onSuccess={handleProofSuccess}
                    />
                </div>
            )}

            <div>
                <ProofForum taskId={task.id} refreshKey={forumKey} />
            </div>

            <p className="text-sm text-muted-foreground">
                After submitting proof, your action will be reviewed by DAO members through
                quadratic voting. Verified completions are rewarded in RN tokens.
            </p>
        </div>
    );
}
