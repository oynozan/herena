"use client";

import { useEffect, useState, useCallback, useRef, type FormEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    checkAdmin,
    adminCreateTask,
    adminCancelTask,
    adminPause,
    adminUnpause,
    adminSetVotingDuration,
    adminDeleteProposal,
    adminResolveProposal,
    adminSetMinStake,
    uploadProofImage,
    uploadProofArtifact,
    triggerSync,
} from "@/lib/api";
import {
    ImageIcon,
    Bold,
    Italic,
    List,
    ListOrdered,
    Heading2,
    Quote,
    Undo,
    Redo,
} from "lucide-react";

function TxResult({ txHash }: { txHash: string }) {
    return (
        <p className="text-xs text-muted-foreground mt-2 break-all">
            tx:{" "}
            <a
                href={`https://hashscan.io/testnet/transaction/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary"
            >
                {txHash}
            </a>
        </p>
    );
}

function useAdminAction<T extends unknown[]>(
    fn: (...args: T) => Promise<{ success: boolean; txHash: string }>,
) {
    const [loading, setLoading] = useState(false);
    const [lastTx, setLastTx] = useState<string | null>(null);

    const execute = async (...args: T) => {
        setLoading(true);
        setLastTx(null);
        try {
            const result = await fn(...args);
            setLastTx(result.txHash);
            toast.success("Transaction confirmed");
            // Trigger immediate event sync so DB reflects the change
            await triggerSync(() => Promise.resolve(true));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Transaction failed");
        } finally {
            setLoading(false);
        }
    };

    return { execute, loading, lastTx };
}

export default function AdminPage() {
    const [authorized, setAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        checkAdmin().then(setAuthorized);
    }, []);

    if (authorized === null) {
        return <p className="text-muted-foreground">Checking access...</p>;
    }

    if (!authorized) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p className="text-muted-foreground">
                    Connect with the admin wallet to access this panel.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">
                    Execute contract owner operations. Transactions are signed server-side.
                </p>
            </div>

            <div className="flex flex-col gap-4">
                <CreateTaskCard />
                <CancelTaskCard />
                <PauseCard />
                <VotingDurationCard />
                <DeleteProposalCard />
                <ResolveProposalCard />
                <MinStakeCard />
            </div>
        </div>
    );
}

const editorExtensions = [
    StarterKit,
    TiptapImage.configure({
        resize: {
            enabled: true,
            directions: ["top", "bottom", "left", "right"],
            minWidth: 50,
            minHeight: 50,
            alwaysPreserveAspectRatio: true,
        },
    }),
    Placeholder.configure({ placeholder: "Write your task description..." }),
];

function CreateTaskCard() {
    const { execute, loading, lastTx } = useAdminAction(adminCreateTask);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const editor = useEditor({
        extensions: editorExtensions,
        content: "",
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-[240px] px-3 py-2 focus:outline-none",
            },
        },
    });

    const handleImageUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
            }
            if (!editor) return;
            setUploading(true);
            try {
                const { cid } = await uploadProofImage(file);
                const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY;
                const src = gateway ? `${gateway.replace(/\/$/, "")}/${cid}` : `ipfs://${cid}`;
                editor.chain().focus().setImage({ src }).run();
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to upload image");
            } finally {
                setUploading(false);
                e.target.value = "";
            }
        },
        [editor],
    );

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editor) return;

        const form = new FormData(e.currentTarget);
        const title = form.get("title") as string;
        const reward = Number(form.get("reward"));
        const maxCompletions = Number(form.get("maxCompletions"));
        const deadline = form.get("deadline") as string;
        const category = (form.get("category") as string) || "other";
        const proofType = (form.get("proofType") as string) || "";

        const json = editor.getJSON();

        let metadataURI: string;
        try {
            const metadata = {
                title,
                description: editor.getText(),
                category,
                proofType,
                tiptap: json,
            };
            const { uri } = await uploadProofArtifact({ v: 1, tiptap: metadata });
            metadataURI = uri;
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to upload metadata to IPFS");
            return;
        }

        execute({
            description: title,
            reward,
            maxCompletions,
            deadline,
            metadataURI,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Create Task</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" required />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <div className="border border-border rounded-lg bg-background mt-1">
                            <div className="flex flex-wrap gap-1 p-2 border-b border-border">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleBold().run()}
                                    className={editor?.isActive("bold") ? "bg-muted" : ""}
                                >
                                    <Bold className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                                    className={editor?.isActive("italic") ? "bg-muted" : ""}
                                >
                                    <Italic className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        editor?.chain().focus().toggleHeading({ level: 2 }).run()
                                    }
                                    className={
                                        editor?.isActive("heading", { level: 2 }) ? "bg-muted" : ""
                                    }
                                >
                                    <Heading2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                    className={editor?.isActive("bulletList") ? "bg-muted" : ""}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        editor?.chain().focus().toggleOrderedList().run()
                                    }
                                    className={editor?.isActive("orderedList") ? "bg-muted" : ""}
                                >
                                    <ListOrdered className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                                    className={editor?.isActive("blockquote") ? "bg-muted" : ""}
                                >
                                    <Quote className="w-4 h-4" />
                                </Button>
                                <div className="w-px bg-border mx-1" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleImageUpload}
                                    disabled={uploading}
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <div className="w-px bg-border mx-1" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().undo().run()}
                                    disabled={!editor?.can().undo()}
                                >
                                    <Undo className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor?.chain().focus().redo().run()}
                                    disabled={!editor?.can().redo()}
                                >
                                    <Redo className="w-4 h-4" />
                                </Button>
                            </div>
                            <EditorContent editor={editor} />
                        </div>
                        {uploading && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Uploading image to IPFS...
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="reward">Reward (HRN)</Label>
                            <Input id="reward" name="reward" type="number" step="any" required />
                        </div>
                        <div>
                            <Label htmlFor="maxCompletions">Max Completions</Label>
                            <Input
                                id="maxCompletions"
                                name="maxCompletions"
                                type="number"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="category">Category</Label>
                            <Input
                                id="category"
                                name="category"
                                placeholder="e.g. environment, education"
                            />
                        </div>
                        <div>
                            <Label htmlFor="proofType">Proof Type</Label>
                            <Input
                                id="proofType"
                                name="proofType"
                                placeholder="e.g. photo, document"
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input id="deadline" name="deadline" type="datetime-local" required />
                    </div>
                    <Button type="submit" disabled={loading || uploading} className="w-full">
                        {loading ? "Creating..." : "Create Task"}
                    </Button>
                    {lastTx && <TxResult txHash={lastTx} />}
                </form>
            </CardContent>
        </Card>
    );
}

function CancelTaskCard() {
    const { execute, loading, lastTx } = useAdminAction(adminCancelTask);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const taskId = Number(new FormData(e.currentTarget).get("taskId"));
        execute(taskId);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Cancel Task</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="cancelTaskId">Task ID</Label>
                        <Input id="cancelTaskId" name="taskId" type="number" required />
                    </div>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Cancelling..." : "Cancel Task"}
                    </Button>
                    {lastTx && <TxResult txHash={lastTx} />}
                </form>
            </CardContent>
        </Card>
    );
}

function PauseCard() {
    const pause = useAdminAction(adminPause);
    const unpause = useAdminAction(adminUnpause);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Pause / Unpause</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                    Pause or unpause the TaskManager contract. When paused, no new tasks or proofs
                    can be created.
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="destructive"
                        disabled={pause.loading}
                        onClick={() => pause.execute()}
                        className="flex-1"
                    >
                        {pause.loading ? "Pausing..." : "Pause"}
                    </Button>
                    <Button
                        disabled={unpause.loading}
                        onClick={() => unpause.execute()}
                        className="flex-1"
                    >
                        {unpause.loading ? "Unpausing..." : "Unpause"}
                    </Button>
                </div>
                {pause.lastTx && <TxResult txHash={pause.lastTx} />}
                {unpause.lastTx && <TxResult txHash={unpause.lastTx} />}
            </CardContent>
        </Card>
    );
}

function VotingDurationCard() {
    const { execute, loading, lastTx } = useAdminAction(adminSetVotingDuration);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const duration = Number(new FormData(e.currentTarget).get("duration"));
        execute(duration);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Voting Duration</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="votingDuration">Duration (seconds)</Label>
                        <Input
                            id="votingDuration"
                            name="duration"
                            type="number"
                            placeholder="172800"
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Updating..." : "Set Duration"}
                    </Button>
                    {lastTx && <TxResult txHash={lastTx} />}
                </form>
            </CardContent>
        </Card>
    );
}

function DeleteProposalCard() {
    const { execute, loading, lastTx } = useAdminAction(adminDeleteProposal);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const id = Number(new FormData(e.currentTarget).get("proposalId"));
        execute(id);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Delete Proposal</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="deleteProposalId">Proposal ID</Label>
                        <Input id="deleteProposalId" name="proposalId" type="number" required />
                    </div>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Deleting..." : "Delete Proposal"}
                    </Button>
                    {lastTx && <TxResult txHash={lastTx} />}
                </form>
            </CardContent>
        </Card>
    );
}

function ResolveProposalCard() {
    const { execute, loading, lastTx } = useAdminAction(adminResolveProposal);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const id = Number(new FormData(e.currentTarget).get("proposalId"));
        execute(id);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Resolve Proposal</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="resolveProposalId">Proposal ID</Label>
                        <Input id="resolveProposalId" name="proposalId" type="number" required />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Resolving..." : "Resolve Proposal"}
                    </Button>
                    {lastTx && <TxResult txHash={lastTx} />}
                </form>
            </CardContent>
        </Card>
    );
}

function MinStakeCard() {
    const { execute, loading, lastTx } = useAdminAction(adminSetMinStake);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const amount = Number(new FormData(e.currentTarget).get("amount"));
        execute(amount);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Minimum Stake</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <Label htmlFor="minStakeAmount">Amount (HRN)</Label>
                        <Input
                            id="minStakeAmount"
                            name="amount"
                            type="number"
                            step="any"
                            required
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Updating..." : "Set Min Stake"}
                    </Button>
                    {lastTx && <TxResult txHash={lastTx} />}
                </form>
            </CardContent>
        </Card>
    );
}
