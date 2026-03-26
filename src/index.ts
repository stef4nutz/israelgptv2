import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { init as initDatabase } from './database/mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface ExtendedClient extends Client {
    commands: Collection<string, any>;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
}) as ExtendedClient;

client.commands = new Collection();

// Init Database
initDatabase();

// Load Handlers
const handlersPath = path.join(__dirname, 'handlers');
const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of handlerFiles) {
    const handler = require(path.join(handlersPath, file)).default || require(path.join(handlersPath, file));
    handler(client);
}

console.log('[DEBUG] Starting bot initialization...');
client.login(process.env.DISCORD_TOKEN);
