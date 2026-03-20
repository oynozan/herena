import type { Task, UserTask, Proposal, StakingInfo, TaskProof } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Privy must not be imported at module top level: Server Components import this file and
 * @privy-io/react-auth uses React createContext, which breaks in the RSC React build.
 */
async function getPrivyIdentityToken(): Promise<string> {
    if (typeof window === "undefined") {
        return "";
    }
    try {
        const { getIdentityToken } = await import("@privy-io/react-auth");
        return (await getIdentityToken()) || "";
    } catch {
        return "";
    }
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
}

export async function fetchTaskProofs(taskId: string): Promise<TaskProofsResponse> {
    return request<TaskProofsResponse>(`/tasks/${taskId}/proofs`);
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

export async function fetchUserTasks(wallet: string): Promise<{ userTasks: UserTask[] }> {
    return request<{ userTasks: UserTask[] }>(`/user/tasks?wallet=${wallet}`);
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
    return request<PoolInfo>("/swap/pool-info");
}
