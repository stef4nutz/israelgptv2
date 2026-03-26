import mongoose from 'mongoose';

const ElectionSchema = new mongoose.Schema({
    isActive: { type: Boolean, default: true },
    type: { type: String, enum: ['American', 'Israelian'], required: true },
    candidates: [{
        userId: { type: String, required: true },
        username: { type: String, required: true },
        votes: { type: Number, default: 0 }
    }],
    voters: [{ type: String }], // Array of user IDs who have voted
    startedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Election', ElectionSchema);
