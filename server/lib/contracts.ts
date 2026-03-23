import { ethers } from "ethers";

const TASK_MANAGER_ABI = [
    "event TaskCreated(uint256 indexed id, string description, uint256 rewardPerCompletion, uint256 maxCompletions, uint256 deadline, string metadataURI)",
    "event TaskCompletionIncremented(uint256 indexed id, uint256 newCompletedCount)",
    "event TaskCancelled(uint256 indexed id, uint256 refundedAmount)",
    "function getTask(uint256 taskId) view returns (tuple(uint256 id, string description, uint256 rewardPerCompletion, uint256 maxCompletions, uint256 completedCount, uint256 deadline, bool active, string metadataURI))",
    "function createTask(string description, uint256 rewardPerCompletion, uint256 maxCompletions, uint256 deadline, string metadataURI)",
    "function cancelTask(uint256 taskId)",
    "function pause()",
    "function unpause()",
    // Custom errors (TaskManager + Treasury cascade)
    "error ZeroAddress()",
    "error ZeroAmount()",
    "error DeadlineInPast()",
    "error InvalidTask()",
    "error NotProofManager()",
    "error TaskNotActive()",
    "error NothingToRefund()",
    "error InsufficientBalance()",
    "error AmountExceedsCap()",
    "error NotTaskManager()",
    // OpenZeppelin errors
    "error OwnableUnauthorizedAccount(address account)",
    "error EnforcedPause()",
];

const PROOF_MANAGER_ABI = [
    "event ProofSubmitted(uint256 indexed proofId, uint256 indexed taskId, address indexed submitter, string proofURI)",
    "function getProof(uint256 proofId) view returns (tuple(uint256 id, uint256 taskId, address submitter, string proofURI, uint256 timestamp, bool resolved))",
];

const VOTING_MANAGER_ABI = [
    "event ProposalCreated(uint256 indexed id, uint256 indexed proofId, uint256 voteStart, uint256 voteEnd)",
    "event Voted(uint256 indexed proposalId, address indexed voter, bool approve, uint256 votingPower)",
    "event ProposalResolved(uint256 indexed id, bool approved)",
    "event VotingDurationUpdated(uint256 newDuration)",
    "event ProposalDeleted(uint256 indexed id)",
    "function getProposal(uint256 proposalId) view returns (tuple(uint256 id, uint256 proofId, uint256 approveVotes, uint256 rejectVotes, uint256 voteStart, uint256 voteEnd, bool resolved, bool approved))",
    "function setVotingDuration(uint256 _newDuration)",
    "function deleteProposal(uint256 proposalId)",
    "function resolveProposal(uint256 proposalId)",
];

const STAKING_MANAGER_ABI = [
    "event Staked(address indexed user, uint256 amount)",
    "event Unstaked(address indexed user, uint256 amount)",
    "function getStakedAmount(address user) view returns (uint256)",
    "function getVotingPower(address user) view returns (uint256)",
    "function setMinStake(uint256 _minStake)",
];

const SWAP_POOL_ABI = [
    "event SwappedHBARForToken(address indexed user, uint256 hbarIn, uint256 tokenOut)",
    "event SwappedTokenForHBAR(address indexed user, uint256 tokenIn, uint256 hbarOut)",
    "event LiquidityAdded(address indexed provider, uint256 tokenAmount, uint256 hbarAmount, uint256 lpMinted)",
    "event LiquidityRemoved(address indexed provider, uint256 tokenAmount, uint256 hbarAmount, uint256 lpBurned)",
    "function getHBARBalance() view returns (uint256)",
    "function reserveHBAR() view returns (uint256)",
    "function reserveToken() view returns (uint256)",
];

const HERENA_ABI = [
    "function balanceOf(address account) view returns (uint256)",
];

let provider: ethers.JsonRpcProvider;
let taskManager: ethers.Contract;
let proofManager: ethers.Contract;
let votingManager: ethers.Contract;
let stakingManager: ethers.Contract;
let swapPool: ethers.Contract;
let herenaToken: ethers.Contract;
let adminVotingManager: ethers.Contract | null = null;
let adminTaskManager: ethers.Contract | null = null;
let adminStakingManager: ethers.Contract | null = null;

export function initContracts() {
    const rpcUrl = process.env.HEDERA_RPC_URL;
    if (!rpcUrl) throw new Error("Missing HEDERA_RPC_URL env var");

    provider = new ethers.JsonRpcProvider(rpcUrl);

    const addresses = {
        taskManager: process.env.TASK_MANAGER_ADDRESS!,
        proofManager: process.env.PROOF_MANAGER_ADDRESS!,
        votingManager: process.env.VOTING_MANAGER_ADDRESS!,
        stakingManager: process.env.STAKING_MANAGER_ADDRESS!,
        swapPool: process.env.SWAP_POOL_ADDRESS!,
        herena: process.env.HERENA_ADDRESS!,
    };

    for (const [name, addr] of Object.entries(addresses)) {
        if (!addr) throw new Error(`Missing ${name.replace(/([A-Z])/g, "_$1").toUpperCase()}_ADDRESS env var`);
    }

    taskManager = new ethers.Contract(addresses.taskManager, TASK_MANAGER_ABI, provider);
    proofManager = new ethers.Contract(addresses.proofManager, PROOF_MANAGER_ABI, provider);
    votingManager = new ethers.Contract(addresses.votingManager, VOTING_MANAGER_ABI, provider);
    stakingManager = new ethers.Contract(addresses.stakingManager, STAKING_MANAGER_ABI, provider);
    swapPool = new ethers.Contract(addresses.swapPool, SWAP_POOL_ABI, provider);
    herenaToken = new ethers.Contract(addresses.herena, HERENA_ABI, provider);

    // Admin signer for write operations (optional — only needed for admin routes)
    const adminKey = process.env.ADMIN_PRIVATE_KEY;
    if (adminKey) {
        const signer = new ethers.Wallet(adminKey, provider);
        adminVotingManager = new ethers.Contract(addresses.votingManager, VOTING_MANAGER_ABI, signer);
        adminTaskManager = new ethers.Contract(addresses.taskManager, TASK_MANAGER_ABI, signer);
        adminStakingManager = new ethers.Contract(addresses.stakingManager, STAKING_MANAGER_ABI, signer);
    }
}

export function getProvider() {
    return provider;
}

export function getTaskManager() {
    return taskManager;
}

export function getProofManager() {
    return proofManager;
}

export function getVotingManager() {
    return votingManager;
}

export function getStakingManager() {
    return stakingManager;
}

export function getSwapPool() {
    return swapPool;
}

export function getHerenaToken() {
    return herenaToken;
}

export function getAdminVotingManager() {
    if (!adminVotingManager) throw new Error("ADMIN_PRIVATE_KEY not configured");
    return adminVotingManager;
}

export function getAdminTaskManager() {
    if (!adminTaskManager) throw new Error("ADMIN_PRIVATE_KEY not configured");
    return adminTaskManager;
}

export function getAdminStakingManager() {
    if (!adminStakingManager) throw new Error("ADMIN_PRIVATE_KEY not configured");
    return adminStakingManager;
}
