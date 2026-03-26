import mongoose from 'mongoose';
import User from '../database/models/User';
import Relationship from '../database/models/Relationship';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    try {
        // NOTE: This assumes you are connected to MongoDB.
        // If running this standalone, you'd need:
        // await mongoose.connect(process.env.MONGODB_URI!);

        console.log('🔍 Starting Relationship Migration...');
        
        // Use lean() to access fields not in the updated schema
        const users = await (User.find() as any).lean();
        let marriageCount = 0;
        let adoptionCount = 0;

        for (const user of users) {
            // 1. Migrate Marriage
            if (user.marriedTo) {
                const exists = await Relationship.exists({
                    type: 'Marriage',
                    $or: [
                        { fromId: user.userId, toId: user.marriedTo },
                        { fromId: user.marriedTo, toId: user.userId }
                    ]
                });

                if (!exists) {
                    await Relationship.create({
                        fromId: user.userId,
                        toId: user.marriedTo,
                        type: 'Marriage'
                    });
                    marriageCount++;
                }
            }

            // 2. Migrate Children (Adoptions)
            if (user.children && Array.isArray(user.children)) {
                for (const childId of user.children) {
                    const exists = await Relationship.exists({
                        fromId: user.userId,
                        toId: childId,
                        type: 'Adoption'
                    });

                    if (!exists) {
                        await Relationship.create({
                            fromId: user.userId,
                            toId: childId,
                            type: 'Adoption'
                        });
                        adoptionCount++;
                    }
                }
            }
        }

        console.log('✅ Migration Complete!');
        console.log(`💍 Marriages created: ${marriageCount}`);
        console.log(`👨‍👩‍👦 Adoptions created: ${adoptionCount}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

// migrate(); // Uncomment to run
export default migrate;
