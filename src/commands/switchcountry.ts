import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Interaction,
    ButtonInteraction,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction
} from 'discord.js';
import User from '../database/models/User';

const pendingSwitches = new Map<string, any>();

export default {
    data: new SlashCommandBuilder()
        .setName('switchcountry')
        .setDescription('Switch your nationality between Israelian and American (Testing required!)'),

    async messageExecute(message: Message, args: string[]) {
        const user = await User.findOne({ userId: message.author.id });
        if (!user || user.citizenshipStatus !== 'Approved') {
            return message.reply('❌ You must be an approved citizen to switch countries! Use `$create` first.');
        }

        const targetNation = user.nationality === 'Israelian' ? 'American' : 'Israelian';
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`switchcountry_start_${targetNation}`)
                    .setLabel(`Switch to ${targetNation}`)
                    .setStyle(ButtonStyle.Primary)
            );

        await message.reply({
            content: `🌐 **Nationality Switch Request**\n\nYou are currently a citizen of **${user.nationality}**. Would you like to apply for **${targetNation}** citizenship? This requires passing a short test.`,
            components: [row]
        });
    },

    async execute(interaction: Interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                return await this.handleSlashCommand(interaction as ChatInputCommandInteraction);
            } else if (interaction.isButton()) {
                return await this.handleButton(interaction as ButtonInteraction);
            }
        } catch (error) {
            console.error('Error in switchcountry execute:', error);
            if (interaction.isRepliable()) {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: 'An internal error occurred.' }).catch(() => { });
                } else {
                    await interaction.reply({ content: 'An internal error occurred.', flags: [MessageFlags.Ephemeral] }).catch(() => { });
                }
            }
        }
    },

    async handleSlashCommand(interaction: ChatInputCommandInteraction) {
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user || user.citizenshipStatus !== 'Approved') {
            return interaction.reply({ content: '❌ You must be an approved citizen to switch countries! Use `/create` first.', flags: [MessageFlags.Ephemeral] });
        }

        const targetNation = user.nationality === 'Israelian' ? 'American' : 'Israelian';
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`switchcountry_start_${targetNation}`)
                    .setLabel(`Switch to ${targetNation}`)
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            content: `🌐 **Nationality Switch Request**\n\nYou are currently a citizen of **${user.nationality}**. Would you like to apply for **${targetNation}** citizenship? This requires passing a short test.`,
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });
    },

    async handleButton(interaction: ButtonInteraction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        if (customId.startsWith('switchcountry_start_')) {
            const targetNation = customId.split('_')[2];
            pendingSwitches.set(userId, { targetNation });
            return this.sendTestQuestion(interaction, 'capital');
        } else if (customId.startsWith('switchcountry_test_')) {
            const parts = customId.split('_');
            const step = parts[2] as 'capital' | 'year' | 'sea';
            const answer = parts.slice(3).join('_');
            const data = pendingSwitches.get(userId);

            if (!data) return interaction.reply({ content: 'Session expired. Please start over.', flags: [MessageFlags.Ephemeral] });

            // Correct Answer Verification
            const correctAnswers: any = {
                Israelian: { capital: 'jerusalem', year: '1948', sea: 'dead_sea' },
                American: { capital: 'washington_dc', year: '1776', sea: 'george_washington' }
            };

            const expected = correctAnswers[data.targetNation][step];

            if (answer !== expected) {
                pendingSwitches.delete(userId);
                return interaction.update({ content: `❌ **Failed.** Incorrect Answer. Citizenship switch denied.`, components: [] });
            }

            if (step === 'capital') {
                return this.sendTestQuestion(interaction, 'year');
            } else if (step === 'year') {
                return this.sendTestQuestion(interaction, 'sea');
            } else if (step === 'sea') {
                const result = await this.processSwitch(userId, data.targetNation);
                pendingSwitches.delete(userId);
                return interaction.update({ content: result.content, components: [] });
            }
        }
    },

    async sendTestQuestion(interaction: Interaction, step: 'capital' | 'year' | 'sea') {
        const inter = interaction as any;
        const data = pendingSwitches.get(inter.user.id);
        if (!data) return;

        let content = '';
        let options: { label: string, value: string }[] = [];
        const isIsrael = data.targetNation === 'Israelian';

        if (step === 'capital') {
            content = isIsrael ? '🇮🇱 **Israel Citizenship Test (1/3)**\n\nWhat is the capital of Israel?' : '🇺🇸 **USA Citizenship Test (1/3)**\n\nWhat is the capital of the United States?';
            options = isIsrael 
                ? [{ label: 'Tel Aviv', value: 'tel_aviv' }, { label: 'Jerusalem', value: 'jerusalem' }, { label: 'Haifa', value: 'haifa' }]
                : [{ label: 'New York', value: 'new_york' }, { label: 'Washington D.C.', value: 'washington_dc' }, { label: 'Los Angeles', value: 'los_angeles' }];
        } else if (step === 'year') {
            content = isIsrael ? '🇮🇱 **Israel Citizenship Test (2/3)**\n\nIn what year was the State of Israel established?' : '🇺🇸 **USA Citizenship Test (2/3)**\n\nIn what year did America gain independence?';
            options = isIsrael
                ? [{ label: '1945', value: '1945' }, { label: '1948', value: '1948' }, { label: '1950', value: '1950' }]
                : [{ label: '1776', value: '1776' }, { label: '1812', value: '1812' }, { label: '1920', value: '1920' }];
        } else if (step === 'sea') {
            content = isIsrael ? '🇮🇱 **Israel Citizenship Test (3/3)**\n\nWhich sea is at the lowest elevation on Earth?' : '🇺🇸 **USA Citizenship Test (3/3)**\n\nWho was the first President of the United States?';
            options = isIsrael
                ? [{ label: 'Dead Sea', value: 'dead_sea' }, { label: 'Red Sea', value: 'red_sea' }, { label: 'Mediterranean Sea', value: 'mediterranean' }]
                : [{ label: 'George Washington', value: 'george_washington' }, { label: 'Abraham Lincoln', value: 'abraham_lincoln' }, { label: 'Thomas Jefferson', value: 'thomas_jefferson' }];
        }

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(options.map(opt =>
                new ButtonBuilder().setCustomId(`switchcountry_test_${step}_${opt.value}`).setLabel(opt.label).setStyle(ButtonStyle.Primary)
            ));

        const responseData = { content, components: [row], flags: [MessageFlags.Ephemeral] };

        try {
            if (inter.replied || inter.deferred) {
                await inter.editReply(responseData);
            } else if (typeof inter.update === 'function') {
                await inter.update(responseData);
            } else {
                await inter.reply(responseData);
            }
        } catch (err) {
            console.error('Failed to respond to interaction:', err);
        }
    },

    async processSwitch(userId: string, newNationality: string) {
        try {
            const user = await User.findOne({ userId });
            if (!user) return { content: '❌ Record not found.' };

            const oldNation = user.nationality;
            user.nationality = newNationality;
            
            // Reset roles upon switching to avoid dual-nation leadership issues
            user.isPresident = false;
            user.presidentOf = 'None';
            user.isVicePresident = false;
            user.vicePresidentOf = 'None';
            user.isPrimeMinister = false;
            user.primeMinisterOf = 'None';

            await user.save();

            const flag = newNationality === 'Israelian' ? '🇮🇱' : '🇺🇸';
            return {
                content: `${flag} **Congratulations!** You have successfully switched your nationality from **${oldNation}** to **${newNationality}**!\n\n*Note: Your presidential roles (if any) have been reset.*`
            };
        } catch (error) {
            console.error(error);
            return { content: '❌ Error processing citizenship papers.' };
        }
    }
};
