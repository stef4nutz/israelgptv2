import mongoose from 'mongoose';

const ShopItemSchema = new mongoose.Schema({
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    limit: { type: Number, default: -1 }, // Max per user, -1 for unlimited
    stock: { type: Number, default: -1 }, // Total available, -1 for unlimited
    soldCount: { type: Number, default: 0 }, // How many bought globally
    category: { type: String, default: 'General' },
    createdAt: { type: Date, default: Date.now }
});

/*
  MANUAL ADDITION OF ITEMS (Script snippet):
  
  await ShopItem.create({
      itemId: 'mossad_gear',
      name: 'MOSSAD Tactical Gear',
      description: 'Elite gear for the most secret of missions.',
      price: 50000,
      category: 'Equipment'
  });
*/

export default mongoose.model('ShopItem', ShopItemSchema);
