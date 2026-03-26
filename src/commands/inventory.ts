import { SlashCommandBuilder, ChatInputCommandInteraction, Message, AttachmentBuilder, MessageFlags } from 'discord.js';
import { createCanvas } from 'canvas';
import Inventory from '../database/models/Inventory';
import ShopItem from '../database/models/ShopItem';

export default {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Shows your purchased items and their limits.'),

    async execute(interaction: ChatInputCommandInteraction) {
        return this.handleInventoryCommand(interaction);
    },

    async messageExecute(message: Message, args: string[]) {
        return this.handleInventoryCommand(message);
    },

    async handleInventoryCommand(context: any) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        const authorId = isInteraction ? context.user.id : context.author.id;

        try {
            const userInventory = await Inventory.findOne({ userId: authorId }).lean();

            if (!userInventory || !userInventory.items || userInventory.items.length === 0) {
                const msg = '👜 Your inventory is empty. Pick up some items in the `$shop`!';
                return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
            }

            // Group items by itemId
            const groupedItems: { [key: string]: { name: string, count: number } } = {};
            userInventory.items.forEach((item: any) => {
                if (!groupedItems[item.itemId]) {
                    groupedItems[item.itemId] = { name: item.name, count: 0 };
                }
                groupedItems[item.itemId].count++;
            });

            // Fetch ShopItem details for limits and descriptions
            const uniqueItemIds = Object.keys(groupedItems);
            const shopItems = await ShopItem.find({ itemId: { $in: uniqueItemIds } }).lean();
            const shopItemMap = new Map(shopItems.map(item => [item.itemId, item]));

            const itemsToShow = uniqueItemIds.map((id: string) => {
                const info = groupedItems[id];
                const shopItem = shopItemMap.get(id);
                return {
                    name: info.name,
                    count: info.count,
                    limit: shopItem?.limit ?? -1,
                    description: shopItem?.description || 'No description.'
                };
            });

            const username = isInteraction ? context.user.username : context.author.username;
            const buffer = await this.generateInventoryImage(itemsToShow, username);
            const attachment = new AttachmentBuilder(buffer, { name: 'secured_inventory.png' });

            const replyContent = `👜 **Secured Inventory for ${username}**`;

            return isInteraction 
                ? context.reply({ content: replyContent, files: [attachment] }) 
                : context.reply({ content: replyContent, files: [attachment] });

        } catch (error) {
            console.error('[ERROR] Error in inventory command:', error);
            const msg = '❌ An error occurred while fetching your inventory.';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }
    },

    async generateInventoryImage(items: any[], username: string): Promise<Buffer> {
        const width = 1000;
        const height = 700;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Draw Tor Browser Window (Dark/Purple Theme)
        ctx.fillStyle = '#1c1b22'; // Tor Dark Background
        ctx.fillRect(0, 0, width, height);

        // Header Bar
        ctx.fillStyle = '#2b2a33';
        ctx.fillRect(0, 0, width, 50);

        // Address Bar (Tor Style)
        ctx.fillStyle = '#38383d';
        this.roundRect(ctx, 150, 10, 700, 30, 5);
        ctx.fill();

        // Browser Icons (Placeholders)
        ctx.fillStyle = '#800080'; // Purple Tor Onion
        ctx.beginPath();
        ctx.arc(170, 25, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`vault://${username.toLowerCase()}.onion/inventory`, 190, 30);

        // Main Content Area
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(50, 80, width - 100, height - 130);

        // Welcome Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 45px Sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${username.toUpperCase()}'S SECURED VAULT`, width / 2, 150);

        ctx.font = 'italic 20px Sans-serif';
        ctx.fillStyle = '#bbbbbb';
        ctx.fillText('Encrypted. Private. Owned.', width / 2, 185);

        // List Inventory Items
        let itemY = 250;
        const spacing = 70;

        ctx.textAlign = 'left';

        items.forEach((item, index) => {
            if (index > 4) return; // Limit to 5 items on screen

            // Item Box
            ctx.fillStyle = '#3a3a3e';
            this.roundRect(ctx, 80, itemY - 40, width - 160, 50, 5);
            ctx.fill();

            // Item Name & Quantity
            const itemName = item.name || 'Unknown Item';
            const itemDescription = item.description || 'No description available.';
            const count = item.count || 0;
            const limit = item.limit || -1;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Sans-serif';
            ctx.fillText(`${itemName.toUpperCase()}`, 100, itemY - 7);

            ctx.fillStyle = '#00ff00';
            ctx.textAlign = 'right';
            const limitText = limit === -1 ? '∞' : limit.toString();
            ctx.fillText(`QTY: ${count} / ${limitText}`, width - 100, itemY - 7);

            ctx.textAlign = 'left';
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '16px Sans-serif';
            ctx.fillText(itemDescription, 100, itemY + 15);

            itemY += spacing;
        });

        // Bottom Banner
        ctx.fillStyle = '#4b0082'; // Indigo
        ctx.fillRect(0, height - 40, width, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SECURED VAULT ACCESS - ZION EDITION v7.7.7', width / 2, height - 15);

        return canvas.toBuffer();
    },

    roundRect(ctx: any, x: number, y: number, width: number, height: number, radius: number) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
};
