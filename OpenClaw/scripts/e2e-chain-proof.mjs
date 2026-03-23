#!/usr/bin/env node
/**
 * E2E: prepare-submit-proof → sign with private key → POST /agentic/chain/tx/broadcast → receipt
 *
 * Required env:
 *   HERENA_AGENTIC_BASE_URL  (e.g. http://localhost:5000 — API host only, no /agentic suffix)
 *   HEDERA_RPC_URL           (same network as server .env; must match signing chainId)
 *   AGENT_PRIVATE_KEY        (0x-prefixed ECDSA key — testnet wallet)
 *   E2E_TASK_ID              (on-chain active task; must not have submitted proof yet)
 *   E2E_PROOF_URI            (e.g. ipfs://... or https://...)
 *
 * E2E_DRY_RUN=1 → only prepare + print signed tx, no broadcast
 */

import "./load-env.mjs";
import { ethers } from "ethers";

const base = (process.env.HERENA_AGENTIC_BASE_URL || "").replace(/\/$/, "");
const rpc = process.env.HEDERA_RPC_URL || "";
const pk = process.env.AGENT_PRIVATE_KEY || "";
const taskId = process.env.E2E_TASK_ID ?? "";
const proofURI = process.env.E2E_PROOF_URI || "";
const dryRun = process.env.E2E_DRY_RUN === "1";

function fail(msg) {
    console.error(`\n❌ ${msg}`);
    process.exit(1);
}

async function getJson(path) {
    const url = `${base}${path}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();
    let body;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        fail(`Non-JSON ${url}: ${text.slice(0, 300)}`);
    }
    if (!res.ok) fail(`${res.status} ${url} — ${JSON.stringify(body)}`);
    return body;
}

async function postJson(path, body) {
    const url = `${base}${path}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        fail(`Non-JSON ${url}: ${text.slice(0, 300)}`);
    }
    if (!res.ok) fail(`${res.status} ${url} — ${JSON.stringify(data)}`);
    return data;
}

async function signStep(provider, wallet, step, chainId) {
    const value = step.value === "0x0" || step.value === "0x" || !step.value ? 0n : BigInt(step.value);
    let gasLimit;
    try {
        gasLimit = step.estimatedGas
            ? (BigInt(step.estimatedGas) * 125n) / 100n
            : await provider.estimateGas({
                  from: wallet.address,
                  to: step.to,
                  data: step.data,
                  value,
              });
    } catch {
        gasLimit = 800_000n;
    }

    const fee = await provider.getFeeData();
    const unsigned = {
        to: step.to,
        data: step.data,
        value,
        chainId,
        gasLimit,
        type: 2,
        maxFeePerGas: fee.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined,
    };

    // Hedera JSON-RPC relay may prefer legacy gas fields; populateTransaction adjusts
    const populated = await wallet.populateTransaction(unsigned);
    return wallet.signTransaction(populated);
}

async function main() {
    console.log("Herena — E2E on-chain proof (OpenClaw-style signing)\n");

    if (!base) fail("HERENA_AGENTIC_BASE_URL is required");
    if (!rpc) fail("HEDERA_RPC_URL is required (signing + nonce)");
    if (!pk) fail("AGENT_PRIVATE_KEY is required");
    if (taskId === "") fail("E2E_TASK_ID is required");
    if (!proofURI) fail("E2E_PROOF_URI is required");

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(pk, provider);

    const meta = await getJson("/agentic/chain/meta");
    const chainId = BigInt(meta.chainId);
    console.log("chainId:", meta.chainId, "signer:", wallet.address);
    if (meta.contracts?.proofManager) {
        console.log("ProofManager:", meta.contracts.proofManager);
    }

    const prep = await postJson("/agentic/chain/tx/prepare-submit-proof", {
        taskId,
        proofURI,
        from: wallet.address,
    });

    if (prep.preflight && prep.preflight.onChainTaskActive === false) {
        console.warn("⚠ preflight: on-chain task does not look active; attempting tx anyway.");
    }

    if (!prep.steps?.length) fail("prepare response has no steps");

    for (const step of prep.steps) {
        console.log(`\n→ ${step.label}`);
        const signed = await signStep(provider, wallet, step, chainId);
        console.log("  signed (prefix):", signed.slice(0, 46) + "...");

        if (dryRun) {
            console.log("  E2E_DRY_RUN=1 — broadcast skipped");
            continue;
        }

        const out = await postJson("/agentic/chain/tx/broadcast", {
            signedTransaction: signed,
        });
        console.log("  broadcast:", JSON.stringify(out, null, 2));

        if (out.txHash && !out.pending) {
            const rec = await getJson(`/agentic/chain/tx/${out.txHash}`);
            console.log("  receipt:", rec);
        }
    }

    console.log("\n✅ E2E finished.\n");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
