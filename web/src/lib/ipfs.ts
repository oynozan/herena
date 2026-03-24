export function resolveIpfsUrl(uri: string): string {
    if (uri.startsWith("ipfs://")) {
        const cid = uri.replace("ipfs://", "");
        return `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/${cid}`;
    }
    return uri;
}

export function transformIpfsSrcs(doc: object): object {
    const visit = (node: any): any => {
        if (!node) return node;
        if ((node.type === "image" || node.type === "video") && node.attrs?.src?.startsWith("ipfs://")) {
            const cid = node.attrs.src.replace("ipfs://", "");
            return {
                ...node,
                attrs: { ...node.attrs, src: `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}/${cid}` },
            };
        }
        if (node.content) {
            return { ...node, content: node.content.map(visit) };
        }
        return node;
    };
    return visit(doc);
}
