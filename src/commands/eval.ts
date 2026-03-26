import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import * as util from 'util';

const ALLOWED_IDS = ['413326085065801729', '418938236048506880'];

export default {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Execute JavaScript code (Admin Only)')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code to execute')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!ALLOWED_IDS.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ **Access Denied.**', flags: [MessageFlags.Ephemeral] });
        }

        const code = interaction.options.getString('code', true);
        await this.runEval(interaction, code);
    },

    async messageExecute(message: Message, args: string[]) {
        if (!ALLOWED_IDS.includes(message.author.id)) {
            return message.reply('❌ **Access Denied.**');
        }

        const code = args.join(' ');
        if (!code) return message.reply('❌ Please provide code to execute.');

        await this.runEval(message, code);
    },

    async runEval(context: any, code: string) {
        try {
            // Remove code blocks if present
            const cleanCode = code.replace(/^```(js|javascript|ts|typescript|tsx)?\n|```$/g, '').trim();
            
            let evaluated = eval(cleanCode);
            if (evaluated instanceof Promise) evaluated = await evaluated;

            let result = util.inspect(evaluated, { depth: 0 });
            
            // Limit result length
            if (result.length > 1900) result = result.substring(0, 1900) + '...';

            const response = `✅ **Result:**\n\`\`\`js\n${result}\n\`\`\``;
            
            if (context.editReply) {
                await context.editReply(response);
            } else {
                await context.reply(response);
            }
        } catch (error: any) {
            const errResponse = `❌ **Error:**\n\`\`\`js\n${error.message}\n\`\`\``;
            if (context.editReply) {
                await context.editReply(errResponse);
            } else {
                await context.reply(errResponse);
            }
        }
    }
};
