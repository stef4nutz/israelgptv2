import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import ShopItem from '../database/models/ShopItem';

const ALLOWED_IDS = ['413326085065801729', '418938236048506880'];

export default {
    data: new SlashCommandBuilder()
        .setName('shopadmin')
        .setDescription('Admin command to manage shop items.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new item to the shop')
                .addStringOption(option => option.setName('id').setDescription('Unique item ID').setRequired(true))
                .addStringOption(option => option.setName('name').setDescription('Item name').setRequired(true))
                .addIntegerOption(option => option.setName('price').setDescription('Item price').setRequired(true))
                .addStringOption(option => option.setName('description').setDescription('Item description').setRequired(true))
                .addIntegerOption(option => option.setName('limit').setDescription('Max quantity per user (-1 for unlimited)').setRequired(false))
                .addIntegerOption(option => option.setName('stock').setDescription('Total global stock (-1 for unlimited)').setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an item from the shop')
                .addStringOption(option => option.setName('id').setDescription('The ID of the item to delete').setRequired(true))),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!ALLOWED_IDS.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ **Access Denied.**', flags: [MessageFlags.Ephemeral] });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const itemId = interaction.options.getString('id')!.toLowerCase();
            const name = interaction.options.getString('name')!;
            const price = interaction.options.getInteger('price')!;
            const description = interaction.options.getString('description')!;
            const limit = interaction.options.getInteger('limit') ?? -1;
            const stock = interaction.options.getInteger('stock') ?? -1;

            await ShopItem.findOneAndUpdate(
                { itemId },
                { itemId, name, price, description, limit, stock },
                { upsert: true, returnDocument: 'after' }
            );

            let resp = `✅ **Item Added/Updated!**\n**ID:** \`${itemId}\`\n**Name:** ${name}\n**Price:** ₪${price.toLocaleString()}`;
            if (limit !== -1) resp += `\n**User Limit:** ${limit}`;
            if (stock !== -1) resp += `\n**Global Stock:** ${stock}`;
            
            await interaction.reply(resp);
        } else if (subcommand === 'delete') {
            const itemId = interaction.options.getString('id')!.toLowerCase();
            const result = await ShopItem.findOneAndDelete({ itemId });

            if (result) {
                await interaction.reply(`🗑️ **Item Deleted:** \`${itemId}\``);
            } else {
                await interaction.reply(`❌ **Error:** No item found with ID \`${itemId}\``);
            }
        }
    },

    async messageExecute(message: Message, args: string[]) {
        if (!ALLOWED_IDS.includes(message.author.id)) {
            return message.reply('❌ **Access Denied.**');
        }

        const syntax = `🔍 **Shop Admin Syntax:**\n- \`$shopadmin add <id> <name> <price> <limit> <stock> <description...>\`\n- \`$shopadmin delete <id>\`\n*(Use -1 for unlimited limit/stock)*`;

        if (args.length < 2) {
            return message.reply(syntax);
        }

        const action = args[0].toLowerCase();

        if (action === 'add') {
            // New syntax: $shopadmin add <id> <name> <price> <limit> <stock> <description...>
            // Old syntax: $shopadmin add <id> <name> <price> <description...>
            
            if (args.length < 5) return message.reply(syntax);

            const itemId = args[1].toLowerCase();
            const name = args[2];
            const price = parseInt(args[3]);

            if (isNaN(price)) return message.reply('❌ Price must be a number!\n' + syntax);

            // Attempt to parse limit and stock, otherwise treat as description
            let limit = -1;
            let stock = -1;
            let description = '';

            const possibleLimit = parseInt(args[4]);
            const possibleStock = parseInt(args[5]);

            if (!isNaN(possibleLimit) && !isNaN(possibleStock)) {
                limit = possibleLimit;
                stock = possibleStock;
                description = args.slice(6).join(' ');
                if (!description) return message.reply(syntax);
            } else {
                description = args.slice(4).join(' ');
            }

            await ShopItem.findOneAndUpdate(
                { itemId },
                { itemId, name, price, description, limit, stock },
                { upsert: true, returnDocument: 'after' }
            );

            let resp = `✅ **Item Added/Updated!**\n**ID:** \`${itemId}\`\n**Name:** ${name}\n**Price:** ₪${price.toLocaleString()}`;
            if (limit !== -1) resp += `\n**User Limit:** ${limit}`;
            if (stock !== -1) resp += `\n**Global Stock:** ${stock}`;

            await message.reply(resp);

        } else if (action === 'delete') {
            if (args.length < 2) return message.reply(syntax);

            const itemId = args[1].toLowerCase();
            const result = await ShopItem.findOneAndDelete({ itemId });

            if (result) {
                await message.reply(`🗑️ **Item Deleted:** \`${itemId}\``);
            } else {
                await message.reply(`❌ **Error:** No item found with ID \`${itemId}\``);
            }
        } else {
            await message.reply(syntax);
        }
    }
};
