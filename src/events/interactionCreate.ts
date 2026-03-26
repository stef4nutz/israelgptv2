import { Events, Interaction, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { ExtendedClient } from '../index';

export default {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction) {
        try {
            const client = interaction.client as ExtendedClient;
            let commandName: string | undefined;

            if (interaction.isChatInputCommand()) {
                commandName = interaction.commandName;
            } else if (interaction.isButton() || interaction.isModalSubmit() || 
                       interaction.isStringSelectMenu() || interaction.isAnySelectMenu?.()) {
                commandName = (interaction as any).customId?.split('_')[0];
            }

            console.log(`[DEBUG] Interaction received: type=${interaction.type}, customId=${(interaction as any).customId}, commandName=${commandName}`);

            if (!commandName) return;

            const command = client.commands.get(commandName);

            if (!command) {
                console.error(`No command matching ${commandName} was found.`);
                return;
            }

            await command.execute(interaction);
        } catch (error) {
            console.error('[ERROR] Error in interactionCreate event:', error);
            if (interaction.isRepliable()) {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'An internal error occurred while processing this interaction.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                } else {
                    await interaction.reply({ content: 'An internal error occurred while processing this interaction.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
                }
            }
        }
    },
};
