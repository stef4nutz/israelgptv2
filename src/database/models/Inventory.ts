import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    items: [{
        itemId: { type: String, required: true },
        name: { type: String, required: true },
        purchaseDate: { type: Date, default: Date.now }
    }]
});

export default mongoose.model('Inventory', InventorySchema);
