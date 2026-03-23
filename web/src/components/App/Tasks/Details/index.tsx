"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";

import type { Task } from "@/lib/types";
import { checkHasSubmittedForTask } from "@/lib/proofContract";
import ProofComposer from "./ProofComposer";
import ProofForum from "./ProofForum";
import TaskMetadata from "./TaskMetadata";
import { ExternalLink } from "lucide-react";

export default function TaskDetails({ task }: { task: Task }) {
    const { wallets } = useWallets();
    const [forumKey, setForumKey] = useState(0);
    const [hasSubmitted, setHasSubmitted] = useState<boolean | null>(null);

    const walletProvider = wallets[0];

    const handleProofSuccess = useCallback(() => {
        setForumKey(k => k + 1);
        setHasSubmitted(true);
    }, []);

    useEffect(() => {
        if (!walletProvider) return;
        checkHasSubmittedForTask(task.id, walletProvider.address)
            .then(setHasSubmitted)
            .catch(() => setHasSubmitted(false));
    }, [task.id, walletProvider, forumKey]);

    return (
        <div className="flex flex-col gap-6 w-full py-6">
            {task.metadataURI ? (
                <div>
                    <h3 className="text-lg font-semibold">Task Details</h3>
                    <div className="mt-2">
                        <TaskMetadata metadataURI={task.metadataURI} />
                    </div>
                </div>
            ) : (
                <div>
                    <h3 className="text-lg font-semibold">Task Description</h3>
                    <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                </div>
            )}

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
                {task.txHash && (
                    <div className="border border-border rounded-lg p-4 bg-background col-span-2">
                        <p className="text-xs text-muted-foreground">Transaction</p>
                        <a
                            href={`https://hashscan.io/testnet/transaction/${task.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
                        >
                            {task.txHash.slice(0, 10)}...{task.txHash.slice(-8)}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                )}
            </div>

            <p className="text-sm text-muted-foreground">
                Earn {task.reward} HRN upon verified completion. Submit a proof to participate.
            </p>

            {walletProvider && hasSubmitted === false && (
                <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">Submit Proof</h3>
                    <ProofComposer
                        task={task}
                        wallet={walletProvider}
                        onSuccess={handleProofSuccess}
                    />
                </div>
            )}

            {walletProvider && hasSubmitted === true && (
                <p className="text-sm text-muted-foreground">
                    You have already submitted a proof for this task.
                </p>
            )}

            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Submissions</h3>
                <ProofForum taskId={task.id} refreshKey={forumKey} />
            </div>
        </div>
    );
}
