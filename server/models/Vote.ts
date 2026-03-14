import mongoose, { Schema, type Model, type Document, Types } from "mongoose";

export interface IVote {
    proposalId: number;
    voter: string;
    approve: boolean;
    votingPower: number;
    timestamp: Date;
}

export interface IVoteDocument extends IVote, Document {
    _id: Types.ObjectId;
}

const VoteSchema = new Schema<IVoteDocument>(
    {
        proposalId: { type: Number, required: true, index: true },
        voter: { type: String, required: true, lowercase: true, index: true },
        approve: { type: Boolean, required: true },
        votingPower: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { versionKey: false },
);

VoteSchema.index({ proposalId: 1, voter: 1 }, { unique: true });

export const Vote: Model<IVoteDocument> =
    mongoose.models.Vote || mongoose.model<IVoteDocument>("Vote", VoteSchema);

export default Vote;
