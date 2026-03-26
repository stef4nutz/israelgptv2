import { SlashCommandBuilder, ChatInputCommandInteraction, Message, PermissionFlagsBits, MessageFlags } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { ExtendedClient } from '../index';
import commandHandler from '../handlers/commandHandler';

export default {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a specific command or all commands.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload (or "all")')
                .setRequired(true)),

    async execute(interaction: any) {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.user.id !== '413326085065801729') {
            return interaction.reply({ content: 'Get fucking out, goyslop!', flags: [MessageFlags.Ephemeral] });
        }

        const client = interaction.client as ExtendedClient;
        const commandName = interaction.options.getString('command')!.toLowerCase();

        const result = this.reloadLogic(client, commandName);
        await interaction.reply({ content: result, flags: [MessageFlags.Ephemeral] });
    },

    async messageExecute(message: Message, args: string[]) {
        if (message.author.id !== '413326085065801729') {
            return message.reply('❌ You do not have permission to use this command.');
        }

        const client = message.client as ExtendedClient;
        const commandName = args[0]?.toLowerCase() || 'all';

        const result = this.reloadLogic(client, commandName);
        await message.reply(result);
    },

    reloadLogic(client: ExtendedClient, commandName: string): string {
        const commandsPath = path.join(__dirname, '../commands');

        if (commandName === 'all') {
            // Reload all commands
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                delete require.cache[require.resolve(filePath)];
            }

            client.commands.clear();
            commandHandler(client);

            return '✅ Successfully reloaded all commands!';
        }

        // Reload a specific command
        const command = client.commands.get(commandName);
        if (!command) {
            return `❌ The command \`${commandName}\` does not exist!`;
        }

        // Find the file name for the command
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
        const file = commandFiles.find(f => {
            const filePath = path.join(commandsPath, f);
            try {
                const cmd = require(filePath).default || require(filePath);
                return (cmd.data?.name || cmd.name) === commandName;
            } catch {
                return false;
            }
        });

        if (!file) {
            return `❌ Could not find file for command \`${commandName}\`!`;
        }

        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)];
        client.commands.delete(commandName);

        try {
            const newCommand = require(filePath).default || require(filePath);
            client.commands.set(newCommand.data.name, newCommand);
            return `✅ Command \`${commandName}\` was reloaded!`;
        } catch (error) {
            console.error(error);
            return `❌ There was an error while reloading a command \`${commandName}\`:\n\`${(error as Error).message}\``;
        }
    }
};
