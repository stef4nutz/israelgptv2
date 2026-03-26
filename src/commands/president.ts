import { SlashCommandBuilder, ChatInputCommandInteraction, Message, EmbedBuilder, MessageFlags } from 'discord.js';
import User from '../database/models/User';
import NationalBank from '../database/models/NationalBank';
import BankCard from '../database/models/BankCard';

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
                .setDescription('Distribute internal funds to all citizens of the nation.')
                .addNumberOption(option => option.setName('amount').setDescription('Amount to distribute').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('aid')
                .setDescription('Send 40% of the American Treasury to Israel (American President ONLY)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stimulus')
                .setDescription('Distribute 20% of the National Treasury to all citizens of the nation.')),

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
            const amount = interaction.options.getNumber('amount', true);
            if (amount <= 0) return interaction.reply({ content: '❌ Amount must be positive.', flags: [MessageFlags.Ephemeral] });

            if (userData.lastDonateAt) {
                const cooldown = 24 * 60 * 60 * 1000;
                const remaining = cooldown - (Date.now() - userData.lastDonateAt.getTime());
                if (remaining > 0) {
                    const hours = Math.floor(remaining / (60 * 60 * 1000));
                    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                    return interaction.reply({ content: `⏳ **Cooldown!** You can distribute internal funds again in **${hours}h ${minutes}m**.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            const bank = await NationalBank.findOne({ nation });
            if (!bank || bank.balance < amount) {
                return interaction.reply({ content: `❌ The **${nation}** Treasury does not have enough funds for this distribution.`, flags: [MessageFlags.Ephemeral] });
            }

            const citizens = await User.find({ nationality: nation });
            const citizenIds = citizens.map(u => u.userId);
            
            const citizenCards = await BankCard.find({ userId: { $in: citizenIds } });
            if (citizenCards.length === 0) {
                return interaction.reply({ content: `❌ No citizens of **${nation}** have a registered bank card to receive the distribution.`, flags: [MessageFlags.Ephemeral] });
            }

            const perCitizen = amount / citizenCards.length;

            await BankCard.updateMany({ userId: { $in: citizenCards.map((c: any) => c.userId) } }, { $inc: { balance: perCitizen } });
            bank.balance -= amount;
            await bank.save();

            userData.lastDonateAt = new Date();
            await userData.save();

            await interaction.reply(`🏛️ **Internal Donation Distributed!** The President has distributed **${amount.toLocaleString()} ${bank.currency}** among **${citizenCards.length}** citizens. Each received **${perCitizen.toLocaleString()} ${bank.currency}**! 💸`);

        } else if (subcommand === 'aid') {
            if (nation !== 'American') {
                return interaction.reply({ content: '❌ The `aid` command is strictly reserved for the **American President**.', flags: [MessageFlags.Ephemeral] });
            }

            const usTreasury = await NationalBank.findOne({ nation: 'American' });
            if (!usTreasury || usTreasury.balance <= 0) {
                return interaction.reply({ content: '❌ The American Treasury has no funds to send.', flags: [MessageFlags.Ephemeral] });
            }

            const aidAmount = usTreasury.balance * 0.4;
            const israelTreasury = await NationalBank.findOne({ nation: 'Israelian' });
            if (!israelTreasury) return interaction.reply({ content: '❌ Israelian Treasury records not found.', flags: [MessageFlags.Ephemeral] });

            usTreasury.balance -= aidAmount;
            israelTreasury.balance += aidAmount;

            await usTreasury.save();
            await israelTreasury.save();

            await interaction.reply(`💸 **Military & Economic Aid Sent!** The American President has automatically sent **40%** of the Treasury (**${aidAmount.toLocaleString()} ${usTreasury.currency}**) to the State of Israel. 🇺🇸 ➡️ 🇮🇱`);

        } else if (subcommand === 'stimulus') {
            const bank = await NationalBank.findOne({ nation });
            if (!bank || bank.balance <= 0) {
                return interaction.reply({ content: '❌ **you are a failed president who couldn\'t help support their citizens**', flags: [MessageFlags.Ephemeral] });
            }

            if (userData.lastStimulusAt) {
                const cooldown = 24 * 60 * 60 * 1000;
                const remaining = cooldown - (Date.now() - userData.lastStimulusAt.getTime());
                if (remaining > 0) {
                    const hours = Math.floor(remaining / (60 * 60 * 1000));
                    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                    return interaction.reply({ content: `⏳ **Cooldown!** You can distribute a stimulus again in **${hours}h ${minutes}m**.`, flags: [MessageFlags.Ephemeral] });
                }
            }

            const donationTotal = bank.balance * 0.2;
            const citizens = await User.find({ nationality: nation });
            const citizenIds = citizens.map(u => u.userId);
            
            const citizenCards = await BankCard.find({ userId: { $in: citizenIds } });
            if (citizenCards.length === 0) {
                return interaction.reply({ content: `❌ No citizens of **${nation}** have a registered bank card to receive the stimulus.`, flags: [MessageFlags.Ephemeral] });
            }

            const perCitizen = donationTotal / citizenCards.length;

            // Update all cards and the bank
            await BankCard.updateMany({ userId: { $in: citizenCards.map((c: any) => c.userId) } }, { $inc: { balance: perCitizen } });
            bank.balance -= donationTotal;
            await bank.save();

            userData.lastStimulusAt = new Date();
            await userData.save();

            await interaction.reply(`🏛️ **Eco-Stimulus Distributed!** The President has distributed **${donationTotal.toLocaleString()} ${bank.currency}** (20% of Treasury) among **${citizenCards.length}** citizens. Each received **${perCitizen.toLocaleString()} ${bank.currency}**! 💸`);
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
            await message.reply(`✅ **${targetUser.username}** has been appointed as the **${roleName}** of **${nation}**!`);

        } else if (action === 'motto') {
            const motto = args.slice(1).join(' ');
            if (!motto) return message.reply('❌ Please provide a motto: `$president motto <text>`');

            await NationalBank.findOneAndUpdate({ nation }, { motto }, { upsert: true });
            await message.reply(`✅ Motto updated: *"${motto}"*`);

        } else if (action === 'donate') {
            const amount = parseFloat(args[1]);
            if (isNaN(amount) || amount <= 0) return message.reply('❌ Please specify a valid amount.');

            if (userData.lastDonateAt) {
                const cooldown = 24 * 60 * 60 * 1000;
                const remaining = cooldown - (Date.now() - userData.lastDonateAt.getTime());
                if (remaining > 0) {
                    const hours = Math.floor(remaining / (60 * 60 * 1000));
                    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                    return message.reply(`⏳ **Cooldown!** You can distribute internal funds again in **${hours}h ${minutes}m**.`);
                }
            }

            const bank = await NationalBank.findOne({ nation });
            if (!bank || bank.balance < amount) return message.reply(`❌ Insufficient **${nation}** Treasury funds.`);

            const citizens = await User.find({ nationality: nation });
            const citizenIds = citizens.map(u => u.userId);
            const citizenCards = await BankCard.find({ userId: { $in: citizenIds } });

            if (citizenCards.length === 0) return message.reply(`❌ No citizens of **${nation}** have a registered bank card.`);

            const perCitizen = amount / citizenCards.length;

            await BankCard.updateMany({ userId: { $in: citizenCards.map((c: any) => c.userId) } }, { $inc: { balance: perCitizen } });
            bank.balance -= amount;
            await bank.save();

            userData.lastDonateAt = new Date();
            await userData.save();

            await message.reply(`🏛️ **Internal Donation Distributed!** Distributed **${amount.toLocaleString()} ${bank.currency}** among **${citizenCards.length}** citizens. Each: **${perCitizen.toLocaleString()} ${bank.currency}**!`);

        } else if (action === 'aid') {
            if (nation !== 'American') return message.reply('❌ Only the American President can send aid.');

            const usTreasury = await NationalBank.findOne({ nation: 'American' });
            if (!usTreasury || usTreasury.balance <= 0) return message.reply('❌ The American Treasury has no funds.');

            const aidAmount = usTreasury.balance * 0.4;
            const israelTreasury = await NationalBank.findOne({ nation: 'Israelian' });
            if (!israelTreasury) return message.reply('❌ Israelian Treasury error.');

            usTreasury.balance -= aidAmount;
            israelTreasury.balance += aidAmount;

            await usTreasury.save();
            await israelTreasury.save();

            await message.reply(`💸 **Foreign Aid Sent!** Sent **40%** of the Treasury (**${aidAmount.toLocaleString()} ${usTreasury.currency}**) to Israel. 🇺🇸 ➡️ 🇮🇱`);

        } else if (action === 'stimulus') {
            const bank = await NationalBank.findOne({ nation });
            if (!bank || bank.balance <= 0) {
                return message.reply(`❌ **you are a failed president who couldn't help support their citizens**`);
            }

            if (userData.lastStimulusAt) {
                const cooldown = 24 * 60 * 60 * 1000;
                const remaining = cooldown - (Date.now() - userData.lastStimulusAt.getTime());
                if (remaining > 0) {
                    const hours = Math.floor(remaining / (60 * 60 * 1000));
                    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                    return message.reply(`⏳ **Cooldown!** You can distribute a stimulus again in **${hours}h ${minutes}m**.`);
                }
            }

            const donationTotal = bank.balance * 0.2;
            const citizens = await User.find({ nationality: nation });
            const citizenIds = citizens.map(u => u.userId);
            
            const citizenCards = await BankCard.find({ userId: { $in: citizenIds } });
            if (citizenCards.length === 0) {
                return message.reply(`❌ No citizens of **${nation}** have a registered bank card.`);
            }

            const perCitizen = donationTotal / citizenCards.length;

            await BankCard.updateMany({ userId: { $in: citizenCards.map((c: any) => c.userId) } }, { $inc: { balance: perCitizen } });
            bank.balance -= donationTotal;
            await bank.save();

            userData.lastStimulusAt = new Date();
            await userData.save();

            await message.reply(`🏛️ **Stimulus Distributed!** Distributed **${donationTotal.toLocaleString()} ${bank.currency}** among **${citizenCards.length}** citizens. Each: **${perCitizen.toLocaleString()} ${bank.currency}**!`);
        } else {
            const roleName = nation === 'American' ? 'Vice President' : 'Prime Minister';
            return message.reply(`🔍 **Presidential Command Syntax:**\n- \`$president vp <@user>\` (Set ${roleName})\n- \`$president motto <text>\` (Set Motto)\n- \`$president stimulus\` (Distribute 20% of Treasury)\n- \`$president donate <amount>\` (Distribute funds to citizens)\n- ${nation === 'American' ? '`$president aid` (Send 40% to Israel)' : ''}`);
        }
    }
};
