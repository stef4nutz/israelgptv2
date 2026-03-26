import mongoose from 'mongoose';

const EsexStatsSchema = new mongoose.Schema({
    userA: { type: String, required: true, index: true },
    userB: { type: String, required: true, index: true },
    count: { type: Number, default: 0 }
});

// Compound index for efficient pair lookups
EsexStatsSchema.index({ userA: 1, userB: 1 }, { unique: true });

export default mongoose.model('EsexStats', EsexStatsSchema);
