import fs from 'fs';
import path from 'path';
import { Client } from 'discord.js';

export default (client: Client) => {
    const eventsPath = path.join(__dirname, '../events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath).default || require(filePath);
        
        if (event.once) {
            console.log(`[DEBUG] Registering event: ${event.name} (once) from ${file}`);
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            console.log(`[DEBUG] Registering event: ${event.name} (on) from ${file}`);
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
    console.log(`Successfully loaded ${eventFiles.length} events.`);
};
