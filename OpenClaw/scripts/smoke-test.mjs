#!/usr/bin/env node
/**
 * Herena Agentic API smoke test — validates HTTP surface for OpenClaw-style agents.
 * RunPod or local: set HERENA_AGENTIC_BASE_URL, then `npm test`
 */

const base = (process.env.HERENA_AGENTIC_BASE_URL || "").replace(/\/$/, "");

function fail(msg) {
    console.error(`\n❌ FAIL: ${msg}`);
    process.exit(1);
}

async function getJson(path) {
    const url = `${base}${path}`;
    const res = await fetch(url, {
        headers: { Accept: "application/json" },
    });
    const text = await res.text();
    let body;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        fail(`Non-JSON from ${url}: ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
        fail(`${res.status} ${res.statusText} — ${url} — ${JSON.stringify(body)}`);
    }
    return body;
}

async function main() {
    console.log("Herena Agentic API — smoke test");
    console.log("================================");

    if (!base) {
        fail("HERENA_AGENTIC_BASE_URL is not set (e.g. https://api.example.com)");
    }
    console.log(`Base URL: ${base}\n`);

    // 1) Descriptor
    const root = await getJson("/agentic");
    if (root.name !== "Herena Agentic API") {
        fail(`Unexpected API name: ${root.name}`);
    }
    if (!root.integrations?.openClaw || root.integrations.openClaw.status !== "active") {
        fail(`openClaw integration not active: ${JSON.stringify(root.integrations)}`);
    }
    console.log("✓ GET /agentic — descriptor OK (OpenClaw: active)");

    // 2) Chain meta (Hedera EVM addresses + chainId)
    const meta = await getJson("/agentic/chain/meta");
    if (!meta.chainId || !meta.contracts?.proofManager) {
        fail(`GET /agentic/chain/meta missing fields: ${JSON.stringify(meta)}`);
    }
    console.log(`✓ GET /agentic/chain/meta — chainId=${meta.chainId}`);

    // 3) Tasks
    const tasks = await getJson("/agentic/tasks?limit=5");
    if (!Array.isArray(tasks.tasks)) {
        fail("GET /agentic/tasks: expected { tasks: [] }");
    }
    console.log(`✓ GET /agentic/tasks — ${tasks.tasks.length} task(s) in page (total=${tasks.total ?? "?"})`);

    // 4) Proposals
    const proposals = await getJson("/agentic/proposals?limit=5");
    if (!Array.isArray(proposals.proposals)) {
        fail("GET /agentic/proposals: expected { proposals: [] }");
    }
    console.log(
        `✓ GET /agentic/proposals — ${proposals.proposals.length} proposal(s) (total=${proposals.total ?? "?"})`,
    );

    // 5) Optional: single task detail if we have any task id
    if (tasks.tasks.length > 0) {
        const id = tasks.tasks[0].id;
        const one = await getJson(`/agentic/tasks/${id}`);
        if (String(one.id) !== String(id)) {
            fail(`Task detail id mismatch: ${one.id} vs ${id}`);
        }
        console.log(`✓ GET /agentic/tasks/${id} — detail OK`);
    } else {
        console.log("○ GET /agentic/tasks/:id — skipped (no tasks in DB)");
    }

    console.log("\n✅ All smoke checks passed. Agentic API is reachable and shaped correctly.\n");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
