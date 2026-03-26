import { SlashCommandBuilder, ChatInputCommandInteraction, Message, EmbedBuilder, MessageFlags } from 'discord.js';
import User from '../database/models/User';
import Relationship from '../database/models/Relationship';
import BankCard from '../database/models/BankCard';
import NationalBank from '../database/models/NationalBank';
import PoliticalParty from '../database/models/PoliticalParty';

export default {
    data: new SlashCommandBuilder()
        .setName('country')
        .setDescription('Show statistics for a country.')
        .addStringOption(option => 
            option.setName('nation')
                .setDescription('The nation to show stats for')
                .setRequired(true)
                .addChoices(
                    { name: 'American', value: 'American' },
                    { name: 'Israel', value: 'Israelian' }
                )),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const nationArg = interaction.options.getString('nation', true);
            const nation = nationArg === 'Israel' ? 'Israelian' : nationArg;
            
            await interaction.deferReply();
            const embed = await getCountryEmbed(nation);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('[ERROR] Error in country command (slash):', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ An error occurred while fetching country statistics.' });
            } else {
                await interaction.reply({ content: '❌ An error occurred while fetching country statistics.', flags: [MessageFlags.Ephemeral] });
            }
        }
    },

    async messageExecute(message: Message, args: string[]) {
        try {
            const nationInput = args[0]?.toLowerCase();
            let nation = '';
            
            if (nationInput === 'american' || nationInput === 'usa' || nationInput === 'us') {
                nation = 'American';
            } else if (nationInput === 'israel' || nationInput === 'israelian') {
                nation = 'Israelian';
            } else {
                return message.reply('❌ Please specify a country: `$country american` or `$country israel`');
            }

            const embed = await getCountryEmbed(nation);
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[ERROR] Error in country command (prefix):', error);
            await message.reply('❌ An error occurred while fetching country statistics.');
        }
    }
};

async function getCountryEmbed(nation: string) {
    const isAmerican = nation === 'American';
    const flag = isAmerican ? '🇺🇸' : '🇮🇱';
    const countryName = isAmerican ? 'United States of America' : 'State of Israel';
    const color = isAmerican ? 0x0052FF : 0x0038B8;

    // 1. Citizen Count
    const citizenCount = await User.countDocuments({ nationality: nation });

    // 2. Marriages
    // Get all approved citizens of this nation first
    const usersOfNation = await User.find({ nationality: nation }).select('userId').lean();
    const userIds = usersOfNation.map(u => u.userId);
    
    const marriageCount = await Relationship.countDocuments({
        type: 'Marriage',
        $or: [
            { fromId: { $in: userIds } },
            { toId: { $in: userIds } }
        ]
    });

    // 3. Leaders
    const president = await User.findOne({ isPresident: true, presidentOf: nation }).lean();
    const secondLeader = isAmerican 
        ? await User.findOne({ isVicePresident: true, vicePresidentOf: nation }).lean()
        : await User.findOne({ isPrimeMinister: true, primeMinisterOf: nation }).lean();

    const leaderTitle = isAmerican ? 'President' : 'President';
    const secondTitle = isAmerican ? 'Vice President' : 'Prime Minister';

    // 4. Richest People - Efficiently find top 5 with matching nationality
    const richestCards = await BankCard.find({ userId: { $in: userIds } })
        .sort({ balance: -1 })
        .limit(5)
        .lean();

    const richestList = richestCards.length > 0 
        ? richestCards.map((c, i) => `${i + 1}. **${c.username}** - ${c.balance.toLocaleString()}`).join('\n')
        : 'None';

    // 5. National Treasury
    const treasury = await NationalBank.findOne({ nation: nation });
    const treasuryBalance = treasury ? `${treasury.balance.toLocaleString()} ${treasury.currency}` : 'Unknown';
    const motto = treasury?.motto || 'No motto set yet.';
    // 6. Political Parties
    const topParties = await PoliticalParty.find({ nationality: nation })
        .sort({ memberIds: -1 }) // Sort by number of members (descending)
        .limit(3)
        .lean();

    const partyList = topParties.length > 0
        ? topParties.map((p, i) => `${i + 1}. ${p.emoji} **${p.name}** (${p.memberIds.length}/10 members)`).join('\n')
        : 'No parties established.';

    const embed = new EmbedBuilder()
        .setTitle(`${flag} ${countryName} Statistics`)
        .setDescription(`*"${motto}"*`)
        .setColor(color)
        .setThumbnail(isAmerican ? 'https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg' : 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Flag_of_Israel.svg')
        .addFields(
            { name: '🏛️ Government', value: `**${leaderTitle}:** ${president ? president.username : 'Vacant'}\n**${secondTitle}:** ${secondLeader ? secondLeader.username : 'Vacant'}`, inline: true },
            { name: '👥 Population', value: `**Citizens:** ${citizenCount}\n**Marriages:** ${marriageCount}`, inline: true },
            { name: '💰 Treasury', value: `**Balance:** ${treasuryBalance}`, inline: false },
            { name: '🏆 Top 5 Richest Citizens', value: richestList, inline: false },
            { name: '🚩 Top 3 Political Parties', value: partyList, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `${nation} National Records` });

    return embed;
}
