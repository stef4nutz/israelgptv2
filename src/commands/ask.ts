import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import { generateResponse } from '../services/openrouter';

export default {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask Gemini AI anything!')
        .addStringOption(option => 
            option.setName('prompt')
                .setDescription('Your question for Gemini')
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const prompt = interaction.options.get('prompt')?.value as string;
        
        await interaction.deferReply();
        
        const response = await generateResponse(prompt);
        
        // Split response if it's too long for Discord (2000 chars)
        if (response.length > 2000) {
            const chunks = response.match(/[\s\S]{1,2000}/g) || [];
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (!chunk) continue;
                if (i === 0) await interaction.editReply(chunk);
                else await interaction.followUp(chunk);
            }
        } else {
            await interaction.editReply(response);
        }
    },
    async messageExecute(message: Message, args: string[]) {
        const prompt = args.join(' ');
        
        if (!prompt) {
            return message.reply('Please provide a prompt! Example: `$ask How are you?`');
        }

        const response = await generateResponse(prompt);

        if (response.length > 2000) {
            const chunks = response.match(/[\s\S]{1,2000}/g) || [];
            for (const chunk of chunks) {
                if (!chunk) continue;
                await message.reply(chunk);
            }
        } else {
            await message.reply(response);
        }
    },
};
