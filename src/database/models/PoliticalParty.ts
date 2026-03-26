import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPoliticalParty extends Document {
    name: string;
    motto: string;
    emoji: string;
    nationality: 'American' | 'Israelian';
    leaderId: string;
    memberIds: string[];
    createdAt: Date;
}

const PoliticalPartySchema = new Schema({
    name: { type: String, required: true, unique: true },
    motto: { type: String, default: 'No motto set yet.' },
    emoji: { type: String, default: '🚩' },
    nationality: { type: String, enum: ['American', 'Israelian'], required: true },
    leaderId: { type: String, required: true },
    memberIds: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IPoliticalParty>('PoliticalParty', PoliticalPartySchema);
