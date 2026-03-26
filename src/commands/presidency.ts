import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags, User as DiscordUser } from 'discord.js';
import Election from '../database/models/Election';
import User from '../database/models/User';

const ALLOWED_IDS = ['413326085065801729', '418938236048506880'];

export default {
    data: new SlashCommandBuilder()
        .setName('presidency')
        .setDescription('Manage the presidential election.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a candidate (Detects nationality automatically) (Admin only)')
                .addUserOption(option => option.setName('user').setDescription('The user to add as a candidate').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('vote')
                .setDescription('Vote for a candidate')
                .addStringOption(option => option.setName('type').setDescription('The nation to vote for').setRequired(true).addChoices({ name: 'American', value: 'American' }, { name: 'Israelian', value: 'Israelian' }))
                .addUserOption(option => option.setName('candidate').setDescription('The candidate to vote for').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check election status')
                .addStringOption(option => option.setName('type').setDescription('The nation to check').setRequired(true).addChoices({ name: 'American', value: 'American' }, { name: 'Israelian', value: 'Israelian' })))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End the current election (Admin only)')
                .addStringOption(option => option.setName('type').setDescription('The nation to end').setRequired(true).addChoices({ name: 'American', value: 'American' }, { name: 'Israelian', value: 'Israelian' }))),

    async execute(interaction: ChatInputCommandInteraction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            if (!ALLOWED_IDS.includes(interaction.user.id)) {
                return interaction.reply({ content: '❌ **Access Denied.**', flags: [MessageFlags.Ephemeral] });
            }

            const targetUser = interaction.options.getUser('user')!;
            const targetData = await User.findOne({ userId: targetUser.id });
            
            if (!targetData || (targetData.nationality !== 'American' && targetData.nationality !== 'Israelian')) {
                return interaction.reply({ content: `❌ **${targetUser.username}** does not have a recognized nationality (American or Israelian).`, flags: [MessageFlags.Ephemeral] });
            }

            const type = targetData.nationality;
            let election = await Election.findOne({ isActive: true, type });

            if (!election) {
                election = await Election.create({ isActive: true, type, candidates: [], voters: [] });
            }

            if (election.candidates.some(c => c.userId === targetUser.id)) {
                return interaction.reply({ content: `❌ **${targetUser.username}** is already a candidate in the **${type}** election!`, flags: [MessageFlags.Ephemeral] });
            }

            if (election.candidates.length >= 4) {
                return interaction.reply({ content: `❌ **${type} Election is full!** Maximum of 4 candidates allowed.`, flags: [MessageFlags.Ephemeral] });
            }

            election.candidates.push({ userId: targetUser.id, username: targetUser.username, votes: 0 });
            await election.save();

            await interaction.reply(`✅ **${targetUser.username}** has been added as a candidate for the **${type} Presidency**!`);

        } else if (subcommand === 'vote') {
            const type = interaction.options.getString('type', true);
            const candidateUser = interaction.options.getUser('candidate')!;
            const election = await Election.findOne({ isActive: true, type });

            if (!election) {
                return interaction.reply({ content: `❌ There is no active **${type}** election right now.`, flags: [MessageFlags.Ephemeral] });
            }

            if (election.voters.includes(interaction.user.id)) {
                return interaction.reply({ content: `❌ **no vote** - You have already voted in the **${type}** election!`, flags: [MessageFlags.Ephemeral] });
            }

            const candidate = election.candidates.find(c => c.userId === candidateUser.id);
            if (!candidate) {
                return interaction.reply({ content: `❌ That user is not a candidate in the **${type}** election.`, flags: [MessageFlags.Ephemeral] });
            }

            candidate.votes += 1;
            election.voters.push(interaction.user.id);
            await election.save();

            await interaction.reply(`🗳️ **Vote Registered!** You voted for **${candidateUser.username}** in the **${type}** election.`);

        } else if (subcommand === 'status') {
            const type = interaction.options.getString('type', true);
            const election = await Election.findOne({ isActive: true, type });

            if (!election || election.candidates.length === 0) {
                return interaction.reply({ content: `ℹ️ No active **${type}** election or candidates at the moment.`, flags: [MessageFlags.Ephemeral] });
            }

            const candidateList = election.candidates
                .map(c => `• **${c.username}**: ${c.votes} votes`)
                .join('\n');

            await interaction.reply({
                content: `🗳️ **Current ${type} Presidential Election Status**\n\n${candidateList}\n\nTotal Votes: ${election.voters.length}`
            });
        } else if (subcommand === 'end') {
            if (!ALLOWED_IDS.includes(interaction.user.id)) {
                return interaction.reply({ content: '❌ **Access Denied.**', flags: [MessageFlags.Ephemeral] });
            }

            const type = interaction.options.getString('type', true);
            const result = await this.concludeElection(type);
            await interaction.reply(result.content);
        }
    },

    async messageExecute(message: Message, args: string[]) {
        const syntax = `🔍 **Presidency Syntax:**\n- \`$presidency add <@user>\` (Admin Only)\n- \`$presidency vote <@user>\` \n- \`$presidency status\`\n- \`$presidency end\` (Admin Only)`;

        if (args.length === 0) return message.reply(syntax);

        const action = args[0].toLowerCase();

        if (action === 'add') {
            if (!ALLOWED_IDS.includes(message.author.id)) {
                return message.reply('❌ **Access Denied.**');
            }

            const targetUser = message.mentions.users.first();
            if (!targetUser) return message.reply('❌ Please mention a user to add as a candidate.');

            const targetData = await User.findOne({ userId: targetUser.id });
            if (!targetData || (targetData.nationality !== 'American' && targetData.nationality !== 'Israelian')) {
                return message.reply(`❌ **${targetUser.username}** does not have a recognized nationality (American or Israelian).`);
            }

            const type = targetData.nationality;
            let election = await Election.findOne({ isActive: true, type });
            if (!election) {
                election = await Election.create({ isActive: true, type, candidates: [], voters: [] });
            }

            if (election.candidates.some(c => c.userId === targetUser.id)) {
                return message.reply(`❌ **${targetUser.username}** is already a candidate in the **${type}** election!`);
            }

            if (election.candidates.length >= 4) {
                return message.reply(`❌ **${type} Election is full!** Maximum of 4 candidates allowed.`);
            }

            election.candidates.push({ userId: targetUser.id, username: targetUser.username, votes: 0 });
            await election.save();

            await message.reply(`✅ **${targetUser.username}** has been added as a candidate for the **${type} Presidency**!`);

        } else if (action === 'vote') {
            const typeArg = args[1]?.toLowerCase();
            const type = typeArg === 'american' ? 'American' : typeArg === 'israelian' ? 'Israelian' : null;

            if (!type) {
                return message.reply('❌ Please specify the election type: `$presidency vote <american/israelian> <@user>`');
            }

            const targetUser = message.mentions.users.first();
            if (!targetUser) return message.reply(`❌ Please mention a candidate to vote for in the **${type}** election.`);

            const election = await Election.findOne({ isActive: true, type });
            if (!election) return message.reply(`❌ There is no active **${type}** election.`);

            if (election.voters.includes(message.author.id)) {
                return message.reply(`❌ **no vote** - You have already voted in the **${type}** election!`);
            }

            const candidate = election.candidates.find(c => c.userId === targetUser.id);
            if (!candidate) return message.reply(`❌ That user is not a candidate in the **${type}** election.`);

            candidate.votes += 1;
            election.voters.push(message.author.id);
            await election.save();

            await message.reply(`🗳️ **Vote Registered!** You voted for **${targetUser.username}** in the **${type}** election.`);

        } else if (action === 'status') {
            const typeArg = args[1]?.toLowerCase();
            const type = typeArg === 'american' ? 'American' : typeArg === 'israelian' ? 'Israelian' : null;

            if (!type) {
                return message.reply('❌ Please specify the election type: `$presidency status <american/israelian>`');
            }

            const election = await Election.findOne({ isActive: true, type });
            if (!election || election.candidates.length === 0) {
                return message.reply(`ℹ️ No active **${type}** election or candidates.`);
            }

            const candidateList = election.candidates
                .map(c => `• **${c.username}**: ${c.votes} votes`)
                .join('\n');

            await message.reply(`🗳️ **${type} Election Status:**\n\n${candidateList}\n\nTotal Votes: ${election.voters.length}`);
        } else if (action === 'end') {
            if (!ALLOWED_IDS.includes(message.author.id)) {
                return message.reply('❌ **Access Denied.**');
            }

            const typeArg = args[1]?.toLowerCase();
            const type = typeArg === 'american' ? 'American' : typeArg === 'israelian' ? 'Israelian' : null;

            if (!type) {
                return message.reply('❌ Please specify the election type: `$presidency end <american/israelian>`');
            }

            const result = await this.concludeElection(type);
            await message.reply(result.content);
        } else {
            await message.reply(syntax);
        }
    },

    async concludeElection(type: string) {
        try {
            const election = await Election.findOne({ isActive: true, type });

            if (!election) {
                return { error: true, content: `❌ There is no active **${type}** election to end.` };
            }

            if (election.candidates.length === 0) {
                election.isActive = false;
                await election.save();
                return { error: true, content: `❌ The **${type}** election had no candidates. It has been closed.` };
            }

            // Determine winner
            let winner = election.candidates[0];
            for (const candidate of election.candidates) {
                if (candidate.votes > winner.votes) {
                    winner = candidate;
                }
            }

            // Check for a tie
            const topCandidates = election.candidates.filter(c => c.votes === winner.votes);
            if (topCandidates.length > 1) {
                return { 
                    error: true, 
                    content: `🤝 **${type} Election Tie!** Several candidates have ${winner.votes} votes. Please cast more votes or break the tie manually before ending.\nCandidates: ${topCandidates.map(c => c.username).join(', ')}` 
                };
            }

            // Close election
            election.isActive = false;
            await election.save();

            // Clear previous president of THIS type
            await User.updateMany({ presidentOf: type }, { isPresident: false, presidentOf: 'None' });

            // Set new president
            const newPresident = await User.findOneAndUpdate(
                { userId: winner.userId },
                { isPresident: true, presidentOf: type },
                { returnDocument: 'after' }
            );

            const flag = type === 'American' ? '🇺🇸' : '🇮🇱';
            return { 
                error: false, 
                content: `🎊 **${type.toUpperCase()} ELECTION CONCLUDED!** 🎊\n\nThe winner is **${winner.username}** with **${winner.votes}** votes!\nCongratulations, Mr. President! ${flag}` 
            };
        } catch (error) {
            console.error('Error concluding election:', error);
            return { error: true, content: '❌ An error occurred while ending the election.' };
        }
    }
};
