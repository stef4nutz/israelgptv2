import mongoose, { Schema, Document } from 'mongoose';

export interface IGuild extends Document {
    guildId: string;
    guildName?: string;
    prefix: string;
    joinedAt: Date;
}

const guildSchema: Schema = new Schema({
    guildId: { type: String, required: true, unique: true },
    guildName: String,
    prefix: { type: String, default: '!' },
    joinedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IGuild>('Guild', guildSchema);
