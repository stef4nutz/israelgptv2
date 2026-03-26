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
        .setName('marry')
        .setDescription('Propose marriage to another citizen!')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The person you want to marry')
                .setRequired(true)),

    async execute(interaction: any) {
        if (interaction.isChatInputCommand()) {
            const targetUser = interaction.options.getUser('user')!;
            await this.handleMarriage(interaction, interaction.user, targetUser);
        }
        // Button interactions for marry are handled by the collector in handleMarriage,
        // so we don't need to handle them here if they are already being collected.
        // However, we should prevent the crash.
    },

    async messageExecute(message: Message, args: string[]) {
        const targetUser = message.mentions.users.first();

        if (!targetUser) {
            return message.reply('Please mention the user you want to marry! (e.g., `$marry @user`)');
        }

        await this.handleMarriage(message, message.author, targetUser);
    },

    async handleMarriage(context: any, author: DiscordUser, targetUser: DiscordUser) {
        if (author.id === targetUser.id) {
            return context.reply({ content: '❌ You cannot marry yourself, narcissist!', flags: [MessageFlags.Ephemeral] });
        }

        if (targetUser.bot) {
            return context.reply({ content: '❌ You cannot marry a bot. They have no souls!', flags: [MessageFlags.Ephemeral] });
        }

        // Check citizenship status
        const [authorData, targetData] = await Promise.all([
            User.findOne({ userId: author.id }),
            User.findOne({ userId: targetUser.id })
        ]);

        if (!authorData || authorData.citizenshipStatus !== 'Approved') {
            return context.reply({ content: `❌ You must be an approved ${authorData?.nationality || 'Israelian'} Citizen to marry! Use \`/create\` first.`, flags: [MessageFlags.Ephemeral] });
        }

        if (!targetData || targetData.citizenshipStatus !== 'Approved') {
            return context.reply({ content: `❌ ${targetUser.username} is not an approved ${targetData?.nationality || 'Israelian'} Citizen! They must pass the citizenship test first.`, flags: [MessageFlags.Ephemeral] });
        }

        // Check if already married
        const [isAuthorMarried, isTargetMarried] = await Promise.all([
            Relationship.exists({ type: 'Marriage', $or: [{ fromId: author.id }, { toId: author.id }] }),
            Relationship.exists({ type: 'Marriage', $or: [{ fromId: targetUser.id }, { toId: targetUser.id }] })
        ]);

        if (isAuthorMarried) {
            return context.reply({ content: '❌ You are already married! Polygamy is not allowed here.', flags: [MessageFlags.Ephemeral] });
        }

        if (isTargetMarried) {
            return context.reply({ content: `❌ ${targetUser.username} is already married to someone else!`, flags: [MessageFlags.Ephemeral] });
        }

        // --- RECURSIVE LINEAGE CHECKS ---
        async function getAncestors(userId: string): Promise<Set<string>> {
            const ancestors = new Set<string>();
            const stack = [userId];
            const visited = new Set<string>();

            while (stack.length > 0) {
                const currentId = stack.pop()!;
                if (visited.has(currentId)) continue;
                visited.add(currentId);

                const parentDocs = await Relationship.find({ toId: currentId, type: 'Adoption' });
                for (const doc of parentDocs) {
                    ancestors.add(doc.fromId);
                    stack.push(doc.fromId);
                }
            }
            return ancestors;
        }

        const [authorAncestors, targetAncestors] = await Promise.all([
            getAncestors(author.id),
            getAncestors(targetUser.id)
        ]);

        // 1. Direct Lineage (Ancestor/Descendant)
        if (authorAncestors.has(targetUser.id)) {
            return context.reply({ content: `❌ You cannot marry your own ancestor! That's incest.`, flags: [MessageFlags.Ephemeral] });
        }
        if (targetAncestors.has(author.id)) {
            return context.reply({ content: `❌ You cannot marry your own descendant! That's incest.`, flags: [MessageFlags.Ephemeral] });
        }

        // 2. Shared Ancestors (Siblings, Cousins, etc.)
        const commonAncestors = [...authorAncestors].filter(id => targetAncestors.has(id));
        if (commonAncestors.length > 0) {
            return context.reply({ content: `❌ You cannot marry your relative! You share a common lineage (e.g., same parents or grandparents).`, flags: [MessageFlags.Ephemeral] });
        }
        // --- END RECURSIVE LINEAGE CHECKS ---

        // Check if both users have a valid gender set
        const validGenders = ['male', 'female', 'non-binary'];
        const authorGenderRaw = authorData.gender?.toLowerCase() || '';
        const targetGenderRaw = targetData.gender?.toLowerCase() || '';

        if (!validGenders.includes(authorGenderRaw)) {
            return context.reply({ content: `❌ You must set your gender to Man, Woman, or Non-Binary to marry!`, flags: [MessageFlags.Ephemeral] });
        }

        if (!validGenders.includes(targetGenderRaw)) {
            return context.reply({ content: `❌ ${targetUser.username} must have their gender set to Man, Woman, or Non-Binary to marry!`, flags: [MessageFlags.Ephemeral] });
        }

        // Determine proposal title based on genders
        let proposalTitle = 'MARRIAGE PROPOSAL';

        if (authorGenderRaw === 'non-binary' || targetGenderRaw === 'non-binary') {
            proposalTitle = 'TRANS MARRIAGE PROPOSAL';
        } else if (authorGenderRaw === 'male' && targetGenderRaw === 'male') {
            proposalTitle = 'GAY MARRIAGE PROPOSAL';
        } else if (authorGenderRaw === 'female' && targetGenderRaw === 'female') {
            proposalTitle = 'LESBIAN MARRIAGE PROPOSAL';
        }

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('marry_yes')
                    .setLabel('Yes, I do')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('marry_no')
                    .setLabel('No, thanks')
                    .setStyle(ButtonStyle.Danger)
            );

        const authorNationality = authorData.nationality || 'Israelian';
        const countryName = authorNationality === 'American' ? 'the United States of America' : 'the state of Israel';
        const flag = authorNationality === 'American' ? '🇺🇸' : '🇮🇱';

        const proposalContent = `💍 **${proposalTitle}** 💍\n\n<@${targetUser.id}>, do you take <@${author.id}> to be your lawfully wedded spouse in ${countryName}?`;

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
                return i.reply({ content: 'This proposal is not for you!', flags: [MessageFlags.Ephemeral] });
            }

            if (i.customId === 'marry_yes') {
                // Update DB: Create a new marriage relationship
                await Relationship.create({
                    fromId: author.id,
                    toId: targetUser.id,
                    type: 'Marriage'
                });

                await i.update({
                    content: `🎉 **MAZEL TOV!** 🎉\n\n<@${author.id}> and <@${targetUser.id}> are now officially married in ${countryName}! ${flag}💍`,
                    components: []
                });
            } else {
                await i.update({
                    content: `💔 **Heartbreak!**\n\n${targetUser.username} has rejected the proposal from ${author.username}.`,
                    components: []
                });
            }
            collector.stop();
        });

        collector.on('end', (collected: any, reason: any) => {
            if (reason === 'time') {
                response.edit({
                    content: `⏰ **Proposal Expired.**\n\n${targetUser.username} did not respond within 30 seconds. The marriage process has been cancelled.`,
                    components: []
                }).catch(console.error);
            }
        });
    }
};
