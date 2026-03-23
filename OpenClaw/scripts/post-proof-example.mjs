#!/usr/bin/env node
/**
 * Optional: POST /agentic/tasks/:id/proof — task must exist in MongoDB.
 * Env: HERENA_AGENTIC_BASE_URL, TEST_TASK_ID, TEST_SUBMITTER, TEST_PROOF_URI
 */

const base = (process.env.HERENA_AGENTIC_BASE_URL || "").replace(/\/$/, "");
const taskId = process.env.TEST_TASK_ID;
const submitter = process.env.TEST_SUBMITTER;
const proofURI = process.env.TEST_PROOF_URI;

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

async function main() {
    if (!base) fail("HERENA_AGENTIC_BASE_URL required");
    if (!taskId || !submitter || !proofURI) {
        fail("Set TEST_TASK_ID, TEST_SUBMITTER, TEST_PROOF_URI (see .env.example)");
    }

    const url = `${base}/agentic/tasks/${taskId}/proof`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ submitter, proofURI }),
    });
    const text = await res.text();
    let body;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        fail(`Non-JSON: ${text}`);
    }
    if (!res.ok) {
        fail(`${res.status} — ${JSON.stringify(body)}`);
    }
    console.log("✅ POST proof OK:", JSON.stringify(body, null, 2));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
