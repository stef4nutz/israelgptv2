import mongoose from 'mongoose';

const NationalBankSchema = new mongoose.Schema({
    nation: { type: String, enum: ['American', 'Israelian'], required: true, unique: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, required: true },
    motto: { type: String, default: 'No motto set yet.' }
});

export default mongoose.model('NationalBank', NationalBankSchema);
