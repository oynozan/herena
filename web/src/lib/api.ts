import type { Task, UserTask, Proposal, StakingInfo } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
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

export async function joinTask(taskId: string, wallet: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/tasks/${taskId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
    });
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
