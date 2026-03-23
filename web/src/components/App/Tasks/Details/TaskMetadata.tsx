"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

import { resolveIpfsUrl, transformIpfsSrcs } from "@/lib/ipfs";

const extensions = [
    StarterKit,
    Image.configure({
        resize: {
            enabled: true,
            directions: ["top", "bottom", "left", "right"],
            minWidth: 50,
            minHeight: 50,
            alwaysPreserveAspectRatio: true,
        },
    }),
];

export default function TaskMetadata({ metadataURI }: { metadataURI: string }) {
    const [content, setContent] = useState<object | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const url = resolveIpfsUrl(metadataURI);
        fetch(url)
            .then(res => res.json())
            .then(data => {
                const tiptap = data?.v === 1 && data?.tiptap ? data.tiptap : data;
                const doc = tiptap?.type === "doc" ? tiptap : (tiptap?.tiptap ?? tiptap);
                setContent(transformIpfsSrcs(doc));
            })
            .catch(() => setError(true));
    }, [metadataURI]);

    const editor = useEditor({
        extensions,
        content: content ?? "",
        editable: false,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "prose prose-sm dark:prose-invert max-w-none min-h-0",
            },
        },
    });

    useEffect(() => {
        if (content && editor) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (error) {
        return <p className="text-sm text-muted-foreground">Failed to load task details.</p>;
    }

    if (!content) {
        return (
            <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
            </div>
        );
    }

    return (
        <div className="border border-border rounded-lg p-4 bg-background">
            <EditorContent editor={editor} />
        </div>
    );
}
