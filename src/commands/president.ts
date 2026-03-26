import { SlashCommandBuilder, ChatInputCommandInteraction, Message, EmbedBuilder, MessageFlags } from 'discord.js';
import User from '../database/models/User';
import NationalBank from '../database/models/NationalBank';

export default {
    data: new SlashCommandBuilder()
        .setName('president')
        .setDescription('Presidential actions for the leader of the nation.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('vp')
                .setDescription('Assign a Vice President (USA) or Prime Minister (Israel)')
                .addUserOption(option => option.setName('user').setDescription('The user to assign').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('motto')
                .setDescription('Set the national motto')
                .addStringOption(option => option.setName('text').setDescription('The new motto').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('donate')
                .setDescription('Donate funds from the American Treasury to Israel (American President ONLY)')
                .addNumberOption(option => option.setName('amount').setDescription('Amount to donate').setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction) {
        const userData = await User.findOne({ userId: interaction.user.id });
        if (!userData || !userData.isPresident || userData.presidentOf === 'None') {
            return interaction.reply({ content: '❌ **Access Denied.** Only the President can use this command.', flags: [MessageFlags.Ephemeral] });
        }

        const nation = userData.presidentOf;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'vp') {
            const targetUser = interaction.options.getUser('user')!;
            const targetData = await User.findOne({ userId: targetUser.id });

            if (!targetData || targetData.nationality !== nation) {
                return interaction.reply({ content: `❌ **${targetUser.username}** must be a citizen of **${nation}** to hold this office.`, flags: [MessageFlags.Ephemeral] });
            }

            // Clear existing VP/PM for this nation
            if (nation === 'American') {
                await User.updateMany({ vicePresidentOf: 'American' }, { isVicePresident: false, vicePresidentOf: 'None' });
                targetData.isVicePresident = true;
                targetData.vicePresidentOf = 'American';
            } else {
                await User.updateMany({ primeMinisterOf: 'Israelian' }, { isPrimeMinister: false, primeMinisterOf: 'None' });
                targetData.isPrimeMinister = true;
                targetData.primeMinisterOf = 'Israelian';
            }

            await targetData.save();
            const roleName = nation === 'American' ? 'Vice President' : 'Prime Minister';
            await interaction.reply(`✅ **${targetUser.username}** has been appointed as the **${roleName}** of **${nation}**!`);

        } else if (subcommand === 'motto') {
            const motto = interaction.options.getString('text', true);
            await NationalBank.findOneAndUpdate({ nation }, { motto }, { upsert: true });
            await interaction.reply(`✅ The national motto for **${nation}** has been set to: *"${motto}"*`);

        } else if (subcommand === 'donate') {
            if (nation !== 'American') {
                return interaction.reply({ content: '❌ The `donate` command is strictly reserved for the **American President**.', flags: [MessageFlags.Ephemeral] });
            }

            const amount = interaction.options.getNumber('amount', true);
            if (amount <= 0) return interaction.reply({ content: '❌ Amount must be positive.', flags: [MessageFlags.Ephemeral] });

            const usTreasury = await NationalBank.findOne({ nation: 'American' });
            if (!usTreasury || usTreasury.balance < amount) {
                return interaction.reply({ content: '❌ The American Treasury does not have enough funds for this donation.', flags: [MessageFlags.Ephemeral] });
            }

            const israelTreasury = await NationalBank.findOne({ nation: 'Israelian' });
            if (!israelTreasury) return interaction.reply({ content: '❌ Israelian Treasury records not found.', flags: [MessageFlags.Ephemeral] });

            usTreasury.balance -= amount;
            israelTreasury.balance += amount;

            await usTreasury.save();
            await israelTreasury.save();

            await interaction.reply(`💸 **Foreign Aid Sent!** The American President has donated **${amount.toLocaleString()} ${usTreasury.currency}** to the State of Israel. 🇺🇸 ➡️ 🇮🇱`);
        }
    },

    async messageExecute(message: Message, args: string[]) {
        const userData = await User.findOne({ userId: message.author.id });
        if (!userData || !userData.isPresident || userData.presidentOf === 'None') {
            return message.reply('❌ **Access Denied.** Only the President can use this command.');
        }

        const nation = userData.presidentOf;
        const action = args[0]?.toLowerCase();

        if (action === 'vp') {
            const targetUser = message.mentions.users.first();
            if (!targetUser) return message.reply('❌ Please tag a user: `$president vp <@user>`');

            const targetData = await User.findOne({ userId: targetUser.id });
            if (!targetData || targetData.nationality !== nation) {
                return message.reply(`❌ **${targetUser.username}** must be a citizen of **${nation}**.`);
            }

            if (nation === 'American') {
                await User.updateMany({ vicePresidentOf: 'American' }, { isVicePresident: false, vicePresidentOf: 'None' });
                targetData.isVicePresident = true;
                targetData.vicePresidentOf = 'American';
            } else {
                await User.updateMany({ primeMinisterOf: 'Israelian' }, { isPrimeMinister: false, primeMinisterOf: 'None' });
                targetData.isPrimeMinister = true;
                targetData.primeMinisterOf = 'Israelian';
            }

            await targetData.save();
            const roleName = nation === 'American' ? 'Vice President' : 'Prime Minister';
            await message.reply(`✅ **${targetUser.username}** appointed as **${roleName}**.`);

        } else if (action === 'motto') {
            const motto = args.slice(1).join(' ');
            if (!motto) return message.reply('❌ Please provide a motto: `$president motto <text>`');

            await NationalBank.findOneAndUpdate({ nation }, { motto }, { upsert: true });
            await message.reply(`✅ Motto updated: *"${motto}"*`);

        } else if (action === 'donate') {
            if (nation !== 'American') return message.reply('❌ Only the American President can donate.');

            const amount = parseFloat(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply('❌ Please specify a valid amount.');

            const usTreasury = await NationalBank.findOne({ nation: 'American' });
            if (!usTreasury || usTreasury.balance < amount) return message.reply('❌ Insufficient Treasury funds.');

            const israelTreasury = await NationalBank.findOne({ nation: 'Israelian' });
            if (!israelTreasury) return message.reply('❌ Israelian Treasury error.');

            usTreasury.balance -= amount;
            israelTreasury.balance += amount;

            await usTreasury.save();
            await israelTreasury.save();

            await message.reply(`💸 Sent **${amount.toLocaleString()} ${usTreasury.currency}** to Israel. 🇺🇸🇮🇱`);
        } else {
            const roleName = nation === 'American' ? 'Vice President' : 'Prime Minister';
            return message.reply(`🔍 **Presidential Command Syntax:**\n- \`$president vp <@user>\` (Set ${roleName})\n- \`$president motto <text>\` (Set Motto)\n- ${nation === 'American' ? '`$president donate <amount>` (Send Aid to Israel)' : ''}`);
        }
    }
};
