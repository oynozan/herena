import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IBadge {
    user: string;
    badgeType: 1 | 2 | 3 | 4;
    serialNumber?: number;
    transactionId?: string;
    timestamp: Date;
}

export interface IBadgeDocument extends IBadge, Document {
    _id: Types.ObjectId;
}

const BadgeSchema = new Schema<IBadgeDocument>(
    {
        user: { type: String, required: true, lowercase: true, index: true },
        badgeType: { type: Number, required: true, enum: [1, 2, 3, 4] },
        serialNumber: { type: Number },
        transactionId: { type: String },
        timestamp: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

BadgeSchema.index({ user: 1, badgeType: 1 }, { unique: true });

const Badge: Model<IBadgeDocument> =
    mongoose.models.Badge || mongoose.model<IBadgeDocument>("Badge", BadgeSchema);

export default Badge;
