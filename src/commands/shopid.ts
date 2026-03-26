import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import ShopItem from '../database/models/ShopItem';

const ALLOWED_IDS = ['413326085065801729', '418938236048506880'];

export default {
    data: new SlashCommandBuilder()
        .setName('shopid')
        .setDescription('Admin command to list all shop item IDs.'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!ALLOWED_IDS.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ **Access Denied.**', flags: [MessageFlags.Ephemeral] });
        }

        const items = await ShopItem.find({});
        
        if (items.length === 0) {
            return interaction.reply({ content: '❌ The shop is currently empty.', flags: [MessageFlags.Ephemeral] });
        }

        const list = items.map(item => `• **${item.name}** - ID: \`${item.itemId}\` (₪${item.price.toLocaleString()})`).join('\n');
        await interaction.reply({ content: `🔍 **Master Shop ID List:**\n\n${list}`, flags: [MessageFlags.Ephemeral] });
    },

    async messageExecute(message: Message, args: string[]) {
        if (!ALLOWED_IDS.includes(message.author.id)) {
            return message.reply('❌ **Access Denied.**');
        }

        const items = await ShopItem.find({});

        if (items.length === 0) {
            return message.reply('❌ The shop is currently empty.');
        }

        const list = items.map(item => `• **${item.name}** - ID: \`${item.itemId}\` (₪${item.price.toLocaleString()})`).join('\n');
        await message.reply(`🔍 **Master Shop ID List:**\n\n${list}`);
    }
};
