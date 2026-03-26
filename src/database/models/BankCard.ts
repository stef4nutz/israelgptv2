import mongoose from 'mongoose';

const BankCardSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    cardNumber: { type: String, required: true },
    cvv: { type: String, required: true },
    expiryDate: { type: String, required: true },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('BankCard', BankCardSchema);
