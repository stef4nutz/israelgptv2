import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    User as DiscordUser,
    MessageFlags
} from 'discord.js';
import User from '../database/models/User';
import Relationship from '../database/models/Relationship';

export default {
    data: new SlashCommandBuilder()
        .setName('adopt')
        .setDescription('Adopt another citizen as your child!'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        const targetUser = interaction.options.getUser('user')!;
        await this.handleAdoption(interaction, interaction.user, targetUser);
    },

    async messageExecute(message: Message, args: string[]) {
        const targetUser = message.mentions.users.first();
        
        if (!targetUser) {
            return message.reply(`Please mention the user you want to adopt! (e.g., \`$adopt @user\`)`);
        }

        await this.handleAdoption(message, message.author, targetUser);
    },

    async handleAdoption(context: any, author: DiscordUser, targetUser: DiscordUser) {
        if (author.id === targetUser.id) {
            return context.reply({ content: '❌ You cannot adopt yourself! That makes no sense.', flags: [MessageFlags.Ephemeral] });
        }

        if (targetUser.bot) {
            return context.reply({ content: '❌ You cannot adopt a bot. They are made of code!', flags: [MessageFlags.Ephemeral] });
        }

        // Check citizenship status
        const [authorData, targetData] = await Promise.all([
            User.findOne({ userId: author.id }),
            User.findOne({ userId: targetUser.id })
        ]);

        if (!authorData || authorData.citizenshipStatus !== 'Approved') {
            return context.reply({ content: `❌ You must be an approved ${authorData?.nationality || 'Israelian'} Citizen to adopt! Use \`/create\` first.`, flags: [MessageFlags.Ephemeral] });
        }

        if (!targetData || targetData.citizenshipStatus !== 'Approved') {
            return context.reply({ content: `❌ ${targetUser.username} is not an approved ${targetData?.nationality || 'Israelian'} Citizen! They must pass the citizenship test first.`, flags: [MessageFlags.Ephemeral] });
        }

        // Check if already parent/child or already adopted
        const [existingRel, isTargetAlreadyAdopted, marriageRel, isTargetAuthorParent] = await Promise.all([
            Relationship.exists({ fromId: author.id, toId: targetUser.id, type: 'Adoption' }),
            Relationship.exists({ toId: targetUser.id, type: 'Adoption' }),
            Relationship.findOne({ type: 'Marriage', $or: [{ fromId: author.id, toId: targetUser.id }, { fromId: targetUser.id, toId: author.id }] }),
            Relationship.exists({ fromId: targetUser.id, toId: author.id, type: 'Adoption' })
        ]);

        if (existingRel) {
            return context.reply({ content: `❌ ${targetUser.username} is already your child!`, flags: [MessageFlags.Ephemeral] });
        }

        if (isTargetAlreadyAdopted) {
            return context.reply({ content: `❌ ${targetUser.username} is already adopted by someone else! They cannot be adopted again.`, flags: [MessageFlags.Ephemeral] });
        }

        if (marriageRel) {
            return context.reply({ content: `❌ You cannot adopt your spouse! That's... a bit weird.`, flags: [MessageFlags.Ephemeral] });
        }

        const authorNationality = authorData.nationality || 'Israelian';
        const countryName = authorNationality === 'American' ? 'the United States of America' : 'the state of Israel';
        const flag = authorNationality === 'American' ? '🇺🇸' : '🇮🇱';

        if (isTargetAuthorParent) {
            return context.reply({ content: `❌ You cannot adopt your own parent! Circular families are not supported in ${countryName}.`, flags: [MessageFlags.Ephemeral] });
        }

        // Check if target's spouse is already a child of the author
        const targetMarriage = await Relationship.findOne({ type: 'Marriage', $or: [{ fromId: targetUser.id }, { toId: targetUser.id }] });
        if (targetMarriage) {
            const spouseId = targetMarriage.fromId === targetUser.id ? targetMarriage.toId : targetMarriage.fromId;
            const isSpouseAuthorChild = await Relationship.exists({ fromId: author.id, toId: spouseId, type: 'Adoption' });
            if (isSpouseAuthorChild) {
                const spouseData = await User.findOne({ userId: spouseId });
                return context.reply({ 
                    content: `❌ You cannot adopt ${targetUser.username} because you have already adopted their spouse, ${spouseData?.username || 'them'}! We don't want siblings being married in ${countryName}.`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }

        // Send proposal
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('adopt_yes')
                    .setLabel('Yes, adopt me!')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('adopt_no')
                    .setLabel('No, thanks')
                    .setStyle(ButtonStyle.Danger)
            );

        const proposalContent = `👨‍👩‍👧 **ADOPTION REQUEST** 👨‍👩‍👧\n\n<@${targetUser.id}>, <@${author.id}> wants to adopt you as their child in ${countryName}! Do you accept?`;
        
        const response = await (context as any).reply({
            content: proposalContent,
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000 // 30 seconds
        });

        collector.on('collect', async (i: any) => {
            if (i.user.id !== targetUser.id) {
                return i.reply({ content: 'This request is not for you!', flags: [MessageFlags.Ephemeral] });
            }

            if (i.customId === 'adopt_yes') {
                // Update DB: Create adoption relationship
                await Relationship.create({
                    fromId: author.id,
                    toId: targetUser.id,
                    type: 'Adoption'
                });

                await i.update({
                    content: `🎊 **FAMILY EXPANDED!** 🎊\n\n<@${author.id}> has officially adopted <@${targetUser.id}>! ${authorNationality === 'American' ? 'Congratulations' : 'Mazel Tov'} to the new family member! ${flag}👨‍👩‍👦`,
                    components: []
                });
            } else {
                await i.update({
                    content: `❌ Adoption declined. ${targetUser.username} prefers to remain independent.`,
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', (collected: any, reason: any) => {
            if (reason === 'time') {
                response.edit({
                    content: `⏰ **Adoption Request Expired.**\n\n${targetUser.username} did not respond within 30 seconds.`,
                    components: []
                }).catch(console.error);
            }
        });
    }
};
