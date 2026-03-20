"use client";

import { createWalletClient, custom } from "viem";
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

        const walletClient = createWalletClient({
            account: wallet.address as `0x${string}`,
            chain: hederaTestnet,
            transport: custom(provider as import("viem").EIP1193Provider),
        });

        const proofManagerAddr = getProofManagerAddress();
        console.log("[proofContract] submitTaskProof: PROOF_MANAGER", proofManagerAddr);
        console.log("[proofContract] submitTaskProof: calling writeContract", {
            taskId: params.taskId,
            proofUrl: params.proofUrl,
        });

        const hash = await walletClient.writeContract({
            address: proofManagerAddr,
            abi: PROOF_MANAGER_ABI,
            functionName: "submitProof",
            args: [BigInt(params.taskId), params.proofUrl],
        });

        console.log("[proofContract] submitTaskProof: tx hash", hash);
        return hash;
    } catch (err) {
        console.error("[proofContract] submitTaskProof: error", err);
        throw err;
    }
}
