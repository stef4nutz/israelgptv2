import { init as initDatabase } from '../database/mongoose';
import ShopItem from '../database/models/ShopItem';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
    await initDatabase();
    
    const items = [
        {
            itemId: 'test_item',
            name: 'Test Zion Item',
            description: 'A simple item for testing the Israel Web Shop.',
            price: 100,
            category: 'Testing'
        },
        {
            itemId: 'kosher_wine',
            name: 'Elite Kosher Wine',
            description: 'The finest wine from the Golan Heights.',
            price: 500,
            category: 'Food & Drink'
        },
        {
            itemId: 'iron_dome_mini',
            name: 'Mini Iron Dome',
            description: 'Protects your room from small domestic projectiles.',
            price: 50000,
            category: 'Defense'
        }
    ];

    for (const item of items) {
        await ShopItem.findOneAndUpdate(
            { itemId: item.itemId },
            item,
            { upspert: true, new: true, setDefaultsOnInsert: true, upsert: true }
        );
    }

    console.log('Shop items seeded successfully!');
    process.exit(0);
};

seed();
