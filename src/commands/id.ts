import { SlashCommandBuilder, ChatInputCommandInteraction, Message, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import User from '../database/models/User';
import Relationship from '../database/models/Relationship';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('id')
        .setDescription('Generate a Citizenship ID card (yours or another user\'s).')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user whose ID you want to see')
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const user = await User.findOne({ userId: targetUser.id });

            if (!user) {
                const errorMsg = targetUser.id === interaction.user.id
                    ? '❌ You do not have a Citizenship yet! Use `/create` to start the process.'
                    : `❌ **${targetUser.username}** does not have a Citizenship yet!`;
                return interaction.editReply(errorMsg);
            }

            const buffer = await this.generateProfileCard(
                targetUser.username,
                targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                user
            );

            const attachment = new AttachmentBuilder(buffer, { name: 'profile_id.png' });
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Error generating profile card:', error);
            await interaction.editReply('There was an error generating the ID card. Please try again later.');
        }
    },

    async messageExecute(message: Message, args: string[]) {
        try {
            const targetUser = message.mentions.users.first() || message.author;
            const user = await User.findOne({ userId: targetUser.id });

            if (!user) {
                const errorMsg = targetUser.id === message.author.id
                    ? '❌ You do not have a Citizenship yet! Type `$create` to start the process.'
                    : `❌ **${targetUser.username}** does not have a Citizenship yet!`;
                return message.reply(errorMsg);
            }

            const buffer = await this.generateProfileCard(
                targetUser.username,
                targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                user
            );

            const attachment = new AttachmentBuilder(buffer, { name: 'profile_id.png' });
            await message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Error generating profile card:', error);
            await message.reply('There was an error generating the ID card. Please try again later.');
        }
    },

    async generateProfileCard(username: string, avatarUrl: string, userData: any): Promise<Buffer> {
        const isAmerican = (userData.nationality || '').toLowerCase() === 'american';
        const width = 800;
        const height = 500;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Draw Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Header/Footer Colors
        const primaryColor = isAmerican ? '#3C3B6E' : '#0038b8'; // USA Blue / Israeli Blue
        const accentColor = isAmerican ? '#B22234' : '#0038b8';  // USA Red / Israeli Blue

        ctx.fillStyle = primaryColor;
        ctx.fillRect(0, 0, width, 80);
        ctx.fillStyle = accentColor;
        ctx.fillRect(0, height - 20, width, 20);

        // Title text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isAmerican ? 'UNITED STATES CITIZENSHIP ID' : 'ISRAELIAN CITIZENSHIP ID', width / 2, 55);

        // Draw Nationality Icon
        if (isAmerican) {
            ctx.fillStyle = '#3C3B6E';
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

            ctx.save();
            ctx.globalAlpha = 0.8;
            drawStar(700, 200, 5, 15, 35);
            drawStar(650, 250, 5, 15, 35);
            drawStar(750, 250, 5, 15, 35);
            ctx.restore();
        } else {
            ctx.strokeStyle = '#0038b8';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(700, 150);
            ctx.lineTo(750, 250);
            ctx.lineTo(650, 250);
            ctx.closePath();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(700, 280);
            ctx.lineTo(750, 180);
            ctx.lineTo(650, 180);
            ctx.closePath();
            ctx.stroke();
        }

        // Draw Avatar
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(150, 250, 80, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 70, 170, 160, 160);
            ctx.restore();
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(150, 250, 80, 0, Math.PI * 2, true);
            ctx.stroke();

            // Presidential Badge (Above Avatar)
            if (userData.isPresident && userData.presidentOf !== 'None') {
                const isAmPresident = userData.presidentOf === 'American';
                const badgeColor = isAmPresident ? '#B22234' : '#0038b8';
                const badgeText = isAmPresident ? 'US PRESIDENT' : 'ISRAELIAN PRESIDENT';

                ctx.save();
                ctx.fillStyle = badgeColor;
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                const bx = 150 - 110;
                const by = 170 - 45;
                const bw = 220;
                const bh = 35;
                const radius = 10;
                ctx.beginPath();
                ctx.moveTo(bx + radius, by);
                ctx.lineTo(bx + bw - radius, by);
                ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
                ctx.lineTo(bx + bw, by + bh - radius);
                ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
                ctx.lineTo(bx + radius, by + bh);
                ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
                ctx.lineTo(bx, by + radius);
                ctx.quadraticCurveTo(bx, by, bx + radius, by);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px Sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(badgeText, 150, by + 24);
                ctx.restore();
            }
        } catch (e) {
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(70, 170, 160, 160);
        }

        // Draw User Info
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        const detailsX = 280;
        let detailsY = 160;
        const spacing = 45;

        ctx.font = 'bold 30px Sans-serif';
        ctx.fillText(`NAME: ${username.toUpperCase()}`, detailsX, detailsY);
        ctx.font = '25px Sans-serif';
        detailsY += spacing;
        ctx.fillText(`NATIONALITY: ${userData.nationality || 'Undisclosed'}`, detailsX, detailsY);
        detailsY += spacing;
        ctx.fillText(`AGE: ${userData.age || 'Unknown'}`, detailsX, detailsY);
        detailsY += spacing;
        ctx.fillText(`GENDER: ${userData.gender || 'Other'}`, detailsX, detailsY);
        detailsY += spacing;
        ctx.font = 'italic 20px Sans-serif';
        ctx.fillText(`REASON: ${userData.reasonForImmigration || 'Classified'}`, detailsX, detailsY);

        const marriage = await Relationship.findOne({
            type: 'Marriage',
            $or: [{ fromId: userData.userId }, { toId: userData.userId }]
        });

        if (marriage) {
            try {
                const spouseId = marriage.fromId === userData.userId ? marriage.toId : marriage.fromId;
                const spouse = await User.findOne({ userId: spouseId });
                if (spouse) {
                    detailsY += spacing;
                    ctx.font = 'bold 22px Sans-serif';
                    ctx.fillStyle = '#C71585';
                    ctx.fillText(`MARRIED TO: ${spouse.username.toUpperCase()}`, detailsX, detailsY);
                }
            } catch (e) {}
        }

        // Status Stamp
        ctx.save();
        ctx.translate(150, 360);
        ctx.rotate(-0.15);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#228B22';
        ctx.lineWidth = 4;
        ctx.strokeRect(-100, -30, 200, 60);
        ctx.fillStyle = '#228B22';
        ctx.font = 'bold 35px Sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('APPROVED', 0, 12);
        ctx.restore();
        ctx.globalAlpha = 1.0;

        // Fake Serial Number
        ctx.fillStyle = '#888888';
        ctx.font = '15px Monospace';
        const idPrefix = isAmerican ? 'USA' : 'ISR';
        ctx.fillText(`ID NO: ${idPrefix}-${userData.userId.slice(-6)}-${Date.now().toString().slice(-4)}`, 20, height - 40);

        return canvas.toBuffer();
    }
};
