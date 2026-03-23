import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IProof {
    proofId: number;
    taskId: number;
    submitter: string;
    proofURI: string;
    timestamp: Date;
    resolved: boolean;
    txHash: string;
}

export interface IProofDocument extends IProof, Document {
    _id: Types.ObjectId;
}

const ProofSchema = new Schema<IProofDocument>(
    {
        proofId: { type: Number, required: true, unique: true, index: true },
        taskId: { type: Number, required: true, index: true },
        submitter: { type: String, required: true, lowercase: true, index: true },
        proofURI: { type: String, required: true },
        timestamp: { type: Date, required: true },
        resolved: { type: Boolean, default: false },
        txHash: { type: String, default: "" },
    },
    { versionKey: false },
);

export const Proof: Model<IProofDocument> =
    mongoose.models.Proof || mongoose.model<IProofDocument>("Proof", ProofSchema);

export default Proof;
