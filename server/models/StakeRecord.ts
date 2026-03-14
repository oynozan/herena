import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IStakeRecord {
    user: string;
    amount: string;
    action: "stake" | "unstake";
    timestamp: Date;
}

export interface IStakeRecordDocument extends IStakeRecord, Document {
    _id: Types.ObjectId;
}

const StakeRecordSchema = new Schema<IStakeRecordDocument>(
    {
        user: { type: String, required: true, lowercase: true, index: true },
        amount: { type: String, required: true },
        action: { type: String, enum: ["stake", "unstake"], required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

export const StakeRecord: Model<IStakeRecordDocument> =
    mongoose.models.StakeRecord ||
    mongoose.model<IStakeRecordDocument>("StakeRecord", StakeRecordSchema);

export default StakeRecord;
