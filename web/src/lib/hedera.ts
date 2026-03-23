import { ethers } from "ethers";

/** Hedera native HBAR uses 8 decimals (tinybars), not 18 */
const HBAR_DECIMALS = 8;

const VOTING_MANAGER_ABI = [
    "function vote(uint256 proposalId, bool approve) external",
];

const STAKING_MANAGER_ABI = [
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
];

const SWAP_POOL_ABI = [
    "function swapHBARForToken(uint256 minAmountOut) external payable",
    "function swapTokenForHBAR(uint256 tokenAmount, uint256 minAmountOut) external",
];

const HERENA_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
];

function requireAddress(addr: string | undefined, name: string): string {
    if (!addr) throw new Error(`Missing ${name} environment variable`);
    return addr;
}

export interface SwapParams {
    fromToken: "HBAR" | "HRN";
    toToken: "HBAR" | "HRN";
    amount: number;
    slippage: number;
    expectedOutput: number;
}

export interface SwapResult {
    txHash: string;
    fromAmount: number;
    toAmount: number;
    fee: number;
}

export interface StakeParams {
    amount: number;
    action: "stake" | "unstake";
}

export interface VoteParams {
    proposalId: string;
    direction: "yes" | "no";
}

function getSigner(walletProvider: any): ethers.BrowserProvider {
    return new ethers.BrowserProvider(walletProvider);
}

export async function castVote(
    walletProvider: any,
    params: VoteParams,
): Promise<string> {
    const browserProvider = getSigner(walletProvider);
    const signer = await browserProvider.getSigner();

    const votingManager = new ethers.Contract(
        requireAddress(process.env.NEXT_PUBLIC_VOTING_MANAGER_ADDRESS, "NEXT_PUBLIC_VOTING_MANAGER_ADDRESS"),
        VOTING_MANAGER_ABI,
        signer,
    );

    const tx = await votingManager.vote(
        BigInt(params.proposalId),
        params.direction === "yes",
    );
    const receipt = await tx.wait();
    return receipt.hash;
}

export async function stakeHRN(
    walletProvider: any,
    params: StakeParams,
): Promise<string> {
    const browserProvider = getSigner(walletProvider);
    const signer = await browserProvider.getSigner();
    const amount = ethers.parseEther(String(params.amount));

    const stakingManager = new ethers.Contract(
        requireAddress(process.env.NEXT_PUBLIC_STAKING_MANAGER_ADDRESS, "NEXT_PUBLIC_STAKING_MANAGER_ADDRESS"),
        STAKING_MANAGER_ABI,
        signer,
    );

    if (params.action === "stake") {
        const herena = new ethers.Contract(
            requireAddress(process.env.NEXT_PUBLIC_HERENA_ADDRESS, "NEXT_PUBLIC_HERENA_ADDRESS"),
            HERENA_ABI,
            signer,
        );
        const approveTx = await herena.approve(requireAddress(process.env.NEXT_PUBLIC_STAKING_MANAGER_ADDRESS, "NEXT_PUBLIC_STAKING_MANAGER_ADDRESS"), amount);
        await approveTx.wait();

        const tx = await stakingManager.stake(amount);
        const receipt = await tx.wait();
        return receipt.hash;
    } else {
        const tx = await stakingManager.unstake(amount);
        const receipt = await tx.wait();
        return receipt.hash;
    }
}

export async function executeSwap(
    walletProvider: any,
    params: SwapParams,
): Promise<SwapResult> {
    const browserProvider = getSigner(walletProvider);
    const signer = await browserProvider.getSigner();
    const minOutValue = params.expectedOutput * (1 - params.slippage / 100);

    const swapPool = new ethers.Contract(
        requireAddress(process.env.NEXT_PUBLIC_SWAP_POOL_ADDRESS, "NEXT_PUBLIC_SWAP_POOL_ADDRESS"),
        SWAP_POOL_ABI,
        signer,
    );

    let tx;
    if (params.fromToken === "HBAR") {
        // Relay expects value in weibars (18 decimals); contract receives tinybars
        const hbarAmount = ethers.parseEther(String(params.amount));
        // minOut is in token wei (18 decimals) since output is HRN
        const minOut = ethers.parseEther(String(Math.max(0, minOutValue).toFixed(18)));
        tx = await swapPool.swapHBARForToken(minOut, { value: hbarAmount });
    } else {
        // HRN token amount in wei (18 decimals)
        const tokenAmount = ethers.parseEther(String(params.amount));
        // minOut is in tinybars (8 decimals) since output is HBAR
        const minOut = ethers.parseUnits(String(Math.max(0, minOutValue).toFixed(8)), HBAR_DECIMALS);
        const herena = new ethers.Contract(
            requireAddress(process.env.NEXT_PUBLIC_HERENA_ADDRESS, "NEXT_PUBLIC_HERENA_ADDRESS"),
            HERENA_ABI,
            signer,
        );
        const approveTx = await herena.approve(requireAddress(process.env.NEXT_PUBLIC_SWAP_POOL_ADDRESS, "NEXT_PUBLIC_SWAP_POOL_ADDRESS"), tokenAmount);
        await approveTx.wait();

        tx = await swapPool.swapTokenForHBAR(tokenAmount, minOut);
    }

    const receipt = await tx.wait();
    return {
        txHash: receipt.hash,
        fromAmount: params.amount,
        toAmount: 0,
        fee: 0,
    };
}

export async function getAccountBalance(
    walletProvider: any,
    accountAddress: string,
): Promise<{ hbar: number; hrn: number }> {
    const browserProvider = getSigner(walletProvider);
    const balance = await browserProvider.getBalance(accountAddress);

    const herena = new ethers.Contract(
        requireAddress(process.env.NEXT_PUBLIC_HERENA_ADDRESS, "NEXT_PUBLIC_HERENA_ADDRESS"),
        ["function balanceOf(address) view returns (uint256)"],
        browserProvider,
    );
    const hrnBalance = await herena.balanceOf(accountAddress);

    return {
        // Hedera JSON-RPC relay returns balance in weibars (18 decimals)
        hbar: Number(ethers.formatEther(balance)),
        hrn: Number(ethers.formatEther(hrnBalance)),
    };
}
