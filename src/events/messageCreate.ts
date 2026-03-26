import { Events, Message } from 'discord.js';
import { ExtendedClient } from '../index';

const PREFIX = '$';

export default {
    name: Events.MessageCreate,
    async execute(message: Message) {
        // Ignore messages from bots or without the prefix
        if (message.author.bot || !message.content.startsWith(PREFIX)) return;

        const client = message.client as ExtendedClient;
        
        // Parse command and arguments
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = client.commands.get(commandName);

        if (!command) return;

        // Check if the command has a message-specific execution method
        if (typeof command.messageExecute === 'function') {
            try {
                await command.messageExecute(message, args);
            } catch (error) {
                console.error(`[ERROR] Prefix command "${commandName}" failed:`, error);
                
                // Only reply if it was a fatal error during initial execution
                await message.reply('❌ There was an error while executing this command!').catch(() => {});
            }
        } else {
            // Fallback or notification that it's slash-only
            await message.reply(`The command \`${commandName}\` is only available via slash commands. Try typing \`/${commandName}\`.`).catch(() => {});
        }
    },
};
