import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import User from '../database/models/User';
import BankCard from '../database/models/BankCard';

export default {
    data: new SlashCommandBuilder()
        .setName('registercard')
        .setDescription('Register for your Visarel debit card!'),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const user = await User.findOne({ userId: interaction.user.id });

        if (!user || user.citizenshipStatus !== 'Approved') {
            return interaction.editReply('❌ You must be an approved Israelian Citizen to register for a bank card! Use `/create` first.');
        }

        const cardName = user.nationality === 'American' ? 'Visamerican' : 'Visarel';

        const existingCard = await BankCard.findOne({ userId: interaction.user.id });
        if (existingCard) {
            return interaction.editReply(`❌ You already have a ${cardName} card! Use \`/card\` to view it.`);
        }

        // Generate card details
        const cardNumber = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
        const cvv = Math.floor(100 + Math.random() * 900).toString();
        const expiryDate = `03/${(new Date().getFullYear() + 5).toString().slice(-2)}`;

        await BankCard.create({
            userId: interaction.user.id,
            username: interaction.user.username,
            cardNumber,
            cvv,
            expiryDate,
            balance: 1000 // Starting balance
        });

        const maskedCard = `**** **** **** ${cardNumber.slice(-4)}`;
        const currency = user.nationality === 'Israelian' ? '₪' : '$';
        await interaction.editReply(`💳 **${cardName} Card Registered!**\n\nYour new ${cardName} debit card has been issued.\n**Card Number:** \`${maskedCard}\`\n**Initial Balance:** ${currency}1,000\n\nType \`/card\` to see your beautiful new card!`);
    },

    async messageExecute(message: Message, args: string[]) {
        const user = await User.findOne({ userId: message.author.id });

        if (!user || user.citizenshipStatus !== 'Approved') {
            return message.reply('❌ You must be an approved Israelian Citizen to register for a bank card! Use `$create` first.');
        }

        const cardName = user.nationality === 'American' ? 'Visamerican' : 'Visarel';

        const existingCard = await BankCard.findOne({ userId: message.author.id });
        if (existingCard) {
            return message.reply(`❌ You already have a ${cardName} card! Type \`$card\` to view it.`);
        }

        // Generate card details
        const cardNumber = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
        const cvv = Math.floor(100 + Math.random() * 900).toString();
        const expiryDate = `03/${(new Date().getFullYear() + 5).toString().slice(-2)}`;

        await BankCard.create({
            userId: message.author.id,
            username: message.author.username,
            cardNumber,
            cvv,
            expiryDate,
            balance: 1000
        });

        const maskedCard = `**** **** **** ${cardNumber.slice(-4)}`;
        const currency = user.nationality === 'Israelian' ? '₪' : '$';
        await message.reply(`💳 **${cardName} Card Registered!**\n\nYour new ${cardName} debit card has been issued.\n**Card Number:** \`${maskedCard}\`\n**Initial Balance:** ${currency}1,000\n\nType \`$card\` to see your beautiful new card!`);
    }
};
