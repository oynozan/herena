import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IUserTask {
    user: string;
    taskId: number;
    status: "joined" | "proof_submitted" | "pending_verification" | "approved" | "rejected";
    proofUrl?: string;
    submittedAt?: Date;
    earnedRN: number;
    txHash?: string;
}

export interface IUserTaskDocument extends IUserTask, Document {
    _id: Types.ObjectId;
    createdAt: Date;
}

const UserTaskSchema = new Schema<IUserTaskDocument>(
    {
        user: { type: String, required: true, lowercase: true, index: true },
        taskId: { type: Number, required: true, index: true },
        status: {
            type: String,
            enum: ["joined", "proof_submitted", "pending_verification", "approved", "rejected"],
            default: "joined",
        },
        proofUrl: { type: String },
        submittedAt: { type: Date },
        earnedRN: { type: Number, default: 0 },
        txHash: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

UserTaskSchema.index({ user: 1, taskId: 1 }, { unique: true });

export const UserTask: Model<IUserTaskDocument> =
    mongoose.models.UserTask || mongoose.model<IUserTaskDocument>("UserTask", UserTaskSchema);

export default UserTask;
