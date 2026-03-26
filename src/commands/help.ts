import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { ExtendedClient } from '../index';

const createHelpEmbeds = (client: ExtendedClient) => {
    const commands = Array.from(client.commands.values());
    commands.sort((a, b) => a.data.name.localeCompare(b.data.name));

    const embeds: EmbedBuilder[] = [];
    const CHUNK_SIZE = 24; // Keep it slightly under 25 to be safe

    for (let i = 0; i < commands.length; i += CHUNK_SIZE) {
        const chunk = commands.slice(i, i + CHUNK_SIZE);
        const embed = new EmbedBuilder()
            .setTitle(i === 0 ? '🤖 IsraelGPT Help' : '🤖 IsraelGPT Help (cont.)')
            .setDescription(i === 0 ? 'Here is a list of all available commands. You can use them with `/` or `$`.' : 'More commands:')
            .setColor('#0038b8')
            .setTimestamp();

        if (i === 0) {
            embed.setThumbnail(client.user?.displayAvatarURL() || null);
        }

        for (const command of chunk) {
            embed.addFields({
                name: `\`/${command.data.name}\` or \`$${command.data.name}\``,
                value: command.data.description || 'No description provided.',
                inline: true
            });
        }
        embeds.push(embed);
    }

    return embeds;
};

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands and their descriptions'),
    
    // Slash command execution
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ExtendedClient;
        const embeds = createHelpEmbeds(client);
        await interaction.reply({ embeds });
    },

    // Prefix command execution ($help)
    async messageExecute(message: Message) {
        const client = message.client as ExtendedClient;
        const embeds = createHelpEmbeds(client);
        await message.reply({ embeds });
    }
};
