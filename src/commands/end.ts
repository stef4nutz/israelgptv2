import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import Election from '../database/models/Election';
import User from '../database/models/User';

const ALLOWED_IDS = ['413326085065801729', '418938236048506880'];

export default {
    data: new SlashCommandBuilder()
        .setName('end')
        .setDescription('End the current presidential election and announce the winner (Admin only).'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!ALLOWED_IDS.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ **Access Denied.**', flags: [MessageFlags.Ephemeral] });
        }

        const result = await this.concludeElection();
        await interaction.reply(result.content);
    },

    async messageExecute(message: Message, args: string[]) {
        if (!ALLOWED_IDS.includes(message.author.id)) {
            return message.reply('❌ **Access Denied.**');
        }

        const result = await this.concludeElection();
        if (result.error) {
            await message.reply(result.content);
        } else {
            // Mention the winner if possible for better visibility
            await message.reply(result.content);
        }
    },

    async concludeElection() {
        try {
            const election = await Election.findOne({ isActive: true });

            if (!election) {
                return { error: true, content: '❌ There is no active election to end.' };
            }

            if (election.candidates.length === 0) {
                election.isActive = false;
                await election.save();
                return { error: true, content: '❌ The election had no candidates. It has been closed.' };
            }

            // Determine winner
            let winner = election.candidates[0];
            for (const candidate of election.candidates) {
                if (candidate.votes > winner.votes) {
                    winner = candidate;
                }
            }

            // Check for a tie
            const topCandidates = election.candidates.filter(c => c.votes === winner.votes);
            if (topCandidates.length > 1) {
                return { 
                    error: true, 
                    content: `🤝 **Election Tie!** Several candidates have ${winner.votes} votes. Please cast more votes or break the tie manually before ending.\nCandidates: ${topCandidates.map(c => c.username).join(', ')}` 
                };
            }

            // Close election
            election.isActive = false;
            await election.save();

            // Clear previous president
            await User.updateMany({ isPresident: true }, { isPresident: false });

            // Set new president
            const newPresident = await User.findOneAndUpdate(
                { userId: winner.userId },
                { isPresident: true },
                { returnDocument: 'after' }
            );

            return { 
                error: false, 
                content: `🎊 **ELECTION CONCLUDED!** 🎊\n\nThe winner is **${winner.username}** with **${winner.votes}** votes!\nCongratulations, Mr. President! 🇮🇱` 
            };
        } catch (error) {
            console.error('Error concluding election:', error);
            return { error: true, content: '❌ An error occurred while ending the election.' };
        }
    }
};
