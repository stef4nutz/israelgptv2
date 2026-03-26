import { SlashCommandBuilder, ChatInputCommandInteraction, Message, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import BankCard from '../database/models/BankCard';
import User from '../database/models/User';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('card')
        .setDescription('View your beautiful Visarel debit card!'),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const card = await BankCard.findOne({ userId: interaction.user.id });

            if (!card) {
                return interaction.editReply('❌ You do not have a bank card yet! Use `/registercard` to get one.');
            }

            const user = await User.findOne({ userId: interaction.user.id });
            const buffer = await this.generateCardImage(card, user?.nationality || 'Israelian');
            const attachmentName = (user?.nationality === 'American') ? 'visamerican_card.png' : 'visarel_card.png';
            const attachment = new AttachmentBuilder(buffer, { name: attachmentName });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error generating card image:', error);
            await interaction.editReply('There was an error generating your card image. Please try again later.');
        }
    },

    async messageExecute(message: Message, args: string[]) {
        try {
            const card = await BankCard.findOne({ userId: message.author.id });

            if (!card) {
                return message.reply('❌ You do not have a bank card yet! Type `$registercard` to get one.');
            }

            const user = await User.findOne({ userId: message.author.id });
            const buffer = await this.generateCardImage(card, user?.nationality || 'Israelian');
            const attachmentName = (user?.nationality === 'American') ? 'visamerican_card.png' : 'visarel_card.png';
            const attachment = new AttachmentBuilder(buffer, { name: attachmentName });
            await message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Error generating card image:', error);
            await message.reply('There was an error generating your card image. Please try again later.');
        }
    },

    async generateCardImage(card: any, nationality: string): Promise<Buffer> {
        const isAmerican = (nationality || '').toLowerCase() === 'american';
        const width = 800;
        const height = 500;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Draw Card Background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        
        if (isAmerican) {
            gradient.addColorStop(0, '#B22234'); // USA Red
            gradient.addColorStop(0.5, '#ffffff'); // White
            gradient.addColorStop(1, '#3C3B6E'); // USA Blue
        } else {
            gradient.addColorStop(0, '#0038b8'); // Israeli Blue
            gradient.addColorStop(1, '#ffffff'); // White
        }
        
        ctx.fillStyle = gradient;
        // Rounded corners for the card
        this.roundRect(ctx, 0, 0, width, height, 40);
        ctx.fill();

        // Card Border
        ctx.strokeStyle = isAmerican ? '#3C3B6E' : '#0038b8';
        ctx.lineWidth = 10;
        this.roundRect(ctx, 0, 0, width, height, 40);
        ctx.stroke();

        // Logo (Top Right)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px Sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(isAmerican ? 'VISAMERICAN' : 'VISAREL', width - 50, 80);
        
        // Subtitle logic
        ctx.font = '20px Sans-serif';
        ctx.fillText(isAmerican ? 'Debit America' : 'Debit Israel', width - 50, 110);

        // Draw Background Icon (Stars for USA, Star of David for Israel)
        ctx.save();
        ctx.globalAlpha = 0.15;
        if (isAmerican) {
            ctx.fillStyle = '#ffffff';
            const drawStar = (cx: number, cy: number, spokes: number, inner: number, outer: number) => {
                let rot = Math.PI / 2 * 3;
                let x = cx;
                let y = cy;
                const step = Math.PI / spokes;
                ctx.beginPath();
                ctx.moveTo(cx, cy - outer);
                for (let i = 0; i < spokes; i++) {
                    x = cx + Math.cos(rot) * outer;
                    y = cy + Math.sin(rot) * outer;
                    ctx.lineTo(x, y);
                    rot += step;
                    x = cx + Math.cos(rot) * inner;
                    y = cy + Math.sin(rot) * inner;
                    ctx.lineTo(x, y);
                    rot += step;
                }
                ctx.lineTo(cx, cy - outer);
                ctx.closePath();
                ctx.fill();
            };
            drawStar(width / 2, height / 2, 5, 40, 100);
            drawStar(width / 2 - 200, height / 2 - 100, 5, 20, 50);
            drawStar(width / 2 + 200, height / 2 + 100, 5, 20, 50);
        } else {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 10;
            this.drawStar(ctx, width / 2, height / 2, 150);
        }
        ctx.restore();

        // Chip placeholder
        ctx.fillStyle = '#C0A040'; // Gold/Brass Chip
        this.roundRect(ctx, 60, 150, 100, 70, 10);
        ctx.fill();
        
        // Chip lines
        ctx.strokeStyle = '#806020';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(85, 150); ctx.lineTo(85, 220);
        ctx.moveTo(110, 150); ctx.lineTo(110, 220);
        ctx.moveTo(135, 150); ctx.lineTo(135, 220);
        ctx.moveTo(60, 175); ctx.lineTo(160, 175);
        ctx.moveTo(60, 195); ctx.lineTo(160, 195);
        ctx.stroke();

        // Card Number
        const maskedNumber = `**** **** **** ${card.cardNumber.slice(-4)}`;
        ctx.fillStyle = '#ffffff';
        ctx.font = '50px Monospace';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(maskedNumber, 60, 320);
        ctx.shadowBlur = 0;

        // Expiry Date
        ctx.font = '25px Sans-serif';
        ctx.fillText('VALID THRU', 350, 380);
        ctx.font = '35px Sans-serif';
        ctx.fillText(card.expiryDate, 350, 420);

        // Holder Name
        ctx.font = '35px Monospace';
        ctx.fillText(card.username.toUpperCase(), 60, 440);

        // Visa Logo Replica (Bottom Right)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'italic bold 60px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('VISA', width - 50, height - 50);

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
    },

    drawStar(ctx: any, x: number, y: number, size: number) {
        ctx.beginPath();
        // Top triangle
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y + size/2);
        ctx.lineTo(x - size, y + size/2);
        ctx.closePath();
        ctx.stroke();
        // Bottom triangle
        ctx.beginPath();
        ctx.moveTo(x, y + size);
        ctx.lineTo(x + size, y - size/2);
        ctx.lineTo(x - size, y - size/2);
        ctx.closePath();
        ctx.stroke();
    }
};
