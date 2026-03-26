import mongoose from 'mongoose';

const RelationshipSchema = new mongoose.Schema({
    fromId: { type: String, required: true, index: true }, // Adopter OR Spouse 1
    toId: { type: String, required: true, index: true },   // Adoptee OR Spouse 2
    type: { 
        type: String, 
        required: true, 
        enum: ['Adoption', 'Marriage'],
        index: true 
    },
    timestamp: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate relationships
RelationshipSchema.index({ fromId: 1, toId: 1, type: 1 }, { unique: true });

export default mongoose.model('Relationship', RelationshipSchema);
