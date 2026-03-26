import { SlashCommandBuilder, ChatInputCommandInteraction, Message, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import ShopItem from '../database/models/ShopItem';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Enter the Israel Web Shop via Tor!'),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const items = await ShopItem.find({});
            const buffer = await this.generateShopImage(items);
            const attachment = new AttachmentBuilder(buffer, { name: 'israel_web_shop.png' });

            await interaction.editReply({
                content: '🌐 **Welcome to the Israel Web.** Use `/buy <itemName>` to purchase items.',
                files: [attachment]
            });

        } catch (error) {
            console.error('Error generating shop image:', error);
            await interaction.editReply('There was an error accessing the Israel Web.');
        }
    },

    async messageExecute(message: Message, args: string[]) {
        try {
            const items = await ShopItem.find({});
            const buffer = await this.generateShopImage(items);
            const attachment = new AttachmentBuilder(buffer, { name: 'israel_web_shop.png' });

            await message.reply({
                content: '🌐 **Welcome to the Israel Web.** Type `$buy <itemName>` to purchase items.',
                files: [attachment]
            });

        } catch (error) {
            console.error('Error generating shop image:', error);
            await message.reply('There was an error accessing the Israel Web.');
        }
    },

    async generateShopImage(items: any[]): Promise<Buffer> {
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
        ctx.fillText('trumploveskidsandgoyimssuxbutloveepstein.onion', 190, 30);

        // Main Content Area
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(50, 80, width - 100, height - 130);

        // Welcome Header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 45px Sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WELCOME TO THE ISRAEL WEB!', width / 2, 150);

        ctx.font = 'italic 20px Sans-serif';
        ctx.fillStyle = '#bbbbbb';
        ctx.fillText('Secure. Private. Zion-Approved.', width / 2, 185);

        // List Shop Items
        let itemY = 250;
        const spacing = 70;

        ctx.textAlign = 'left';

        items.forEach((item, index) => {
            if (index > 4) return; // Limit to 5 items on screen

            // Item Box
            ctx.fillStyle = '#3a3a3e';
            this.roundRect(ctx, 80, itemY - 40, width - 160, 50, 5);
            ctx.fill();

            // Item Name & Price
            const itemName = item.name || 'Unknown Item';
            const itemPrice = item.price || 0;
            const itemDescription = item.description || 'No description available.';
            const itemStock = item.stock ?? -1;
            const itemSoldCount = item.soldCount ?? 0;

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Sans-serif';
            ctx.fillText(`${itemName.toUpperCase()}`, 100, itemY - 7);

            const isSoldOut = itemStock !== -1 && itemSoldCount >= itemStock;

            if (isSoldOut) {
                ctx.fillStyle = '#ff0000';
                ctx.textAlign = 'right';
                ctx.fillText(`SOLD OUT`, width - 100, itemY - 7);
            } else {
                ctx.fillStyle = '#00ff00';
                ctx.textAlign = 'right';
                ctx.fillText(`₪${itemPrice.toLocaleString()}`, width - 100, itemY - 7);

                if (itemStock !== -1) {
                    ctx.font = 'bold 14px Sans-serif';
                    ctx.fillStyle = '#ffcc00';
                    ctx.fillText(`STOCK: ${itemStock - itemSoldCount}/${itemStock}`, width - 100, itemY + 15);
                }
            }

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
        ctx.fillText('TOR BROWSER - ZION EDITION v7.7.7', width / 2, height - 15);

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
