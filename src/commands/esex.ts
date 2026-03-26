import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    User as DiscordUser,
    MessageFlags
} from 'discord.js';
import User from '../database/models/User';
import EsexStats from '../database/models/EsexStats';

export default {
    data: new SlashCommandBuilder()
        .setName('esex')
        .setDescription('Simulate an intimate encounter with another citizen.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The person you want to have esex with')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.isChatInputCommand()) return;
        const targetUser = interaction.options.getUser('user')!;
        await this.handleEsex(interaction, interaction.user, targetUser);
    },

    async messageExecute(message: Message, args: string[]) {
        const targetUser = message.mentions.users.first();
        
        if (!targetUser) {
            return message.reply(`Please mention the user you want to have esex with! (e.g., \`$esex @user\`)`);
        }

        await this.handleEsex(message, message.author, targetUser);
    },

    async handleEsex(context: any, author: DiscordUser, targetUser: DiscordUser) {
        if (author.id === targetUser.id) {
            return context.reply({ content: '❌ Self-love is important, but this command requires a partner!', flags: [MessageFlags.Ephemeral] });
        }

        if (targetUser.bot) {
            return context.reply({ content: '❌ Errors: Bots do not have the necessary biological or digital ports for this.', flags: [MessageFlags.Ephemeral] });
        }

        const [authorData, targetData] = await Promise.all([
            User.findOne({ userId: author.id }),
            User.findOne({ userId: targetUser.id })
        ]);

        if (!authorData || authorData.citizenshipStatus !== 'Approved') {
            return context.reply({ content: `❌ You must be an approved citizen to use this command!`, flags: [MessageFlags.Ephemeral] });
        }

        if (!targetData || targetData.citizenshipStatus !== 'Approved') {
            return context.reply({ content: `❌ ${targetUser.username} is not an approved citizen!`, flags: [MessageFlags.Ephemeral] });
        }

        const consentRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('esex_yes').setLabel('Yes, let\'s go!').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('esex_no').setLabel('No, thanks').setStyle(ButtonStyle.Danger)
            );

        const response = await (context as any).reply({
            content: `💖 **ESEX REQUEST** 💖\n\n<@${targetUser.id}>, <@${author.id}> wants to have **esex** with you! Do you accept the invitation for a simulated encounter?`,
            components: [consentRow],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 minute session
        });

        let phase = 'consent';
        let actionsTaken = 0;
        let log: string[] = [];
        const genderType = this.getGenderType(authorData, targetData);

        collector.on('collect', async (i: any) => {
            if (phase === 'consent') {
                if (i.user.id !== targetUser.id) {
                    return i.reply({ content: 'This request is not for you!', flags: [MessageFlags.Ephemeral] });
                }

                if (i.customId === 'esex_yes') {
                    phase = 'actions';
                    const actionRow = this.getActionRow(genderType);
                    await i.update({
                        content: `🔥 **THE SIMULATION HAS BEGUN!** 🔥\n\n<@${author.id}>, select **3 actions** to perform on <@${targetUser.id}>!\n\n**Current Progress:** [ ] [ ] [ ]`,
                        components: [actionRow]
                    });
                } else {
                    await i.update({ content: `❌ Request declined.`, components: [] });
                    collector.stop();
                }
            } else if (phase === 'actions') {
                if (i.user.id !== author.id) {
                    return i.reply({ content: 'Only the initiator can choose the actions!', flags: [MessageFlags.Ephemeral] });
                }

                actionsTaken++;
                const actionLabel = i.component.label;
                const actionDesc = this.getActionDesc(genderType, i.customId.replace('esex_', ''), author.username, targetUser.username);
                log.push(actionDesc);

                const checklist = `**Current Progress:** ${Array(actionsTaken).fill('[x]').join(' ')} ${Array(3 - actionsTaken).fill('[ ]').join(' ')}`;
                
                if (actionsTaken < 3) {
                    const actionRow = this.getActionRow(genderType);
                    await i.update({
                        content: `🔥 **THE ENCOUNTER CONTINUES...** 🔥\n\n${log.join('\n')}\n\n${checklist}\n\n<@${author.id}>, choose your next move!`,
                        components: [actionRow]
                    });
                } else {
                    phase = 'climax';
                    const climaxRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('esex_climax_cum').setLabel('CUM').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('esex_climax_not').setLabel('DON\'T CUM').setStyle(ButtonStyle.Secondary)
                    );
                    await i.update({
                        content: `💦 **RISING TENSION!** 💦\n\n${log.join('\n')}\n\n**Current Progress:** [x] [x] [x]\n\n<@${author.id}>, it's the final moment! **CUM or DON'T CUM?**`,
                        components: [climaxRow]
                    });
                }
            } else if (phase === 'climax') {
                if (i.user.id !== author.id) {
                    return i.reply({ content: 'Only the initiator can make the final choice!', flags: [MessageFlags.Ephemeral] });
                }

                const finalChoice = i.customId === 'esex_climax_cum';
                const ending = this.getEnding(genderType, finalChoice, author.username, targetUser.username);
                
                // Update encounter count
                const [id1, id2] = [author.id, targetUser.id].sort();
                const stats = await EsexStats.findOneAndUpdate(
                    { userA: id1, userB: id2 },
                    { $inc: { count: 1 } },
                    { upsert: true, returnDocument: 'after' }
                );

                const countMsg = `\n\n📊 **Relationship Stats:** This was encounter #**${stats.count}** between you two!`;

                await i.update({
                    content: `✨ **SIMULATION COMPLETE** ✨\n\n${log.join('\n')}\n\n${ending}${countMsg}`,
                    components: []
                });
                collector.stop();
            }
        });

        collector.on('end', (collected: any, reason: string) => {
            if (reason === 'time' && phase !== 'climax' && collected.size < 5) {
                response.edit({ content: '⏰ Session timed out. The mood has passed.', components: [] }).catch(() => {});
            }
        });
    },

    getGenderType(userA: any, userB: any): 'straight' | 'gay' | 'lesbian' | 'trans' {
        const ga = userA.gender?.toLowerCase();
        const gb = userB.gender?.toLowerCase();
        if ((ga === 'male' && gb === 'female') || (ga === 'female' && gb === 'male')) return 'straight';
        if (ga === 'male' && gb === 'male') return 'gay';
        if (ga === 'female' && gb === 'female') return 'lesbian';
        return 'trans';
    },

    getActionRow(type: string): ActionRowBuilder<ButtonBuilder> {
        try {
            const actions: any = {
                straight: [
                    new ButtonBuilder().setCustomId('esex_s1').setLabel('Silk Touch'),
                    new ButtonBuilder().setCustomId('esex_s2').setLabel('Patriotic Kiss'),
                    new ButtonBuilder().setCustomId('esex_s3').setLabel('Undress'),
                    new ButtonBuilder().setCustomId('esex_s4').setLabel('Deep Entry'),
                    new ButtonBuilder().setCustomId('esex_s5').setLabel('Gentle Moan')
                ],
                gay: [
                    new ButtonBuilder().setCustomId('esex_g1').setLabel('Muscular Grip'),
                    new ButtonBuilder().setCustomId('esex_g2').setLabel('Muscle Flexing'),
                    new ButtonBuilder().setCustomId('esex_g3').setLabel('Tactical Wresting'),
                    new ButtonBuilder().setCustomId('esex_g4').setLabel('Power Move'),
                    new ButtonBuilder().setCustomId('esex_g5').setLabel('Sweaty Grunt')
                ],
                lesbian: [
                    new ButtonBuilder().setCustomId('esex_l1').setLabel('Soft Caress'),
                    new ButtonBuilder().setCustomId('esex_l2').setLabel('Synchronized Scissoring'),
                    new ButtonBuilder().setCustomId('esex_l3').setLabel('Ear Nibble'),
                    new ButtonBuilder().setCustomId('esex_l4').setLabel('Mirror Movement'),
                    new ButtonBuilder().setCustomId('esex_l5').setLabel('Soft Whisper')
                ],
                trans: [
                    new ButtonBuilder().setCustomId('esex_t1').setLabel('Aura Merge'),
                    new ButtonBuilder().setCustomId('esex_t2').setLabel('Glitter Friction'),
                    new ButtonBuilder().setCustomId('esex_t3').setLabel('Shifting Form'),
                    new ButtonBuilder().setCustomId('esex_t4').setLabel('Code Vibe'),
                    new ButtonBuilder().setCustomId('esex_t5').setLabel('Cosmic Merging')
                ]
            };

            const row = new ActionRowBuilder<ButtonBuilder>();
            const currentActions = actions[type] || actions.trans;
            currentActions.forEach((btn: ButtonBuilder) => {
                row.addComponents(btn.setStyle(ButtonStyle.Primary));
            });
            return row;
        } catch (error) {
            console.error('Error in getActionRow:', error);
            // Fallback row
            return new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('esex_fallback').setLabel('Mystery Action').setStyle(ButtonStyle.Primary)
            );
        }
    },

    getActionDesc(type: string, actionId: string, nameA: string, nameB: string): string {
        const descs: any = {
            // Straight
            s1: `➡️ **${nameA}** runs their fingers across **${nameB}**'s skin with silken precision.`,
            s2: `➡️ **${nameA}** locks lips with **${nameB}** in a passionate, state-approved kiss.`,
            s3: `➡️ **${nameA}** slowly removes **${nameB}**'s clothing, revealing the beauty beneath.`,
            s4: `➡️ **${nameA}** enters **${nameB}** deeply, feeling the warmth of their connection.`,
            s5: `➡️ **${nameB}** lets out a gentle moan as **${nameA}** hits just the right spot.`,
            // Gay
            g1: `➡️ **${nameA}** grabs **${nameB}** with a grip of pure, tactical masculinity.`,
            g2: `➡️ **${nameA}** and **${nameB}** flex their muscles in unison, a display of pure strength.`,
            g3: `➡️ They engage in a bout of sweaty, muscular wrestling that turns intimate.`,
            g4: `➡️ **${nameA}** executes a power move, asserting dominance in the sheets.`,
            g5: `➡️ A deep, masculine grunt escapes as they push their physical limits.`,
            // Lesbian
            l1: `➡️ **${nameA}** caresses **${nameB}** with a tenderness only they can share.`,
            l2: `➡️ They engage in perfectly synchronized scissoring, a masterpiece of coordination.`,
            l3: `➡️ **${nameA}** nibbles on **${nameB}**'s ear, sending shivers down her spine.`,
            l4: `➡️ They move in a mirror-like dance, feeling every breath and heartbeat.`,
            l5: `➡️ **${nameA}** whispers sweet, intimate secrets into **${nameB}**'s ear.`,
            // Trans
            t1: `➡️ Their auras merge, blending their energies into a single, vibrant entity.`,
            t2: `➡️ Glitter friction generates a static charge that defies the laws of physics.`,
            t3: `➡️ Their forms begin to shift and blur, transcending binary limitations.`,
            t4: `➡️ A glitch in the simulation occurs as their vibrations sync perfectly.`,
            t5: `➡️ They merge on a cosmic level, existing beyond the reach of standard labels.`
        };
        return descs[actionId] || `➡️ They engage in a mysterious, intimate action.`;
    },

    getEnding(type: string, cum: boolean, nameA: string, nameB: string): string {
        const endings: any = {
            straight: cum 
                ? `💦 **FINISH!** **${nameA}** releases everything into **${nameB}**. The national birth rate just ticked up! 🇺🇸🇮🇱 Baby boom inbound!` 
                : `🛑 **DENIED.** **${nameA}** pulls back at the last second. Efficiency over pleasure. The census remains unchanged.`,
            gay: cum 
                ? `💦 **FINISH!** A massive surge of testosterone explodes as **${nameA}** and **${nameB}** reach the peak of manly vigor. Gains achieved! 💪` 
                : `🛑 **DENIED.** They decide to save their energy for the gym. The muscles stay pumped, but the sheets stay dry. Bro code intact.`,
            lesbian: cum 
                ? `💦 **FINISH!** **${nameA}** and **${nameB}** collapse in a heap of shared bliss and rainbow energy. A symphony of pleasure concluded! 🌈` 
                : `🛑 **DENIED.** They decide that the journey was more important than the destination. A quiet, intimate rest followed.`,
            trans: cum 
                ? `💦 **FINISH!** A cosmic explosion of gender-fluid glory resets the simulation! **${nameA}** and **${nameB}** have achieved total ascension. 🏳️‍⚧️🌌` 
                : `🛑 **DENIED.** The universe remains stable. The energy is held back, preserved for the next cosmic event.`
        };
        return endings[type] || `Intimacy complete.`;
    }
};
