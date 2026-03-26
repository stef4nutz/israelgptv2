import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    MessageFlags 
} from 'discord.js';
import User from '../database/models/User';
import NationalBank from '../database/models/NationalBank';

export default {
    data: new SlashCommandBuilder()
        .setName('war')
        .setDescription('Declare war on the opposing nation to loot their treasury!'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        return this.handleWarDeclaration(interaction);
    },

    async messageExecute(message: Message, args: string[]) {
        return this.handleWarDeclaration(message);
    },

    async handleWarDeclaration(context: any) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        const authorId = isInteraction ? context.user.id : context.author.id;
        
        const senderData = await User.findOne({ userId: authorId });
        if (!senderData || (!senderData.isPresident && !senderData.isVicePresident && !senderData.isPrimeMinister)) {
            const msg = '❌ **Access Denied.** Only the President, Vice President, or Prime Minister can declare war.';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const ourNation = senderData.presidentOf !== 'None' ? senderData.presidentOf : 
                        senderData.vicePresidentOf !== 'None' ? senderData.vicePresidentOf : 
                        senderData.primeMinisterOf;
        const theirNation = ourNation === 'Israelian' ? 'American' : 'Israelian';

        // Check military count (Must be at least 5 for both)
        const ourMilitaryCount = await User.countDocuments({ nationality: ourNation, isMilitary: true });
        const theirMilitaryCount = await User.countDocuments({ nationality: theirNation, isMilitary: true });

        if (ourMilitaryCount < 5 || theirMilitaryCount < 5) {
            const msg = `❌ **Call to Arms Failed.** Both nations must have at least **5 military members** to start a war!\n\n**Current Strength:**\n- ${ourNation}: ${ourMilitaryCount}/5\n- ${theirNation}: ${theirMilitaryCount}/5`;
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        try {
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('war_accept')
                        .setLabel(`Accept War Declaration from ${ourNation}`)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('war_decline')
                        .setLabel('Decline')
                        .setStyle(ButtonStyle.Secondary)
                );

            const flag = ourNation === 'Israelian' ? '🇮🇱' : '🇺🇸';
            const targetFlag = theirNation === 'Israelian' ? '🇮🇱' : '🇺🇸';
            
            const initialMsg = `${flag} **WAR DECLARATION!** ${flag}\n\nThe **${ourNation}** leaders have declared war on **${theirNation}** ${targetFlag}!\n\nA leader from **${theirNation}** (President, VP, or PM) must **ACCEPT** this challenge to begin the conflict!`;

            let originalMsg: any;
            if (isInteraction) {
                originalMsg = await context.reply({ content: initialMsg, components: [row], fetchReply: true });
            } else {
                originalMsg = await context.reply({ content: initialMsg, components: [row] });
            }

            const collector = originalMsg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000 // 1 minute to accept
            });

            collector.on('collect', async (i: any) => {
                try {
                    const responderData = await User.findOne({ userId: i.user.id });
                    
                    // Check if responder is a leader of the TARGET nation
                    if (!responderData || responderData.nationality !== theirNation || (!responderData.isPresident && !responderData.isVicePresident && !responderData.isPrimeMinister)) {
                        return i.reply({ content: `❌ Only a leader of **${theirNation}** can respond to this declaration!`, flags: [MessageFlags.Ephemeral] });
                    }

                    if (i.customId === 'war_decline') {
                        collector.stop('declined');
                        return i.update({ content: `🏳️ **War Avoided.** The leaders of **${theirNation}** have declined the war declaration. Chicken!`, components: [] });
                    }

                    if (i.customId === 'war_accept') {
                        collector.stop('accepted');
                        await i.update({ content: `⚔️ **THE WAR HAS BEGUN!** ⚔️\n\nCalculating the outcome based on military strength...`, components: [] });
                        
                        // Final calculation
                        setTimeout(async () => {
                            try {
                                const latestOurMilitary = await User.countDocuments({ nationality: ourNation, isMilitary: true });
                                const latestTheirMilitary = await User.countDocuments({ nationality: theirNation, isMilitary: true });

                                // Combat Logic: Strength ratio + Random factor
                                // winChance ranges from 0.1 to 0.9
                                let winChance = 0.5 + (latestOurMilitary - latestTheirMilitary) * 0.05;
                                winChance = Math.max(0.1, Math.min(0.9, winChance));

                                const weWon = Math.random() < winChance;
                                const winnerNation = weWon ? ourNation : theirNation;
                                const loserNation = weWon ? theirNation : ourNation;

                                const winnerBank = await NationalBank.findOne({ nation: winnerNation });
                                const loserBank = await NationalBank.findOne({ nation: loserNation });

                                if (!winnerBank || !loserBank) return i.followUp('❌ Error retrieving treasury records.');

                                const lootPercent = 0.50;
                                const rawLoot = Math.floor(loserBank.balance * lootPercent);
                                
                                let finalLoot = rawLoot;
                                let lowFundsMsg = "";
                                
                                if (loserBank.balance < 1000) {
                                    finalLoot = Math.max(0, loserBank.balance);
                                    lowFundsMsg = `\n⚠️ *Wait, the **${loserNation}** treasury is so poor that there was barely anything to take!*`;
                                }

                                loserBank.balance -= finalLoot;
                                winnerBank.balance += finalLoot;

                                await loserBank.save();
                                await winnerBank.save();

                                const winnerFlag = winnerNation === 'Israelian' ? '🇮🇱' : '🇺🇸';
                                const loserFlag = loserNation === 'Israelian' ? '🇮🇱' : '🇺🇸';

                                const resultMsg = `🏆 **VICTORY FOR ${winnerNation.toUpperCase()}!** ${winnerFlag}\n\nThe **${winnerNation}** military has crushed the **${loserNation}** forces!\n\n**LOOT REPORT:**\n- **Stolen Funds:** ${finalLoot.toLocaleString()} ${winnerBank.currency} (50% of Treasury)${lowFundsMsg}\n\n**New Treasury Balances:**\n- ${winnerNation}: ${winnerBank.balance.toLocaleString()} ${winnerBank.currency}\n- ${loserNation}: ${loserBank.balance.toLocaleString()} ${loserBank.currency}`;

                                await i.followUp(resultMsg);
                            } catch (err) {
                                console.error('Error in war outcome calculation:', err);
                            }
                        }, 5000);
                    }
                } catch (err) {
                    console.error('Error in war interaction:', err);
                }
            });

            collector.on('end', (collected: any, reason: string) => {
                if (reason === 'time') {
                    originalMsg.edit({ content: `⌛ **Request Expired.** The war declaration was ignored.`, components: [] }).catch(() => {});
                }
            });
        } catch (error) {
            console.error('Error in handleWarDeclaration:', error);
            throw error;
        }
    }
};
