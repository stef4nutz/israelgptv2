import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { ExtendedClient } from '../index';

const createHelpEmbed = (client: ExtendedClient) => {
    const embed = new EmbedBuilder()
        .setTitle('🤖 IsraelGPT Help')
        .setDescription('Here is a list of all available commands. You can use them with `/` or `$`.')
        .setColor('#0038b8') // Israel flag blue
        .setThumbnail(client.user?.displayAvatarURL() || null)
        .setTimestamp();

    // Get unique commands (Collection might have aliases or duplicates if implemented later)
    const commands = Array.from(client.commands.values());
    
    // Sort commands alphabetically
    commands.sort((a, b) => a.data.name.localeCompare(b.data.name));

    for (const command of commands) {
        embed.addFields({
            name: `\`/${command.data.name}\` or \`$${command.data.name}\``,
            value: command.data.description || 'No description provided.',
            inline: true
        });
    }

    return embed;
};

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands and their descriptions'),
    
    // Slash command execution
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ExtendedClient;
        const embed = createHelpEmbed(client);
        await interaction.reply({ embeds: [embed] });
    },

    // Prefix command execution ($help)
    async messageExecute(message: Message) {
        const client = message.client as ExtendedClient;
        const embed = createHelpEmbed(client);
        await message.reply({ embeds: [embed] });
    }
};
