import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface ISwapRecord {
    user: string;
    type: "hbarToToken" | "tokenToHbar";
    amountIn: string;
    amountOut: string;
    timestamp: Date;
}

export interface ISwapRecordDocument extends ISwapRecord, Document {
    _id: Types.ObjectId;
}

const SwapRecordSchema = new Schema<ISwapRecordDocument>(
    {
        user: { type: String, required: true, lowercase: true, index: true },
        type: { type: String, enum: ["hbarToToken", "tokenToHbar"], required: true },
        amountIn: { type: String, required: true },
        amountOut: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

export const SwapRecord: Model<ISwapRecordDocument> =
    mongoose.models.SwapRecord ||
    mongoose.model<ISwapRecordDocument>("SwapRecord", SwapRecordSchema);

export default SwapRecord;
