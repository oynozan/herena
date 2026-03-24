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
    metadataURI: string | null;
    txHash: string | null;
}

export type TaskCategory = "trees" | "carbon" | "recycling" | "water" | "energy" | "other";

export type TaskStatus = "active" | "completed" | "expired" | "pending_verification";

export interface UserProof {
    id: string;
    task: { id: string; title: string; category: string; reward: number } | null;
    proofURI: string;
    submittedAt: string;
    status: "pending" | "approved" | "rejected";
    proposal: {
        id: string;
        yesVotes: number;
        noVotes: number;
        totalVoters: number;
        votingEnds: string;
    } | null;
    earnedHRN: number;
}

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
        taskId?: number;
        taskTitle: string;
        volunteer: string;
        proofUrl: string;
    };
    txHash: string | null;
    resolveTxHash: string | null;
}

export type ProposalType = "task_verification" | "parameter_change";

export type ProposalStatus = "active" | "passed" | "rejected" | "expired";

export interface StakingInfo {
    stakedHRN: number;
    votingPower: number;
    rewards: number;
    apy: number;
}

export interface TaskProof {
    proofId: number;
    submitter: string;
    proofURI: string;
    timestamp: string;
    resolved: boolean;
    txHash: string | null;
    resolveTxHash: string | null;
}
