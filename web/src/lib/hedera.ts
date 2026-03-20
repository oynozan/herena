import { ethers } from "ethers";

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

function getAddress(name: string): string {
    const envKey = `NEXT_PUBLIC_${name}_ADDRESS`;
    const addr = process.env[envKey];
    if (!addr) throw new Error(`Missing ${envKey} environment variable`);
    return addr;
}

export interface SwapParams {
    fromToken: "HBAR" | "RN";
    toToken: "HBAR" | "RN";
    amount: number;
    slippage: number;
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
    credits: number;
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
        getAddress("VOTING_MANAGER"),
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

export async function stakeRN(
    walletProvider: any,
    params: StakeParams,
): Promise<string> {
    const browserProvider = getSigner(walletProvider);
    const signer = await browserProvider.getSigner();
    const amount = ethers.parseEther(String(params.amount));

    const stakingManager = new ethers.Contract(
        getAddress("STAKING_MANAGER"),
        STAKING_MANAGER_ABI,
        signer,
    );

    if (params.action === "stake") {
        const herena = new ethers.Contract(
            getAddress("HERENA"),
            HERENA_ABI,
            signer,
        );
        const approveTx = await herena.approve(getAddress("STAKING_MANAGER"), amount);
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
    const amount = ethers.parseEther(String(params.amount));
    const minOut = ethers.parseEther("0");

    const swapPool = new ethers.Contract(
        getAddress("SWAP_POOL"),
        SWAP_POOL_ABI,
        signer,
    );

    let tx;
    if (params.fromToken === "HBAR") {
        tx = await swapPool.swapHBARForToken(minOut, { value: amount });
    } else {
        const herena = new ethers.Contract(
            getAddress("HERENA"),
            HERENA_ABI,
            signer,
        );
        const approveTx = await herena.approve(getAddress("SWAP_POOL"), amount);
        await approveTx.wait();

        tx = await swapPool.swapTokenForHBAR(amount, minOut);
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
): Promise<{ hbar: number; rn: number }> {
    const browserProvider = getSigner(walletProvider);
    const balance = await browserProvider.getBalance(accountAddress);

    const herena = new ethers.Contract(
        getAddress("HERENA"),
        ["function balanceOf(address) view returns (uint256)"],
        browserProvider,
    );
    const rnBalance = await herena.balanceOf(accountAddress);

    return {
        hbar: Number(ethers.formatEther(balance)),
        rn: Number(ethers.formatEther(rnBalance)),
    };
}
