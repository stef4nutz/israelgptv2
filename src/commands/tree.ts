import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    AttachmentBuilder,
    MessageFlags
} from 'discord.js';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import User from '../database/models/User';
import Relationship from '../database/models/Relationship';

interface Member {
    userId: string;
    username: string;
}

interface TreeNode {
    user: Member;
    spouse: Member | null;
    children: TreeNode[];
    x: number;
    y: number;
    width: number;
    depth: number;
}

export default {
    data: new SlashCommandBuilder()
        .setName('tree')
        .setDescription('View your Family Tree with adoption lineages!'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        await interaction.deferReply();
        await this.handleTree(interaction, interaction.user.id);
    },

    async messageExecute(message: Message, args: string[]) {
        await this.handleTree(message, message.author.id);
    },

    async handleTree(context: any, userId: string) {
        try {
            const user = await User.findOne({ userId });

            if (!user || user.citizenshipStatus !== 'Approved') {
                const msg = `❌ You must be an approved ${user?.nationality || 'Israelian'} Citizen to have a family tree! Use \`/create\` first.`;
                if (context.editReply) await context.editReply({ content: msg });
                else await context.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
                return;
            }

            // 1. Root Identification: Go up to Grandparents via Relationship model
            const parentRels = await Relationship.find({ toId: userId, type: 'Adoption' });
            const parentIds = parentRels.map(r => r.fromId);
            
            const gparentRels = await Relationship.find({ toId: { $in: parentIds }, type: 'Adoption' });
            const gpIds = new Set(gparentRels.map(r => r.fromId));

            let rootsToProcess = Array.from(gpIds);
            if (rootsToProcess.length === 0) rootsToProcess = parentIds;
            if (rootsToProcess.length === 0) rootsToProcess = [userId];

            // 2. Build Tree Structure
            const globalHandledSpouses = new Set<string>();
            const rootNodes: TreeNode[] = [];
            
            for (const rId of rootsToProcess) {
                if (globalHandledSpouses.has(rId)) continue;
                const node = await this.fetchNodeRecursive(rId, 0, new Set(), globalHandledSpouses);
                if (node) rootNodes.push(node);
            }

            if (rootNodes.length === 0) {
                throw new Error("No tree nodes generated");
            }

            // 3. Layout Calculation
            let totalTreeWidth = 0;
            const horizontalGap = 60;
            for (const root of rootNodes) {
                totalTreeWidth += this.calculateLayout(root, 0, totalTreeWidth);
                totalTreeWidth += horizontalGap;
            }
            totalTreeWidth -= horizontalGap;

            // 4. Generate Image
            const buffer = await this.drawTree(rootNodes, totalTreeWidth, user.userId, user.nationality || 'Israelian');

            const attachment = new AttachmentBuilder(buffer, { name: 'family_tree.png' });
            
            if (context.editReply) {
                await context.editReply({ files: [attachment] });
            } else {
                await context.reply({ files: [attachment] });
            }

        } catch (error) {
            console.error('Error in handleTree:', error);
            const errMsg = '❌ Error generating tree. Please try again.';
            if (context.editReply) await context.editReply(errMsg);
            else await context.reply(errMsg);
        }
    },

    async fetchNodeRecursive(userId: string, depth: number, path: Set<string>, globalHandledSpouses: Set<string>): Promise<TreeNode | null> {
        // Prevent infinite recursion or too deep trees
        if (path.has(userId) || depth > 12) return null;

        const user = await User.findOne({ userId });
        if (!user) return null;

        const newPath = new Set(path);
        newPath.add(userId);

        // Find spouse from Relationship model
        const marriage = await Relationship.findOne({
            type: 'Marriage',
            $or: [{ fromId: userId }, { toId: userId }]
        });

        let spouseData: Member | null = null;
        let spouseId: string | null = null;
        if (marriage) {
            spouseId = marriage.fromId === userId ? marriage.toId : marriage.fromId;
            const sp = await User.findOne({ userId: spouseId });
            if (sp) {
                spouseData = { userId: sp.userId, username: sp.username };
                globalHandledSpouses.add(spouseId);
            }
        }

        // Find children from Relationship model
        const potentialAdopters = spouseId ? [userId, spouseId] : [userId];
        const childrenRels = await Relationship.find({
            fromId: { $in: potentialAdopters },
            type: 'Adoption'
        });

        const childrenNodes: TreeNode[] = [];
        const allChildrenIds = Array.from(new Set(childrenRels.map(r => r.toId)));

        for (const cId of allChildrenIds) {
            const childNode = await this.fetchNodeRecursive(cId, depth + 1, newPath, globalHandledSpouses);
            if (childNode) {
                // Attach adopter info for drawing specific lines
                const childAdopters = childrenRels.filter(r => r.toId === cId).map(r => r.fromId);
                (childNode as any).adopterIds = childAdopters;
                childrenNodes.push(childNode);
            }
        }

        return {
            user: { userId: user.userId, username: user.username },
            spouse: spouseData,
            children: childrenNodes,
            x: 0,
            y: 0,
            width: 0,
            depth
        };
    },

    calculateLayout(node: TreeNode, depth: number, xStart: number): number {
        const cardWidth = 180;
        const spouseGap = 30;
        const nodeWidth = node.spouse ? (cardWidth * 2 + spouseGap) : cardWidth;
        const siblingGap = 40;
        const layerHeight = 220;

        node.y = 280 + depth * layerHeight;
        node.depth = depth;

        if (node.children.length === 0) {
            node.width = nodeWidth;
            node.x = xStart + node.width / 2;
            return node.width;
        }

        let currentX = xStart;
        let childrenTotalWidth = 0;
        for (let i = 0; i < node.children.length; i++) {
            const childWidth = this.calculateLayout(node.children[i], depth + 1, currentX);
            childrenTotalWidth += childWidth;
            if (i < node.children.length - 1) childrenTotalWidth += siblingGap;
            currentX = xStart + childrenTotalWidth;
        }

        node.width = Math.max(nodeWidth, childrenTotalWidth);
        
        if (nodeWidth > childrenTotalWidth) {
            const offset = (nodeWidth - childrenTotalWidth) / 2;
            const shift = (n: TreeNode, amt: number) => {
                n.x += amt;
                n.children.forEach(c => shift(c, amt));
            };
            node.children.forEach(c => shift(c, offset));
            node.x = xStart + nodeWidth / 2;
        } else {
            const firstChild = node.children[0];
            const lastChild = node.children[node.children.length - 1];
            node.x = (firstChild.x + lastChild.x) / 2;
        }

        return node.width;
    },

    async drawTree(rootNodes: TreeNode[], treeWidth: number, mainUserId: string, nationality: string): Promise<Buffer> {
        let maxDepth = 0;
        const findMaxDepth = (n: TreeNode) => {
            if (n.depth > maxDepth) maxDepth = n.depth;
            n.children.forEach(findMaxDepth);
        };
        rootNodes.forEach(findMaxDepth);

        const padding = 200;
        const canvasWidth = Math.max(1200, treeWidth + padding * 2);
        const canvasHeight = Math.max(800, 300 + (maxDepth + 1) * 220 + padding);

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d') as any;

        const isAmerican = nationality === 'American';
        const primaryColor = isAmerican ? '#3C3B6E' : '#0038B8'; // Blue for both but different shades
        const secondaryColor = isAmerican ? '#B22234' : '#0038B8'; // Red for USA
        const titleText = isAmerican ? 'AMERICAN FAMILY TREE' : 'ISRAELIAN FAMILY TREE';

        // Background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Bars
        const barH = 60;
        if (isAmerican) {
            // American Style: Red and Blue bars at top/bottom
            ctx.fillStyle = '#B22234'; // Red
            ctx.fillRect(0, 40, canvasWidth, barH / 2);
            ctx.fillStyle = '#3C3B6E'; // Blue
            ctx.fillRect(0, 40 + barH / 2, canvasWidth, barH / 2);

            ctx.fillStyle = '#B22234';
            ctx.fillRect(0, canvasHeight - barH - 40, canvasWidth, barH / 2);
            ctx.fillStyle = '#3C3B6E';
            ctx.fillRect(0, canvasHeight - barH / 2 - 40, canvasWidth, barH / 2);
        } else {
            // Israelian Style
            ctx.fillStyle = '#0038B8';
            ctx.fillRect(0, 40, canvasWidth, barH);
            ctx.fillRect(0, canvasHeight - barH - 40, canvasWidth, barH);
        }

        // Watermark
        ctx.globalAlpha = 0.05;
        if (isAmerican) {
            this.drawUSStar(ctx, canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.4);
        } else {
            this.drawStar(ctx, canvasWidth / 2, canvasHeight / 2, Math.min(canvasWidth, canvasHeight) * 0.4);
        }
        ctx.globalAlpha = 1.0;

        // Title
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 54px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(titleText, canvasWidth / 2, 95);

        // Draw connections and nodes
        const cardW = 180;
        const cardH = 50;
        const spouseGap = 30;

        const drawElements = (node: TreeNode) => {
            const isMain = node.user.userId === mainUserId;
            const isSpouseMain = node.spouse?.userId === mainUserId;

            let userX = node.x;
            let spouseX = 0;

            if (node.spouse) {
                userX = node.x - (cardW + spouseGap) / 2;
                spouseX = node.x + (cardW + spouseGap) / 2;

                // Marriage connection line
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(userX + cardW / 2, node.y);
                ctx.lineTo(spouseX - cardW / 2, node.y);
                ctx.stroke();

                this.drawCard(ctx, node.user.username, userX, node.y, isMain ? primaryColor : '#111111');
                this.drawCard(ctx, node.spouse.username, spouseX, node.y, isSpouseMain ? primaryColor : '#111111');
            } else {
                this.drawCard(ctx, node.user.username, node.x, node.y, isMain ? primaryColor : '#111111');
            }

            node.children.forEach(child => {
                let sourceX = node.x;
                const childAdopters = (child as any).adopterIds || [];
                
                if (node.spouse) {
                    const adoptedByUser = childAdopters.includes(node.user.userId);
                    const adoptedBySpouse = childAdopters.includes(node.spouse.userId);
                    
                    if (adoptedByUser && !adoptedBySpouse) sourceX = userX;
                    else if (!adoptedByUser && adoptedBySpouse) sourceX = spouseX;
                    else sourceX = node.x;
                }

                this.drawConnector(ctx, sourceX, node.y + cardH / 2, child.x, child.y - cardH / 2);
                drawElements(child);
            });
        };

        rootNodes.forEach(drawElements);

        return canvas.toBuffer();
    },

    drawUSStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        ctx.fillStyle = '#3C3B6E';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            ctx.lineTo(x + size * Math.cos((18 + i * 72) / 180 * Math.PI), y - size * Math.sin((18 + i * 72) / 180 * Math.PI));
            ctx.lineTo(x + size / 2.5 * Math.cos((54 + i * 72) / 180 * Math.PI), y - size / 2.5 * Math.sin((54 + i * 72) / 180 * Math.PI));
        }
        ctx.closePath();
        ctx.fill();
    },

    drawCard(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, color: string) {
        const w = 180;
        const h = 50;
        const r = 12;

        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = color;
        this.roundRect(ctx, x - w / 2, y - h / 2, w, h, r);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let displayName = name.toUpperCase();
        if (displayName.length > 15) displayName = displayName.substring(0, 13) + '...';
        ctx.fillText(displayName, x, y);
    },

    drawConnector(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const midY = (y1 + y2) / 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1, midY);
        ctx.lineTo(x2, midY);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    },

    roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
        const h = size * (Math.sqrt(3) / 2);
        ctx.strokeStyle = '#0038B8';
        ctx.lineWidth = size * 0.05;
        
        ctx.beginPath();
        ctx.moveTo(x, y - h / 3 * 2);
        ctx.lineTo(x - size / 2, y + h / 3);
        ctx.lineTo(x + size / 2, y + h / 3);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + h / 3 * 2);
        ctx.lineTo(x - size / 2, y - h / 3);
        ctx.lineTo(x + size / 2, y - h / 3);
        ctx.closePath();
        ctx.stroke();
    }
};
