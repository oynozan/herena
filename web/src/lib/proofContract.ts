"use client";

import { createWalletClient, createPublicClient, custom, http } from "viem";
import { hederaTestnet } from "viem/chains";

const PROOF_MANAGER_ABI = [
    {
        name: "submitProof",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "taskId", type: "uint256" },
            { name: "proofURI", type: "string" },
        ],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "hasSubmittedForTask",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "taskId", type: "uint256" },
            { name: "submitter", type: "address" },
        ],
        outputs: [{ type: "bool" }],
    },
    // Custom errors for better revert decoding
    { name: "EmptyProofURI", type: "error", inputs: [] },
    { name: "VotingManagerNotSet", type: "error", inputs: [] },
    { name: "TaskNotActive", type: "error", inputs: [] },
    { name: "CompletionLimitReached", type: "error", inputs: [] },
    { name: "AlreadySubmittedForTask", type: "error", inputs: [] },
] as const;

function getProofManagerAddress(): `0x${string}` {
    const addr = process.env.NEXT_PUBLIC_PROOF_MANAGER_ADDRESS;
    if (!addr) throw new Error("Missing NEXT_PUBLIC_PROOF_MANAGER_ADDRESS");
    return addr as `0x${string}`;
}

export interface SubmitProofParams {
    taskId: string;
    proofUrl: string;
}

/** Privy wallet from useWallets() - has address and getEthereumProvider */
export interface PrivyWallet {
    address: string;
    getEthereumProvider: () => Promise<unknown>;
    switchChain?: (chainId: number) => Promise<void>;
}

export async function submitTaskProofWithPrivy(
    wallet: PrivyWallet,
    params: SubmitProofParams,
): Promise<string> {
    try {
        console.log("[proofContract] submitTaskProof: params", params);
        console.log("[proofContract] submitTaskProof: wallet.address", wallet.address);

        await wallet.switchChain?.(hederaTestnet.id);
        const provider = await wallet.getEthereumProvider();
        console.log("[proofContract] submitTaskProof: got provider");

        const transport = custom(provider as import("viem").EIP1193Provider);

        const walletClient = createWalletClient({
            account: wallet.address as `0x${string}`,
            chain: hederaTestnet,
            transport,
        });

        const publicClient = createPublicClient({
            chain: hederaTestnet,
            transport: http(),
        });

        const proofManagerAddr = getProofManagerAddress();
        console.log("[proofContract] submitTaskProof: PROOF_MANAGER", proofManagerAddr);

        // Simulate first to get a readable revert reason (best-effort on Hedera)
        try {
            await publicClient.simulateContract({
                address: proofManagerAddr,
                abi: PROOF_MANAGER_ABI,
                functionName: "submitProof",
                args: [BigInt(params.taskId), params.proofUrl],
                account: wallet.address as `0x${string}`,
            });
        } catch (simErr: any) {
            const msg = simErr?.message || String(simErr);
            // Only throw for known contract errors; ignore Hedera RPC quirks (zero data, gas estimation)
            if (msg.includes("TaskNotActive")) throw new Error("This task is no longer active");
            if (msg.includes("AlreadySubmittedForTask")) throw new Error("You have already submitted a proof for this task");
            if (msg.includes("CompletionLimitReached")) throw new Error("This task has reached its completion limit");
            if (msg.includes("VotingManagerNotSet")) throw new Error("VotingManager is not configured on the contract");
            if (msg.includes("EmptyProofURI")) throw new Error("Proof URI cannot be empty");
            if (msg.includes("InvalidTask")) throw new Error("Invalid task ID");
            // Not a known contract error — skip simulation and try the real tx
            console.warn("[proofContract] simulation skipped (Hedera RPC):", msg.slice(0, 150));
        }

        const hash = await walletClient.writeContract({
            address: proofManagerAddr,
            abi: PROOF_MANAGER_ABI,
            functionName: "submitProof",
            args: [BigInt(params.taskId), params.proofUrl],
            gas: 3_000_000n,
        });

        console.log("[proofContract] submitTaskProof: tx hash", hash);

        // Wait for the transaction to be confirmed before returning
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log("[proofContract] submitTaskProof: confirmed, status", receipt.status);

        if (receipt.status === "reverted") {
            throw new Error("Transaction reverted on-chain");
        }

        return hash;
    } catch (err) {
        console.error("[proofContract] submitTaskProof: error", err);
        throw err;
    }
}

export async function checkHasSubmittedForTask(
    taskId: string,
    walletAddress: string,
): Promise<boolean> {
    const publicClient = createPublicClient({
        chain: hederaTestnet,
        transport: http(),
    });

    const result = await publicClient.readContract({
        address: getProofManagerAddress(),
        abi: PROOF_MANAGER_ABI,
        functionName: "hasSubmittedForTask",
        args: [BigInt(taskId), walletAddress as `0x${string}`],
    });

    return result;
}
