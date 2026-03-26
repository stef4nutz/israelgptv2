import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from 'discord.js';
import BankCard from '../database/models/BankCard';
import User from '../database/models/User';
import NationalBank from '../database/models/NationalBank';

const israeliJobs = [
    { name: 'Guarding the Western Wall', min: 50, max: 120, weight: 30 },
    { name: 'Harvesting oranges in the Negev', min: 40, max: 90, weight: 25 },
    { name: 'Developing a new cybersecurity tool', min: 150, max: 350, weight: 15 },
    { name: 'Selling hummus to tourists', min: 30, max: 70, weight: 20 },
    { name: '🤑 MOSSAD Secret Mission', min: 3000, max: 5000, weight: 8 },
    { name: '🤑 Made fun of Americans and got their tax-paid in donation', min: 10000, max: 25000, weight: 5 },
    { name: '🤑 Got paid by Donald Trump to keep a little secret about something on a Island!', min: 50000, max: 1000000, weight: 4 },
    { name: '🤑 Eliminated a business after they spoke bad about Israel', min: 50000, max: 500000, weight: 2 },
    { name: '🤑 Benjamin Netanyahu saw his "performance" in the society and give him a good amount of money', min: 5000000, max: 500000000, weight: 1 },
];

const americanJobs = [
    { name: '🍔 McDonald\'s Cashier', min: 10, max: 20, weight: 50 },
    { name: '🍗 KFC Cook', min: 10, max: 20, weight: 50 },
    { name: '☕ Starbucks Barista', min: 12, max: 25, weight: 50 },
    { name: '🔫 Working at a Local Gun Shop', min: 40, max: 80, weight: 30 },
    { name: '📦 Amazon Warehouse Associate', min: 35, max: 70, weight: 30 },
    { name: '🗽 Tour Guide at the Statue of Liberty', min: 50, max: 120, weight: 25 },
    { name: '💻 Silicon Valley Software Intern', min: 150, max: 400, weight: 20 },
    { name: '🚀 NASA Flight Controller', min: 500, max: 1200, weight: 15 },
    { name: '🤑 Wall Street High-Frequency Trader', min: 5000, max: 15000, weight: 10 },
    { name: '🤑 Federal Reserve Printing Assistant', min: 20000, max: 100000, weight: 5 },
    { name: '🤑 Secret Service Protective Detail (Trump)', min: 100000, max: 500000, weight: 3 },
    { name: '🤑 Sold a tech startup to Meta for billions', min: 10000000, max: 1000000000, weight: 1 },
];

export default {
    data: new SlashCommandBuilder()
        .setName('job')
        .setDescription('Work to earn some money for your card!'),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const card = await BankCard.findOne({ userId: interaction.user.id });
        if (!card) {
            return interaction.editReply('❌ You do not have a bank card yet! Use `/registercard` to get one.');
        }

        const user = await User.findOne({ userId: interaction.user.id });
        // Run the job sequence
        await this.handleJobProcess(interaction, interaction.user.id, card, user?.nationality || 'Israelian');
    },

    async messageExecute(message: Message, args: string[]) {
        const card = await BankCard.findOne({ userId: message.author.id });
        if (!card) {
            return message.reply('❌ You do not have a bank card yet! Type `$registercard` to get one.');
        }

        const user = await User.findOne({ userId: message.author.id });
        await this.handleJobProcess(message, message.author.id, card, user?.nationality || 'Israelian');
    },

    async handleJobProcess(context: any, userId: string, card: any, nationality: string) {
        const isInteraction = !!context.editReply;
        const isAmerican = (nationality || '').toLowerCase() === 'american';

        const currency = isAmerican ? '$' : '₪';
        const jobPool = isAmerican ? americanJobs : israeliJobs;

        let initialContent = `<@${userId}> currently doing the job...`;
        let msg: any;

        if (isInteraction) {
            msg = await context.editReply(initialContent);
        } else {
            msg = await context.reply(initialContent);
        }

        // Simulating loading
        const delays = [1500, 1500];
        const statusUpdates = [
            `<@${userId}> currently doing the job... Still doing the job....`,
            `<@${userId}> currently doing the job... Still doing the job.... Almost finished!`
        ];

        for (let i = 0; i < statusUpdates.length; i++) {
            await new Promise(resolve => setTimeout(resolve, delays[i]));
            if (isInteraction) {
                await context.editReply(statusUpdates[i]);
            } else {
                await msg.edit(statusUpdates[i]);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Select a job
        const totalWeight = jobPool.reduce((sum, job) => sum + job.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedJob = jobPool[0];

        for (const job of jobPool) {
            if (random < job.weight) {
                selectedJob = job;
                break;
            }
            random -= job.weight;
        }

        const grossAmount = Math.floor(Math.random() * (selectedJob.max - selectedJob.min + 1)) + selectedJob.min;

        let finalAmount = grossAmount;
        let taxDuction = 0;
        let taxMsg = "";

        if (isAmerican) {
            const aidTaxRate = 0.40;
            const federalTaxRate = 0.10;
            
            const aidTaxAmount = Math.floor(grossAmount * aidTaxRate);
            const federalTaxAmount = Math.floor(grossAmount * federalTaxRate);
            
            taxDuction = aidTaxAmount + federalTaxAmount;
            finalAmount = grossAmount - taxDuction;
            
            taxMsg = `\n> **Gross Pay:** $${grossAmount.toLocaleString()}\n> **US Aid to Israel (40%):** -$${aidTaxAmount.toLocaleString()}\n> **Federal Tax (10%):** -$${federalTaxAmount.toLocaleString()}\n> *Your paycheck got deducted for tax and most of it was sent to Israel!* 🇮🇱`;

            // Accumulate US Aid in Israelian National Treasury
            try {
                let israelBank = await NationalBank.findOne({ nation: 'Israelian' });
                if (!israelBank) israelBank = await NationalBank.create({ nation: 'Israelian', balance: 0, currency: '₪' });
                israelBank.balance += aidTaxAmount;
                await israelBank.save();

                // Accumulate Federal Tax in American National Treasury
                let americanBank = await NationalBank.findOne({ nation: 'American' });
                if (!americanBank) americanBank = await NationalBank.create({ nation: 'American', balance: 0, currency: '$' });
                americanBank.balance += federalTaxAmount;
                await americanBank.save();
            } catch (err) {
                console.error('Error updating national funds:', err);
            }
        } else {
            const israelTaxRate = 0.10; // 10% tax for Israelis
            taxDuction = Math.floor(grossAmount * israelTaxRate);
            finalAmount = grossAmount - taxDuction;

            taxMsg = `\n> **Gross Pay:** ₪${grossAmount.toLocaleString()}\n> **Israeli National Tax (10%):** -₪${taxDuction.toLocaleString()}\n> *Since you are Israelian, you pay less tax than the Americans!* 🇮🇱`;

            // Accumulate in Israelian National Treasury
            try {
                let israelBank = await NationalBank.findOne({ nation: 'Israelian' });
                if (!israelBank) israelBank = await NationalBank.create({ nation: 'Israelian', balance: 0, currency: '₪' });
                israelBank.balance += taxDuction;
                await israelBank.save();
            } catch (err) {
                console.error('Error updating Israelian Treasury:', err);
            }
        }

        // Update balance
        card.balance += finalAmount;
        await card.save();

        const finalContent = `<@${userId}> did the **${selectedJob.name}**! They earned **${currency}${finalAmount.toLocaleString()}** net.${taxMsg}`;

        if (isInteraction) {
            await context.editReply(finalContent);
        } else {
            await msg.edit(finalContent);
        }
    }
};
