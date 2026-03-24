import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IProposal {
    proposalId: number;
    proofId: number;
    title: string;
    type: "task_verification" | "parameter_change";
    description: string;
    status: "active" | "passed" | "rejected" | "expired";
    voteStart: Date;
    voteEnd: Date;
    approveVotes: number;
    rejectVotes: number;
    totalVoters: number;
    resolved: boolean;
    approved: boolean;
    txHash: string;
    resolveTxHash: string;
    taskProof?: {
        taskId: number;
        taskTitle: string;
        volunteer: string;
        proofUrl: string;
    };
}

export interface IProposalDocument extends IProposal, Document {
    _id: Types.ObjectId;
}

const ProposalSchema = new Schema<IProposalDocument>(
    {
        proposalId: { type: Number, required: true, unique: true, index: true },
        proofId: { type: Number, required: true, index: true },
        title: { type: String, default: "" },
        type: {
            type: String,
            enum: ["task_verification", "parameter_change"],
            default: "task_verification",
        },
        description: { type: String, default: "" },
        status: {
            type: String,
            enum: ["active", "passed", "rejected", "expired"],
            default: "active",
        },
        voteStart: { type: Date, required: true },
        voteEnd: { type: Date, required: true },
        approveVotes: { type: Number, default: 0 },
        rejectVotes: { type: Number, default: 0 },
        totalVoters: { type: Number, default: 0 },
        resolved: { type: Boolean, default: false },
        approved: { type: Boolean, default: false },
        txHash: { type: String, default: "" },
        resolveTxHash: { type: String, default: "" },
        taskProof: {
            type: new Schema(
                {
                    taskId: { type: Number },
                    taskTitle: { type: String },
                    volunteer: { type: String },
                    proofUrl: { type: String },
                },
                { _id: false },
            ),
            default: undefined,
        },
    },
    { versionKey: false },
);

export const Proposal: Model<IProposalDocument> =
    mongoose.models.Proposal || mongoose.model<IProposalDocument>("Proposal", ProposalSchema);

export default Proposal;
