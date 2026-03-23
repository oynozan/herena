import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface ITask {
    taskId: number;
    title: string;
    description: string;
    category: "trees" | "carbon" | "recycling" | "water" | "energy" | "other";
    reward: number;
    proofType: string;
    status: "active" | "completed" | "expired" | "pending_verification";
    deadline: Date;
    participants: number;
    maxParticipants: number;
    completedCount: number;
    metadataURI: string;
    txHash: string;
}

export interface ITaskDocument extends ITask, Document {
    _id: Types.ObjectId;
    createdAt: Date;
}

const TaskSchema = new Schema<ITaskDocument>(
    {
        taskId: { type: Number, required: true, unique: true, index: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        category: {
            type: String,
            default: "other",
        },
        reward: { type: Number, required: true },
        proofType: { type: String, default: "" },
        status: {
            type: String,
            enum: ["active", "completed", "expired", "pending_verification"],
            default: "active",
        },
        deadline: { type: Date, required: true },
        participants: { type: Number, default: 0 },
        maxParticipants: { type: Number, required: true },
        completedCount: { type: Number, default: 0 },
        metadataURI: { type: String, default: "" },
        txHash: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

export const Task: Model<ITaskDocument> =
    mongoose.models.Task || mongoose.model<ITaskDocument>("Task", TaskSchema);

export default Task;
