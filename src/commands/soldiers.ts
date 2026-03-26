import { SlashCommandBuilder, ChatInputCommandInteraction, Message, EmbedBuilder, MessageFlags } from 'discord.js';
import User from '../database/models/User';

export default {
    data: new SlashCommandBuilder()
        .setName('soldiers')
        .setDescription('Shows the military strength of both nations.'),

    async execute(interaction: ChatInputCommandInteraction) {
        return this.handleSoldiersCommand(interaction);
    },

    async messageExecute(message: Message, args: string[]) {
        return this.handleSoldiersCommand(message);
    },

    async handleSoldiersCommand(context: any) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        const authorId = isInteraction ? context.user.id : context.author.id;

        const senderData = await User.findOne({ userId: authorId });
        
        // Authorization check
        if (!senderData || (!senderData.isPresident && !senderData.isVicePresident && !senderData.isPrimeMinister)) {
            const msg = '❌ **Access Denied.** Only the President, Vice President, or Prime Minister can review the troops.';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const israelMilitary = await User.find({ nationality: 'Israelian', isMilitary: true });
        const americanMilitary = await User.find({ nationality: 'American', isMilitary: true });

        const embed = new EmbedBuilder()
            .setTitle('🎖️ National Military Rosters')
            .setColor(0x7289DA)
            .addFields(
                { 
                    name: '🇮🇱 Israelian Defense Forces (IDF)', 
                    value: israelMilitary.length > 0 
                        ? israelMilitary.map(u => `• ${u.username} (${u.militaryBranch})`).join('\n') 
                        : 'None registered.',
                    inline: false 
                },
                { 
                    name: '🇺🇸 American Armed Forces', 
                    value: americanMilitary.length > 0 
                        ? americanMilitary.map(u => `• ${u.username} (${u.militaryBranch})`).join('\n') 
                        : 'None registered.',
                    inline: false 
                }
            )
            .setFooter({ text: `Requested by ${senderData.username}` })
            .setTimestamp();

        return isInteraction ? context.reply({ embeds: [embed] }) : context.reply({ embeds: [embed] });
    }
};
