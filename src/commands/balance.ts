import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import BankCard from '../database/models/BankCard';
import User from '../database/models/User';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your card balance!'),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const user = await User.findOne({ userId: interaction.user.id });
        const card = await BankCard.findOne({ userId: interaction.user.id });

        if (!card) {
            const cardName = user?.nationality === 'American' ? 'Visamerican' : 'Visarel';
            return interaction.editReply(`❌ You do not have a ${cardName} card yet! Use \`/registercard\` to get one.`);
        }

        const isAmerican = user?.nationality === 'American';
        const cardName = isAmerican ? 'Visamerican' : 'Visarel';
        const currency = isAmerican ? '$' : '₪';

        await interaction.editReply(`💳 **${cardName} Bank Balance**\n\n**Account Holder:** ${interaction.user.username}\n**Current Balance:** ${currency}${card.balance.toLocaleString()}`);
    },

    async messageExecute(message: Message, args: string[]) {
        const user = await User.findOne({ userId: message.author.id });
        const card = await BankCard.findOne({ userId: message.author.id });

        if (!card) {
            const cardName = user?.nationality === 'American' ? 'Visamerican' : 'Visarel';
            return message.reply(`❌ You do not have a ${cardName} card yet! Type \`$registercard\` to get one.`);
        }

        const isAmerican = user?.nationality === 'American';
        const cardName = isAmerican ? 'Visamerican' : 'Visarel';
        const currency = isAmerican ? '$' : '₪';

        await message.reply(`💳 **${cardName} Bank Balance**\n\n**Account Holder:** ${message.author.username}\n**Current Balance:** ${currency}${card.balance.toLocaleString()}`);
    }
};
