import { Events, Client, ActivityType } from 'discord.js';
import User from '../database/models/User';

export default {
    name: Events.ClientReady,
    once: true,
    async execute(client: Client) {
        console.log(`Ready! Logged in as ${client.user?.tag}`);

        const updateStatus = async () => {
            try {
                const [americanCount, israelianCount] = await Promise.all([
                    User.countDocuments({ nationality: 'American', citizenshipStatus: 'Approved' }),
                    User.countDocuments({ nationality: 'Israelian', citizenshipStatus: 'Approved' })
                ]);

                client.user?.setActivity(`Watching over ${americanCount} Americans & ${israelianCount} Israelis`, {
                    type: ActivityType.Watching
                });
            } catch (error) {
                console.error('Error updating status:', error);
            }
        };

        // Initial update
        await updateStatus();

        // Update every 5 minutes
        setInterval(updateStatus, 5 * 60 * 1000);
    },
};
