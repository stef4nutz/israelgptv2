import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import Guild from '../models/Guild';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong and DB status!'),
    async execute(interaction: ChatInputCommandInteraction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        
        // Database check example
        let dbStatus = 'Connected';
        try {
            await Guild.findOne({ guildId: interaction.guildId });
        } catch (e) {
            dbStatus = 'Error connecting to DB';
        }

        await interaction.editReply(`Roundtrip latency: ${latency}ms\nWebsocket heartbeat: ${interaction.client.ws.ping}ms\nDatabase Status: ${dbStatus}`);
    },
};
