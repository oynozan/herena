/**
 * OpenClaw / agent chain layer: unsigned tx encoding, gas estimation, broadcast relay.
 * Mirrors the same contract calls as the web client (`web/src/lib/hedera.ts`).
 */
import { ethers } from "ethers";

import { getProvider, getTaskManager, getProofManager, getVotingManager } from "./contracts";

const IFACE_PROOF = new ethers.Interface([
    "function submitProof(uint256 taskId, string proofURI) external",
]);

const IFACE_VOTE = new ethers.Interface([
    "function vote(uint256 proposalId, bool approve) external",
    "function resolveProposal(uint256 proposalId) external",
]);

const IFACE_ERC20 = new ethers.Interface([
    "function approve(address spender, uint256 amount) external returns (bool)",
]);

const IFACE_STAKE = new ethers.Interface([
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
]);

function reqAddr(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env ${name}`);
    return v;
}

export function assertChainConfig(): {
    proofManager: string;
    votingManager: string;
    herena: string;
    stakingManager: string;
} {
    return {
        proofManager: reqAddr("PROOF_MANAGER_ADDRESS"),
        votingManager: reqAddr("VOTING_MANAGER_ADDRESS"),
        herena: reqAddr("HERENA_ADDRESS"),
        stakingManager: reqAddr("STAKING_MANAGER_ADDRESS"),
    };
}

export type TxStep = {
    order: number;
    label: string;
    to: string;
    data: string;
    value: string;
    estimatedGas?: string;
};

async function withGasEstimate(
    from: string | undefined,
    to: string,
    data: string,
    value: bigint,
): Promise<string | undefined> {
    if (!from) return undefined;
    try {
        const provider = getProvider();
        const gas = await provider.estimateGas({ from, to, data, value });
        return gas.toString();
    } catch {
        return undefined;
    }
}

export async function buildChainMeta(): Promise<{
    chainId: string;
    name: string;
    contracts: {
        herena: string;
        taskManager: string;
        proofManager: string;
        votingManager: string;
        stakingManager: string;
        swapPool: string;
    };
    rpcHint: string | null;
}> {
    assertChainConfig();
    const provider = getProvider();
    const net = await provider.getNetwork();
    const chainId = net.chainId.toString();
    return {
        chainId,
        name: net.name || "unknown",
        contracts: {
            herena: process.env.HERENA_ADDRESS!,
            taskManager: process.env.TASK_MANAGER_ADDRESS!,
            proofManager: process.env.PROOF_MANAGER_ADDRESS!,
            votingManager: process.env.VOTING_MANAGER_ADDRESS!,
            stakingManager: process.env.STAKING_MANAGER_ADDRESS!,
            swapPool: process.env.SWAP_POOL_ADDRESS!,
        },
        rpcHint: process.env.AGENT_RPC_HINT || process.env.HEDERA_RPC_URL || null,
    };
}

export async function buildSubmitProofSteps(
    taskId: bigint,
    proofURI: string,
    from?: string,
): Promise<{ steps: TxStep[]; preflight?: { onChainTaskActive: boolean } }> {
    const { proofManager } = assertChainConfig();
    const data = IFACE_PROOF.encodeFunctionData("submitProof", [taskId, proofURI]);
    const value = 0n;

    let preflight: { onChainTaskActive: boolean } | undefined;
    try {
        const tm = getTaskManager();
        const active = await tm.isTaskActive(taskId);
        preflight = { onChainTaskActive: Boolean(active) };
    } catch {
        /* ignore */
    }

    const estimatedGas = await withGasEstimate(from, proofManager, data, value);
    const steps: TxStep[] = [
        {
            order: 1,
            label: "ProofManager.submitProof(taskId, proofURI)",
            to: proofManager,
            data,
            value: "0x0",
            estimatedGas,
        },
    ];
    return { steps, preflight };
}

export async function buildVoteSteps(
    proposalId: bigint,
    approve: boolean,
    from?: string,
): Promise<{ steps: TxStep[] }> {
    const { votingManager } = assertChainConfig();
    const data = IFACE_VOTE.encodeFunctionData("vote", [proposalId, approve]);
    const value = 0n;
    const estimatedGas = await withGasEstimate(from, votingManager, data, value);
    return {
        steps: [
            {
                order: 1,
                label: "VotingManager.vote(proposalId, approve)",
                to: votingManager,
                data,
                value: "0x0",
                estimatedGas,
            },
        ],
    };
}

export async function buildResolveProposalSteps(
    proposalId: bigint,
    from?: string,
): Promise<{ steps: TxStep[] }> {
    const { votingManager } = assertChainConfig();
    const data = IFACE_VOTE.encodeFunctionData("resolveProposal", [proposalId]);
    const value = 0n;
    const estimatedGas = await withGasEstimate(from, votingManager, data, value);
    return {
        steps: [
            {
                order: 1,
                label: "VotingManager.resolveProposal(proposalId)",
                to: votingManager,
                data,
                value: "0x0",
                estimatedGas,
            },
        ],
    };
}

/** amount: HRN in wei (string) */
export async function buildStakeSteps(amountWei: bigint, from?: string): Promise<{ steps: TxStep[] }> {
    const { herena, stakingManager } = assertChainConfig();
    const approveData = IFACE_ERC20.encodeFunctionData("approve", [stakingManager, amountWei]);
    const stakeData = IFACE_STAKE.encodeFunctionData("stake", [amountWei]);
    const value = 0n;

    const gas1 = await withGasEstimate(from, herena, approveData, value);
    const gas2 = await withGasEstimate(from, stakingManager, stakeData, value);

    return {
        steps: [
            {
                order: 1,
                label: "Herena.approve(StakingManager, amount)",
                to: herena,
                data: approveData,
                value: "0x0",
                estimatedGas: gas1,
            },
            {
                order: 2,
                label: "StakingManager.stake(amount)",
                to: stakingManager,
                data: stakeData,
                value: "0x0",
                estimatedGas: gas2,
            },
        ],
    };
}

export async function buildUnstakeSteps(amountWei: bigint, from?: string): Promise<{ steps: TxStep[] }> {
    const { stakingManager } = assertChainConfig();
    const data = IFACE_STAKE.encodeFunctionData("unstake", [amountWei]);
    const value = 0n;
    const estimatedGas = await withGasEstimate(from, stakingManager, data, value);
    return {
        steps: [
            {
                order: 1,
                label: "StakingManager.unstake(amount)",
                to: stakingManager,
                data,
                value: "0x0",
                estimatedGas,
            },
        ],
    };
}

export async function broadcastSignedTransaction(signedTransaction: string): Promise<{
    txHash: string;
    status: number | null;
    blockNumber: number | null;
    contractAddress: string | null;
    pending?: boolean;
}> {
    const provider = getProvider();
    const tx = await provider.broadcastTransaction(signedTransaction);
    try {
        const receipt = await provider.waitForTransaction(tx.hash, 1, 120_000);
        return {
            txHash: receipt?.hash ?? tx.hash,
            status: receipt?.status ?? null,
            blockNumber: receipt?.blockNumber ?? null,
            contractAddress: receipt?.contractAddress ?? null,
        };
    } catch {
        return {
            txHash: tx.hash,
            status: null,
            blockNumber: null,
            contractAddress: null,
            pending: true,
        };
    }
}

export async function getTxReceipt(txHash: string) {
    const provider = getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return null;
    return {
        txHash: receipt.hash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        logsCount: receipt.logs.length,
    };
}

export async function readOnChainTask(taskId: bigint) {
    const tm = getTaskManager();
    const t = await tm.getTask(taskId);
    const activeOnChain = await tm.isTaskActive(taskId);
    return {
        id: t.id.toString(),
        description: t.description,
        rewardPerCompletion: t.rewardPerCompletion.toString(),
        maxCompletions: t.maxCompletions.toString(),
        completedCount: t.completedCount.toString(),
        deadline: t.deadline.toString(),
        /** Both struct `active` and `isTaskActive` must be true */
        active: Boolean(t.active) && Boolean(activeOnChain),
        metadataURI: t.metadataURI,
    };
}

export async function readOnChainProposal(proposalId: bigint) {
    const vm = getVotingManager();
    const p = await vm.getProposal(proposalId);
    return {
        id: p.id.toString(),
        proofId: p.proofId.toString(),
        approveVotes: p.approveVotes.toString(),
        rejectVotes: p.rejectVotes.toString(),
        voteStart: p.voteStart.toString(),
        voteEnd: p.voteEnd.toString(),
        resolved: p.resolved,
        approved: p.approved,
    };
}

export async function readOnChainProof(proofId: bigint) {
    const pm = getProofManager();
    const proof = await pm.getProof(proofId);
    return {
        id: proof.id.toString(),
        taskId: proof.taskId.toString(),
        submitter: proof.submitter,
        proofURI: proof.proofURI,
        timestamp: proof.timestamp.toString(),
        resolved: proof.resolved,
    };
}
