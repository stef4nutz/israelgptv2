import { SlashCommandBuilder, ChatInputCommandInteraction, Message, EmbedBuilder } from 'discord.js';
import NationalBank from '../database/models/NationalBank';
import User from '../database/models/User';
import BankCard from '../database/models/BankCard';

export default {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Check the status of the National Banks.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the current balances of the National Banks.')),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const americanBank = await NationalBank.findOne({ nation: 'American' }) || { nation: 'American', balance: 0, currency: '$' };
        const israelianBank = await NationalBank.findOne({ nation: 'Israelian' }) || { nation: 'Israelian', balance: 0, currency: '₪' };

        // Calculate Every Citizen Money
        const allCards = await BankCard.find({});
        const allUsers = await User.find({});

        let americanCitizenWealth = 0;
        let israelianCitizenWealth = 0;

        for (const card of allCards) {
            const user = allUsers.find((u: any) => u.userId === card.userId);
            if (user?.nationality === 'American') {
                americanCitizenWealth += card.balance;
            } else if (user?.nationality === 'Israelian') {
                israelianCitizenWealth += card.balance;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🏛️ National Bank Status')
            .setColor('#0038b8')
            .addFields(
                { name: '🇺🇸 American National Treasury', value: `\`$${americanBank.balance.toLocaleString()}\``, inline: true },
                { name: '🇮🇱 Israelian National Treasury', value: `\`₪${israelianBank.balance.toLocaleString()}\``, inline: true },
                { name: '\u200B', value: '\u200B' }, // Divider
                { name: '🇺🇸 Total American Citizen Wealth', value: `\`$${americanCitizenWealth.toLocaleString()}\``, inline: true },
                { name: '🇮🇱 Total Israelian Citizen Wealth', value: `\`₪${israelianCitizenWealth.toLocaleString()}\``, inline: true },
                { name: '\u200B', value: '\u200B' }, // Divider
                { name: '🇺🇸 Top 5 Richest Americans', value: allCards
                    .map(card => ({ card, user: allUsers.find((u: any) => u.userId === card.userId) }))
                    .filter(item => item.user?.nationality === 'American')
                    .sort((a, b) => b.card.balance - a.card.balance)
                    .slice(0, 5)
                    .map((item, i) => `${i + 1}. **${item.card.username}**${item.user?.isPresident ? ' 👑' : ''}: \`$${item.card.balance.toLocaleString()}\``)
                    .join('\n') || 'None', inline: true },
                { name: '🇮🇱 Top 5 Richest Israelians', value: allCards
                    .map(card => ({ card, user: allUsers.find((u: any) => u.userId === card.userId) }))
                    .filter(item => item.user?.nationality === 'Israelian')
                    .sort((a, b) => b.card.balance - a.card.balance)
                    .slice(0, 5)
                    .map((item, i) => `${i + 1}. **${item.card.username}**${item.user?.isPresident ? ' 👑' : ''}: \`₪${item.card.balance.toLocaleString()}\``)
                    .join('\n') || 'None', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'National Treasury Dept.' });

        await interaction.editReply({ embeds: [embed] });
    },

    async messageExecute(message: Message, args: string[]) {
        const americanBank = await NationalBank.findOne({ nation: 'American' }) || { nation: 'American', balance: 0, currency: '$' };
        const israelianBank = await NationalBank.findOne({ nation: 'Israelian' }) || { nation: 'Israelian', balance: 0, currency: '₪' };

        // Calculate Every Citizen Money
        const allCards = await BankCard.find({});
        const allUsers = await User.find({});

        let americanCitizenWealth = 0;
        let israelianCitizenWealth = 0;

        for (const card of allCards) {
            const user = allUsers.find((u: any) => u.userId === card.userId);
            if (user?.nationality === 'American') {
                americanCitizenWealth += card.balance;
            } else if (user?.nationality === 'Israelian') {
                israelianCitizenWealth += card.balance;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('🏛️ National Bank Status')
            .setColor('#0038b8')
            .addFields(
                { name: '🇺🇸 American National Treasury', value: `\`$${americanBank.balance.toLocaleString()}\``, inline: true },
                { name: '🇮🇱 Israelian National Treasury', value: `\`₪${israelianBank.balance.toLocaleString()}\``, inline: true },
                { name: '\u200B', value: '\u200B' }, // Divider
                { name: '🇺🇸 Total American Citizen Wealth', value: `\`$${americanCitizenWealth.toLocaleString()}\``, inline: true },
                { name: '🇮🇱 Total Israelian Citizen Wealth', value: `\`₪${israelianCitizenWealth.toLocaleString()}\``, inline: true },
                { name: '\u200B', value: '\u200B' }, // Divider
                { name: '🇺🇸 Top 5 Richest Americans', value: allCards
                    .map(card => ({ card, user: allUsers.find((u: any) => u.userId === card.userId) }))
                    .filter(item => item.user?.nationality === 'American')
                    .sort((a, b) => b.card.balance - a.card.balance)
                    .slice(0, 5)
                    .map((item, i) => `${i + 1}. **${item.card.username}**${item.user?.isPresident ? ' 👑' : ''}: \`$${item.card.balance.toLocaleString()}\``)
                    .join('\n') || 'None', inline: true },
                { name: '🇮🇱 Top 5 Richest Israelians', value: allCards
                    .map(card => ({ card, user: allUsers.find((u: any) => u.userId === card.userId) }))
                    .filter(item => item.user?.nationality === 'Israelian')
                    .sort((a, b) => b.card.balance - a.card.balance)
                    .slice(0, 5)
                    .map((item, i) => `${i + 1}. **${item.card.username}**${item.user?.isPresident ? ' 👑' : ''}: \`₪${item.card.balance.toLocaleString()}\``)
                    .join('\n') || 'None', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'National Treasury Dept.' });

        await message.reply({ embeds: [embed] });
    }
};
