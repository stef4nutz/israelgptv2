import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    MessageFlags
} from 'discord.js';
import User from '../database/models/User';
import Relationship from '../database/models/Relationship';

export default {
    data: new SlashCommandBuilder()
        .setName('divorce')
        .setDescription('End your marriage.'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        await this.handleDivorce(interaction, interaction.user.id);
    },

    async messageExecute(message: Message, args: string[]) {
        await this.handleDivorce(message, message.author.id);
    },

    async handleDivorce(context: any, userId: string) {
        try {
            const marriage = await Relationship.findOne({
                type: 'Marriage',
                $or: [{ fromId: userId }, { toId: userId }]
            });

            if (!marriage) {
                return context.reply({ 
                    content: '❌ You are not currently married! You cannot divorce the void.', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            const spouseId = marriage.fromId === userId ? marriage.toId : marriage.fromId;

            // Fetch user nationality for flag
            const userData = await User.findOne({ userId });
            const flag = userData?.nationality === 'American' ? '🇺🇸' : '🇮🇱';

            // Delete the marriage relationship
            await Relationship.deleteOne({ _id: marriage._id });

            await context.reply({
                content: `💔 **Divorce Finalized.**\n\nYou are no longer married to <@${spouseId}>. Your citizenship status remains, but your hearts have parted ways. ${flag}`
            });

        } catch (error) {
            console.error('Error in divorce process:', error);
            await context.reply({ 
                content: 'There was an error processing your divorce papers. Please try again later.',
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};
