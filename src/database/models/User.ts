import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
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
    registeredAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
