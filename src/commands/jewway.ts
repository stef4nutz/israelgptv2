import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import BankCard from '../database/models/BankCard';

const ALLOWED_IDS = ['413326085065801729', '418938236048506880'];

export default {
    data: new SlashCommandBuilder()
        .setName('jewway')
        .setDescription('Admin command to give money to a user.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to give money to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of money to give')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!ALLOWED_IDS.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ **Access Denied.** You are not the Chosen One!', flags: [MessageFlags.Ephemeral] });
        }

        const targetUser = interaction.options.getUser('user')!;
        const amount = interaction.options.getInteger('amount')!;

        const card = await BankCard.findOne({ userId: targetUser.id });

        if (!card) {
            return interaction.reply({ content: `❌ ${targetUser.username} does not have a Visarel card yet!`, flags: [MessageFlags.Ephemeral] });
        }

        card.balance += amount;
        await card.save();

        await interaction.reply(`✡️ **The Prophet has spoken!** ✡️\n\n₪${amount.toLocaleString()} has been added to <@${targetUser.id}>'s account by the Almighty.\nNew balance: ₪${card.balance.toLocaleString()}`);
    },

    async messageExecute(message: Message, args: string[]) {
        if (!ALLOWED_IDS.includes(message.author.id)) {
            return message.reply('❌ **Access Denied.** You are not the Chosen One!');
        }

        const targetUser = message.mentions.users.first();
        const amount = parseInt(args.find(arg => !arg.includes('<@')) || '');

        if (!targetUser || isNaN(amount)) {
            return message.reply('❌ Usage: `$jewway @user <amount>`');
        }

        const card = await BankCard.findOne({ userId: targetUser.id });

        if (!card) {
            return message.reply(`❌ ${targetUser.username} does not have a Visarel card yet!`);
        }

        card.balance += amount;
        await card.save();

        await message.reply(`✡️ **The Prophet has spoken!** ✡️\n\n₪${amount.toLocaleString()} has been added to <@${targetUser.id}>'s account by the Almighty.\nNew balance: ₪${card.balance.toLocaleString()}`);
    }
};
