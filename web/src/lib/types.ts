export interface Task {
    id: string;
    title: string;
    description: string;
    category: TaskCategory;
    reward: number;
    proofType: string;
    status: TaskStatus;
    deadline: string;
    participants: number;
    maxParticipants: number;
    completedCount: number;
    createdAt: string;
}

export type TaskCategory = "trees" | "carbon" | "recycling" | "water" | "energy" | "other";

export type TaskStatus = "active" | "completed" | "expired" | "pending_verification";

export interface UserTask {
    id: string;
    task: Task;
    status: UserTaskStatus;
    proofUrl?: string;
    submittedAt?: string;
    earnedRN: number;
    txHash?: string;
}

export type UserTaskStatus =
    | "joined"
    | "proof_submitted"
    | "pending_verification"
    | "approved"
    | "rejected";

export interface Proposal {
    id: string;
    title: string;
    type: ProposalType;
    description: string;
    status: ProposalStatus;
    votingEnds: string;
    yesVotes: number;
    noVotes: number;
    totalVoters: number;
    taskProof?: {
        taskTitle: string;
        volunteer: string;
        proofUrl: string;
    };
}

export type ProposalType = "task_verification" | "parameter_change";

export type ProposalStatus = "active" | "passed" | "rejected" | "expired";

export interface StakingInfo {
    stakedRN: number;
    votingPower: number;
    rewards: number;
    apy: number;
}
