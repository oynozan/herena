let heliaInstance: Awaited<ReturnType<typeof initHelia>> | null = null;

async function initHelia() {
    const { createHelia, libp2pDefaults } = await import("helia");
    const { tcp } = await import("@libp2p/tcp");
    const { webSockets } = await import("@libp2p/websockets");
    const { circuitRelayTransport } = await import("@libp2p/circuit-relay-v2");

    const libp2p = libp2pDefaults();
    libp2p.addresses = {
        listen: [
            "/ip4/0.0.0.0/tcp/0",
            "/ip4/0.0.0.0/tcp/0/ws",
            "/ip6/::/tcp/0",
            "/ip6/::/tcp/0/ws",
            "/p2p-circuit",
        ],
    };
    libp2p.transports = [
        circuitRelayTransport(),
        tcp(),
        webSockets(),
    ];

    return createHelia({ libp2p });
}

async function getFs() {
    if (!heliaInstance) {
        heliaInstance = await initHelia();
    }
    const { unixfs } = await import("@helia/unixfs");
    return unixfs(heliaInstance);
}

/**
 * Add bytes to IPFS via Helia. Returns CID string for use as proofURI (ipfs://<cid>).
 * Required for answers; fails if Helia cannot be initialized.
 */
export async function addBytes(buf: Buffer | Uint8Array): Promise<string> {
    const fs = await getFs();
    const bytes = buf instanceof Buffer ? new Uint8Array(buf) : buf;
    const cid = await fs.addBytes(bytes);
    return cid.toString();
}

/**
 * Add JSON object to IPFS. Serializes to UTF-8 and adds via addBytes.
 */
export async function addJson(obj: object): Promise<string> {
    const buf = Buffer.from(JSON.stringify(obj), "utf-8");
    return addBytes(buf);
}
