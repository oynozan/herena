import type { Helia } from "helia";
import type { UnixFS } from "@helia/unixfs";

let helia: Helia | null = null;
let fs: UnixFS | null = null;

async function initIPFS(): Promise<void> {
    if (!helia) {
        const { createHelia } = await import("helia");
        const { unixfs } = await import("@helia/unixfs");
        helia = await createHelia();
        fs = unixfs(helia);
        console.log("[heliProof] Helia initialized");
    }
}

/** Kubo RPC endpoint from IPFS_API env, e.g. http://localhost:5001/api/v0 */
function getKuboApi(): string | null {
    return process.env.IPFS_API?.replace(/\/$/, "") || null;
}

async function addViaKubo(bytes: Uint8Array): Promise<string> {
    const api = getKuboApi()!;
    const form = new FormData();
    form.append("file", new Blob([bytes as unknown as BlobPart]));

    const res = await fetch(`${api}/add?pin=true`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`Kubo add failed: ${res.status}`);
    const data = (await res.json()) as { Hash: string };
    return data.Hash;
}

/**
 * Add bytes to IPFS. Prefers Kubo HTTP API when IPFS_GATEWAY is set,
 * falls back to local Helia node.
 */
export async function addBytes(buf: Buffer | Uint8Array): Promise<string> {
    const bytes = buf instanceof Buffer ? new Uint8Array(buf) : buf;

    if (getKuboApi()) {
        return addViaKubo(bytes);
    }

    await initIPFS();
    const cid = await fs!.addBytes(bytes);
    return cid.toString();
}

/**
 * Add JSON object to IPFS. Serializes to UTF-8 and adds via addBytes.
 */
export async function addJson(obj: object): Promise<string> {
    const buf = Buffer.from(JSON.stringify(obj), "utf-8");
    return addBytes(buf);
}
