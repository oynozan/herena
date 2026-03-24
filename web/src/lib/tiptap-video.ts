import { Node, mergeAttributes } from "@tiptap/core";

export interface VideoOptions {
    HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        video: {
            setVideo: (options: { src: string }) => ReturnType;
        };
    }
}

const Video = Node.create<VideoOptions>({
    name: "video",
    group: "block",
    atom: true,

    addOptions() {
        return { HTMLAttributes: {} };
    },

    addAttributes() {
        return {
            src: { default: null },
            width: { default: "100%" },
        };
    },

    parseHTML() {
        return [{ tag: "video[src]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "video",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                controls: "true",
                preload: "metadata",
            }),
        ];
    },

    addCommands() {
        return {
            setVideo:
                (options) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: options,
                    });
                },
        };
    },
});

export default Video;
