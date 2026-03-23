import type { Task, UserProof, Proposal, StakingInfo, TaskProof } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Privy must not be imported at module top level: Server Components import this file and
 * @privy-io/react-auth uses React createContext, which breaks in the RSC React build.
 *
 * Cached with 30s TTL + in-flight deduplication to avoid 429 rate limits.
 */
let _cachedToken: string | null = null;
let _cacheExpiry = 0;
let _pendingPromise: Promise<string> | null = null;

async function getPrivyIdentityToken(): Promise<string> {
    if (typeof window === "undefined") return "";
    if (_cachedToken && Date.now() < _cacheExpiry) return _cachedToken;
    if (_pendingPromise) return _pendingPromise;

    _pendingPromise = (async () => {
        try {
            const { getIdentityToken } = await import("@privy-io/react-auth");
            const token = (await getIdentityToken()) || "";
            _cachedToken = token;
            _cacheExpiry = Date.now() + 30_000;
            return token;
        } catch {
            return "";
        } finally {
            _pendingPromise = null;
        }
    })();

    return _pendingPromise;
}

export interface AppConfig {
    ipfsGateway: string | null;
}

let configCache: AppConfig | null = null;

export async function fetchConfig(): Promise<AppConfig> {
    if (configCache) return configCache;
    configCache = await request<AppConfig>("/config");
    return configCache;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchWithWallet(url: string, options?: any) {
    const token = await getPrivyIdentityToken();

    const headers = {
        ...options?.headers,
        "privy-id-token": token || "",
    };

    return fetch(url, { ...options, headers });
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetchWithWallet(`${API_URL}${path}`, {
        credentials: "include",
        ...options,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
    }

    return res.json();
}

/**
 * Triggers immediate server-side event sync, then calls the provided
 * fetch function with retries until the data satisfies the predicate.
 * Use after successful on-chain transactions to get fresh data.
 */
export async function triggerSync<T>(
    fetchFn: () => Promise<T>,
    predicate?: (data: T) => boolean,
    maxRetries = 5,
): Promise<T> {
    // Trigger server-side event processing
    await request("/events/sync", { method: "POST" }).catch(() => {});

    // Fetch and optionally retry until predicate is satisfied
    for (let i = 0; i < maxRetries; i++) {
        const data = await fetchFn();
        if (!predicate || predicate(data)) return data;
        // Wait before retrying — give the chain + sync time to propagate
        await new Promise(r => setTimeout(r, 2000));
        await request("/events/sync", { method: "POST" }).catch(() => {});
    }

    // Return whatever we have after retries
    return fetchFn();
}

export interface TasksResponse {
    tasks: Task[];
    total: number;
    page: number;
    totalPages: number;
}

export interface TaskFilters {
    search?: string;
    category?: string;
    minReward?: string;
    maxReward?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export async function fetchTasks(filters: TaskFilters = {}): Promise<TasksResponse> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.minReward) params.set("minReward", filters.minReward);
    if (filters.maxReward) params.set("maxReward", filters.maxReward);
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return request<TasksResponse>(`/tasks${qs ? `?${qs}` : ""}`);
}

export async function fetchTask(id: string): Promise<Task> {
    return request<Task>(`/tasks/${id}`);
}

export interface TaskProofsResponse {
    proofs: TaskProof[];
    total: number;
    page: number;
    totalPages: number;
}

export async function fetchTaskProofs(
    taskId: string,
    opts: { page?: number; limit?: number } = {},
): Promise<TaskProofsResponse> {
    const params = new URLSearchParams();
    if (opts.page) params.set("page", String(opts.page));
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<TaskProofsResponse>(`/tasks/${taskId}/proofs${qs ? `?${qs}` : ""}`);
}

export async function uploadProofImage(file: File): Promise<{ cid: string; src: string }> {
    console.log("[api] uploadProofImage: file", file?.name, file?.size, file?.type);
    const form = new FormData();
    form.append("file", file);
    const res = await fetchWithWallet(`${API_URL}/proof-artifacts/image`, {
        method: "POST",
        credentials: "include",
        body: form,
    });
    console.log("[api] uploadProofImage: res.status", res.status);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[api] uploadProofImage: error", body);
        throw new Error(body.error || `Upload failed: ${res.status}`);
    }
    const data = await res.json();
    console.log("[api] uploadProofImage: success", data);
    return data;
}

export async function uploadProofArtifact(
    payload: { v: number; tiptap: object },
): Promise<{ uri: string }> {
    console.log("[api] uploadProofArtifact: payload.v", payload?.v);
    const data = await request<{ uri: string }>("/proof-artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
    });
    console.log("[api] uploadProofArtifact: success", data);
    return data;
}

export interface ProposalsResponse {
    proposals: Proposal[];
    total: number;
    page: number;
    totalPages: number;
}

export async function fetchProposals(
    filters: { status?: string; page?: number; limit?: number } = {},
): Promise<ProposalsResponse> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return request<ProposalsResponse>(`/proposals${qs ? `?${qs}` : ""}`);
}

export async function fetchProposal(id: string): Promise<Proposal> {
    return request<Proposal>(`/proposals/${id}`);
}

export interface UserVote {
    id: string;
    proposalId: string;
    proposal: Proposal | null;
    approve: boolean;
    votingPower: number;
    timestamp: string;
}

export async function fetchUserProofs(wallet: string): Promise<{ proofs: UserProof[] }> {
    return request<{ proofs: UserProof[] }>(`/user/proofs?wallet=${wallet}`);
}

export async function fetchUserVotes(wallet: string): Promise<{ votes: UserVote[] }> {
    return request<{ votes: UserVote[] }>(`/user/votes?wallet=${wallet}`);
}

export async function fetchStakingInfo(wallet: string): Promise<StakingInfo> {
    return request<StakingInfo>(`/user/staking?wallet=${wallet}`);
}

export interface PoolInfo {
    hbarReserve: number;
    tokenReserve: number;
    rate: number;
    fee: number;
}

export async function fetchPoolInfo(): Promise<PoolInfo> {
    const res = await fetch(`${API_URL}/swap/pool-info`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
}

// ── Dashboard Stats ──

export interface StatsResponse {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    totalProofs: number;
    approvedProofs: number;
    rejectedProofs: number;
    totalHRN: number;
    uniqueVolunteers: number;
    totalVotes: number;
    categories: { category: string; count: number }[];
    timeline: { month: string; count: number }[];
}

export async function fetchStats(): Promise<StatsResponse> {
    return request<StatsResponse>("/stats");
}

// ── Leaderboard ──

export interface LeaderboardResponse {
    volunteers: { address: string; completedTasks: number; totalEarned: number }[];
    verifiers: { address: string; votesCast: number }[];
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
    return request<LeaderboardResponse>("/leaderboard");
}

// ── Badges ──

export interface BadgeInfo {
    badgeType: number;
    earnedAt: string;
    serialNumber: number | null;
    transactionId: string | null;
}

export async function fetchUserBadges(wallet: string): Promise<{ badges: BadgeInfo[] }> {
    return request<{ badges: BadgeInfo[] }>(`/user/badges?wallet=${wallet}`);
}

// ── Admin ──

interface AdminResult {
    success: boolean;
    txHash: string;
}

export async function checkAdmin(): Promise<boolean> {
    try {
        await request<{ admin: boolean }>("/admin/check");
        return true;
    } catch {
        return false;
    }
}

export async function adminCreateTask(data: {
    description: string;
    reward: number;
    maxCompletions: number;
    deadline: string;
    metadataURI?: string;
}): Promise<AdminResult> {
    return request<AdminResult>("/admin/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
}

export async function adminCancelTask(taskId: number): Promise<AdminResult> {
    return request<AdminResult>(`/admin/task/${taskId}`, { method: "DELETE" });
}

export async function adminPause(): Promise<AdminResult> {
    return request<AdminResult>("/admin/task/pause", { method: "POST" });
}

export async function adminUnpause(): Promise<AdminResult> {
    return request<AdminResult>("/admin/task/unpause", { method: "POST" });
}

export async function adminSetVotingDuration(duration: number): Promise<AdminResult> {
    return request<AdminResult>("/admin/voting-duration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
    });
}

export async function adminDeleteProposal(id: number): Promise<AdminResult> {
    return request<AdminResult>(`/admin/proposal/${id}`, { method: "DELETE" });
}

export async function adminResolveProposal(id: number): Promise<AdminResult> {
    return request<AdminResult>(`/admin/proposal/${id}/resolve`, { method: "POST" });
}

export async function adminSetMinStake(amount: number): Promise<AdminResult> {
    return request<AdminResult>("/admin/min-stake", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
    });
}
