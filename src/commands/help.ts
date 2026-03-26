import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    EmbedBuilder, 
    Message, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    StringSelectMenuInteraction,
    MessageFlags
} from 'discord.js';
import { ExtendedClient } from '../index';

const commandCategories: { [key: string]: string } = {
    'bank': 'Economy',
    'shop': 'Economy',
    'inventory': 'Economy',
    'buy': 'Economy',
    'balance': 'Economy',
    'card': 'Economy',
    'registercard': 'Economy',
    'shopadmin': 'Economy',
    'shopid': 'Economy',
    'jewway': 'Economy',
    'job': 'Jobs',
    'create': 'Identity',
    'id': 'Identity',
    'switchcountry': 'Identity',
    'president': 'Government',
    'presidency': 'Government',
    'soldiers': 'Government',
    'country': 'Government',
    'party': 'Politics',
    'marry': 'Social',
    'divorce': 'Social',
    'adopt': 'Social',
    'tree': 'Social',
    'esex': 'Social',
    'war': 'Military',
    'recruit': 'Military',
    'ping': 'Utility',
    'help': 'Utility',
    'ask': 'Utility',
    'eval': 'Utility',
    'reload': 'Utility'
};

const categoryEmojis: { [key: string]: string } = {
    'Economy': '💰',
    'Jobs': '💼',
    'Identity': '🛂',
    'Government': '🏛️',
    'Politics': '🚩',
    'Social': '💍',
    'Military': '⚔️',
    'Utility': '⚙️'
};

const createHomeEmbed = (client: ExtendedClient) => {
    return new EmbedBuilder()
        .setTitle('🤖 IsraelGPT Help Center')
        .setDescription('Welcome to the help center! Please use the dropdown menu below to explore commands by category.\n\n' +
            '🌐 **Prefix:** `$`\n' +
            '⌨️ **Slash Commands:** `/`')
        .setColor('#0038b8')
        .setThumbnail(client.user?.displayAvatarURL() || null)
        .addFields(
            { name: '💰 Economy', value: 'Bank, Shop, Inventory, etc.', inline: true },
            { name: '🏛️ Government', value: 'Presidential & National updates', inline: true },
            { name: '⚔️ Military', value: 'War and Recruitment', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Select a category below to see specific commands.' });
};

const createCategoryEmbed = (client: ExtendedClient, category: string) => {
    const commands = Array.from(client.commands.values())
        .filter(cmd => commandCategories[cmd.data.name] === category)
        .sort((a, b) => a.data.name.localeCompare(b.data.name));

    const emoji = categoryEmojis[category] || '❔';
    const embed = new EmbedBuilder()
        .setTitle(`${emoji} ${category} Commands`)
        .setDescription(`Here are the commands available in the **${category}** category:`)
        .setColor('#0038b8')
        .setTimestamp();

    if (commands.length === 0) {
        embed.setDescription('No commands found in this category yet.');
    } else {
        for (const command of commands) {
            embed.addFields({
                name: `\`/${command.data.name}\` or \`$${command.data.name}\``,
                value: command.data.description || 'No description provided.',
                inline: false
            });
        }
    }

    return embed;
};

const createSelectMenu = (selectedCategory: string = 'home') => {
    const select = new StringSelectMenuBuilder()
        .setCustomId('help_categorySelect')
        .setPlaceholder('Choose a command category...')
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Home')
                .setEmoji('🏠')
                .setValue('home')
                .setDefault(selectedCategory === 'home'),
            ...Object.keys(categoryEmojis).map(cat => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(cat)
                    .setEmoji(categoryEmojis[cat])
                    .setValue(cat.toLowerCase())
                    .setDefault(selectedCategory.toLowerCase() === cat.toLowerCase())
            )
        );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
};

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands and their descriptions'),
    
    async execute(interaction: ChatInputCommandInteraction | StringSelectMenuInteraction) {
        const client = interaction.client as ExtendedClient;

        try {
            if (interaction.isChatInputCommand()) {
                const embed = createHomeEmbed(client);
                const row = createSelectMenu();
                await interaction.reply({ embeds: [embed], components: [row] });
            } else if (interaction.isStringSelectMenu()) {
                const categoryValue = interaction.values[0];
                
                if (categoryValue === 'home') {
                    const embed = createHomeEmbed(client);
                    const row = createSelectMenu('home');
                    await interaction.update({ embeds: [embed], components: [row] });
                } else {
                    // Match the display name from the value (which is lowercase)
                    const categoryName = Object.keys(categoryEmojis).find(cat => cat.toLowerCase() === categoryValue) || 'Utility';
                    const embed = createCategoryEmbed(client, categoryName);
                    const row = createSelectMenu(categoryName);
                    await interaction.update({ embeds: [embed], components: [row] });
                }
            }
        } catch (error) {
            console.error('[ERROR] Error in help command (execute):', error);
            if (interaction.isRepliable()) {
                const msg = '❌ An error occurred while opening the help menu.';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: msg, flags: [MessageFlags.Ephemeral] });
                } else {
                    await interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
                }
            }
        }
    },

    async messageExecute(message: Message) {
        const client = message.client as ExtendedClient;
        try {
            const embed = createHomeEmbed(client);
            const row = createSelectMenu();
            await message.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('[ERROR] Error in help command (messageExecute):', error);
            await message.reply('❌ An error occurred while opening the help menu.');
        }
    }
};
