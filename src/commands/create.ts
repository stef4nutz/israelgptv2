import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Interaction,
    ButtonInteraction,
    ModalSubmitInteraction,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction
} from 'discord.js';
import User from '../database/models/User';

const pendingApplications = new Map<string, any>();

export default {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('Start your Israelian Citizenship process!')
        .addStringOption(option =>
            option.setName('gender')
                .setDescription('Select your gender')
                .setRequired(true)
                .addChoices(
                    { name: 'Male', value: 'male' },
                    { name: 'Female', value: 'female' },
                    { name: 'Non-binary', value: 'non_binary' },
                    { name: 'Other', value: 'other' }
                )),

    async messageExecute(message: Message, args: string[]) {
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_start')
                    .setLabel('Start Citizenship Application')
                    .setStyle(ButtonStyle.Success)
            );

        await message.reply({
            content: '🌐 **Citizenship Registration**\n\nClick the button below to start your application process choice your holy state!',
            components: [row]
        });
    },

    async execute(interaction: Interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                return await this.handleSlashCommand(interaction as ChatInputCommandInteraction);
            } else if (interaction.isButton()) {
                return await this.handleButton(interaction as ButtonInteraction);
            } else if (interaction.isModalSubmit()) {
                return await this.handleModal(interaction as ModalSubmitInteraction);
            } else if (interaction.isStringSelectMenu()) {
                return await this.handleSelectMenu(interaction as StringSelectMenuInteraction);
            }
        } catch (error) {
            console.error('Error in create execute:', error);
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
        // Slash commands are now limited to simple redirection to the button flow because of the complex conditional quiz
        await interaction.reply({ 
            content: 'ℹ️ Please use the button flow by typing `$create` to start the registration process with nationality-specific questions.', 
            flags: [MessageFlags.Ephemeral] 
        });
    },

    async handleButton(interaction: ButtonInteraction) {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        if (customId === 'create_start') {
            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('create_nationality')
                        .setPlaceholder('Select your nationality')
                        .addOptions(
                            { label: 'Israelian', emoji: '🇮🇱', value: 'Israelian' },
                            { label: 'American', emoji: '🇺🇸', value: 'American' }
                        )
                );

            await interaction.reply({
                content: '🌍 **Step 1: Nationality**\nPlease select the citizenship you are applying for from the menu below.',
                components: [row],
                flags: [MessageFlags.Ephemeral]
            });
        } else if (customId.startsWith('create_test_')) {
            const parts = customId.split('_');
            const step = parts[2] as 'capital' | 'year' | 'sea';
            const answer = parts.slice(3).join('_');
            const userId = interaction.user.id;
            const app = pendingApplications.get(userId);

            if (!app) return interaction.reply({ content: 'Session expired. Please start over.', flags: [MessageFlags.Ephemeral] });

            // Correct Answer Verification
            const correctAnswers: any = {
                Israelian: { capital: 'jerusalem', year: '1948', sea: 'dead_sea' },
                American: { capital: 'washington_dc', year: '1776', sea: 'george_washington' } // Note: "sea" step for USA is actually "First President"
            };

            const expected = correctAnswers[app.nationality][step];

            if (answer !== expected) {
                pendingApplications.delete(userId);
                return interaction.update({ content: `❌ **Failed.** Incorrect Answer. Registration denied.`, components: [] });
            }

            if (step === 'capital') {
                app.capitalAnswer = answer;
                return this.sendTestQuestion(interaction, 'year');
            } else if (step === 'year') {
                app.yearAnswer = answer;
                return this.sendTestQuestion(interaction, 'sea');
            } else if (step === 'sea') {
                app.seaAnswer = answer;
                const result = await this.processRegistration(
                    userId, interaction.user.username, app.nationality, app.age, app.gender,
                    app.reason, app.capitalAnswer, app.yearAnswer, app.seaAnswer
                );
                pendingApplications.delete(userId);
                return interaction.update({ content: result.content, components: [] });
            }
        }
    },

    async handleModal(interaction: ModalSubmitInteraction) {
        const ageStr = interaction.fields.getTextInputValue('age');
        const age = parseInt(ageStr);
        const reason = interaction.fields.getTextInputValue('reason');

        if (isNaN(age) || age < 18 || age > 100) {
            return interaction.reply({ content: '❌ Age must be a number between 18 and 100!', flags: [MessageFlags.Ephemeral] });
        }

        const app = pendingApplications.get(interaction.user.id);
        if (!app) return interaction.reply({ content: 'Session expired.', ephemeral: true });

        app.age = age;
        app.reason = reason;

        // Next step: Gender Select Menu
        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('create_gender')
                    .setPlaceholder('Select your gender')
                    .addOptions(
                        { label: 'Male', value: 'male' },
                        { label: 'Female', value: 'female' },
                        { label: 'Non-binary', value: 'non_binary' },
                        { label: 'Other', value: 'other' }
                    )
            );

        await interaction.reply({
            content: `🎓 **Step 3: Personal Details**\nPlease select your gender from the menu below.`,
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });
    },

    async handleSelectMenu(interaction: StringSelectMenuInteraction) {
        const userId = interaction.user.id;
        
        if (interaction.customId === 'create_nationality') {
            const nationality = interaction.values[0];
            pendingApplications.set(userId, { nationality });

            const modal = new ModalBuilder()
                .setCustomId('create_modal')
                .setTitle(`${nationality} Citizenship Application`);

            const ageInput = new TextInputBuilder()
                .setCustomId('age')
                .setLabel('How old are you? (18-100)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const reasonInput = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Why do you want citizenship?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(ageInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
            );

            await interaction.showModal(modal);

        } else if (interaction.customId === 'create_gender') {
            const app = pendingApplications.get(userId);
            if (!app) return interaction.reply({ content: 'Session expired.', flags: [MessageFlags.Ephemeral] });

            app.gender = interaction.values[0];
            await this.sendTestQuestion(interaction, 'capital');
        }
    },

    async sendTestQuestion(interaction: Interaction, step: 'capital' | 'year' | 'sea') {
        const inter = interaction as any;
        const app = pendingApplications.get(inter.user.id);
        if (!app) return;

        let content = '';
        let options: { label: string, value: string }[] = [];
        const isIsrael = app.nationality === 'Israelian';

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
                new ButtonBuilder().setCustomId(`create_test_${step}_${opt.value}`).setLabel(opt.label).setStyle(ButtonStyle.Primary)
            ));

        const data = { content, components: [row], ephemeral: true };

        try {
            if (inter.isModalSubmit?.() || inter.isButton?.() || inter.isAnySelectMenu?.() || inter.isStringSelectMenu?.()) {
                if (inter.replied || inter.deferred) {
                    await inter.editReply(data);
                } else if (typeof inter.update === 'function') {
                    await inter.update(data);
                } else {
                    await inter.reply(data);
                }
            }
        } catch (err) {
            console.error('Failed to respond to interaction:', err);
        }
    },

    async processRegistration(userId: string, username: string, nationality: string, age: number, gender: string,
        reason: string, capital: string, year: string, sea: string) {

        // Validate answers based on nationality
        if (nationality === 'Israelian') {
            if (capital !== 'jerusalem' || year !== '1948' || sea !== 'dead_sea') {
                return { error: true, content: '❌ **Registration Denied.** Test failed.' };
            }
        } else if (nationality === 'American') {
            if (capital !== 'washington_dc' || year !== '1776' || sea !== 'george_washington') {
                return { error: true, content: '❌ **Registration Denied.** Test failed.' };
            }
        }

        try {
            if (await User.exists({ userId })) {
                return { error: true, content: 'You are already in our records!' };
            }

            await User.create({ userId, username, nationality, age, gender, reasonForImmigration: reason, citizenshipStatus: 'Approved' });

            const flag = nationality === 'Israelian' ? '🇮🇱' : '🇺🇸';
            return {
                error: false,
                content: `${flag} **Mazel Tov!** Your ${nationality} Citizenship is Approved!\n\n**Details:**\n- **Name:** ${username}\n- **Age:** ${age}\n- **Gender:** ${gender}\n- **Reason:** ${reason}`
            };
        } catch (error) {
            console.error(error);
            return { error: true, content: 'Error processing papers.' };
        }
    }
};
