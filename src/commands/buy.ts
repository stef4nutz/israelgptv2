import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import BankCard from '../database/models/BankCard';
import ShopItem from '../database/models/ShopItem';
import Inventory from '../database/models/Inventory';

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase an item from the Israel Web Shop!')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('The name or ID of the item you want to buy')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const query = interaction.options.getString('item')!;
        const userId = interaction.user.id;

        const result = await this.processPurchase(userId, query);

        await interaction.editReply(result.content);
    },

    async messageExecute(message: Message, args: string[]) {
        if (args.length === 0) {
            return message.reply('❌ Usage: `$buy <item name>`');
        }

        const query = args.join(' ');
        const userId = message.author.id;

        const result = await this.processPurchase(userId, query);

        await message.reply(result.content);
    },

    async processPurchase(userId: string, query: string) {
        try {
            // Find the item
            const item = await ShopItem.findOne({ 
                $or: [
                    { itemId: query.toLowerCase() },
                    { name: { $regex: new RegExp(query, 'i') } }
                ]
            });

            if (!item) {
                return { error: true, content: `❌ Could not find item "${query}" in the Israel Web Shop!` };
            }

            // Check Global Stock
            if (item.stock !== -1 && item.soldCount >= item.stock) {
                return { error: true, content: `❌ **SOLD OUT!** This item is no longer available.` };
            }

            // Check User's bank card
            const card = await BankCard.findOne({ userId });

            if (!card) {
                return { error: true, content: '❌ You do not have a Visarel card yet! Use `$registercard` first.' };
            }

            if (card.balance < item.price) {
                return { error: true, content: `❌ Insufficient funds! ${item.name} costs ₪${item.price.toLocaleString()}, but you only have ₪${card.balance.toLocaleString()}.` };
            }

            // Check User Inventory Limit
            let inventory = await Inventory.findOne({ userId });
            if (item.limit !== -1 && inventory) {
                const ownedCount = inventory.items.filter(i => i.itemId === item.itemId).length;
                if (ownedCount >= item.limit) {
                    return { error: true, content: `❌ You have reached the purchase limit for this item (${item.limit} max).` };
                }
            }

            // Deduct balance
            card.balance -= item.price;
            await card.save();

            // Increment soldCount
            item.soldCount += 1;
            await item.save();

            // Add to inventory
            if (!inventory) {
                inventory = await Inventory.create({ userId, items: [] });
            }

            inventory.items.push({
                itemId: item.itemId,
                name: item.name,
                purchaseDate: new Date()
            });
            await inventory.save();

            return { 
                error: false, 
                content: `🛒 **Purchase Successful!**\n\nYou have bought **${item.name}** for **₪${item.price.toLocaleString()}**.\nIt has been added to your inventory. Your new balance: **₪${card.balance.toLocaleString()}**` 
            };
        } catch (error) {
            console.error('Error processing purchase:', error);
            return { error: true, content: '❌ An error occurred while processing your purchase.' };
        }
    }
};
