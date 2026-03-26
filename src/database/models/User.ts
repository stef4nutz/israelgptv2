import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUser extends Document {
    userId: string;
    username: string;
    nationality: string;
    age?: number;
    gender?: string;
    pronouns?: string;
    reasonForImmigration?: string;
    citizenshipStatus: string;
    isPresident: boolean;
    presidentOf: 'American' | 'Israelian' | 'None';
    isVicePresident: boolean;
    vicePresidentOf: 'American' | 'Israelian' | 'None';
    isPrimeMinister: boolean;
    primeMinisterOf: 'American' | 'Israelian' | 'None';
    lastJobAt?: Date;
    lastStimulusAt?: Date;
    lastDonateAt?: Date;
    isMilitary: boolean;
    militaryBranch: 'IDF' | 'U.S. Armed Forces' | 'None';
    registeredAt: Date;
    partyId?: Types.ObjectId;
}

const UserSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    nationality: { type: String, default: 'Undisclosed' },
    age: { type: Number },
    gender: { type: String },
    pronouns: { type: String },
    reasonForImmigration: { type: String },
    citizenshipStatus: { type: String, default: 'Pending' },
    isPresident: { type: Boolean, default: false },
    presidentOf: { type: String, enum: ['American', 'Israelian', 'None'], default: 'None' },
    isVicePresident: { type: Boolean, default: false },
    vicePresidentOf: { type: String, enum: ['American', 'Israelian', 'None'], default: 'None' },
    isPrimeMinister: { type: Boolean, default: false },
    primeMinisterOf: { type: String, enum: ['American', 'Israelian', 'None'], default: 'None' },
    lastJobAt: { type: Date },
    lastStimulusAt: { type: Date },
    lastDonateAt: { type: Date },
    isMilitary: { type: Boolean, default: false },
    militaryBranch: { type: String, enum: ['IDF', 'U.S. Armed Forces', 'None'], default: 'None' },
    registeredAt: { type: Date, default: Date.now },
    partyId: { type: Schema.Types.ObjectId, ref: 'PoliticalParty' }
});

export default mongoose.model<IUser>('User', UserSchema);
