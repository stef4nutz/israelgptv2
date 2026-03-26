import fs from 'fs';
import path from 'path';

async function main() {
    const commandsPath = path.join(__dirname, 'src/commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts'));

    console.log(`Checking ${commandFiles.length} command files...`);

    let loaded = 0;
    let missing = 0;
    let errorCount = 0;

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath).default || require(filePath);
            
            if ('data' in command && 'execute' in command) {
                loaded++;
                if (!('messageExecute' in command)) {
                    console.log(`[INFO] ${file} is slash-only (no messageExecute)`);
                }
            } else {
                missing++;
                console.log(`[WARNING] ${file} is missing data/execute`);
            }
        } catch (err) {
            errorCount++;
            console.log(`[ERROR] ${file}: ${err.message}`);
        }
    }

    console.log(`\nSummary:\nLoaded: ${loaded}\nMissing: ${missing}\nErrors: ${errorCount}`);
}

main().catch(console.error);
