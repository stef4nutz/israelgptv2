import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import User from '../database/models/User';

export default {
    data: new SlashCommandBuilder()
        .setName('recruit')
        .setDescription('Recruit a citizen into the national military.')
        .addUserOption(option => option.setName('user').setDescription('The citizen to recruit').setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const executorData = await User.findOne({ userId: interaction.user.id });
        if (!executorData || (!executorData.isPresident && !executorData.isVicePresident && !executorData.isPrimeMinister)) {
            return interaction.reply({ content: '❌ **Access Denied.** Only the President, Vice President, or Prime Minister can recruit soldiers.', flags: [MessageFlags.Ephemeral] });
        }

        const nation = executorData.presidentOf !== 'None' ? executorData.presidentOf : 
                       executorData.vicePresidentOf !== 'None' ? executorData.vicePresidentOf : 
                       executorData.primeMinisterOf;
        
        if (!nation || nation === 'None') {
            return interaction.reply({ content: '❌ **Error.** Your leadership nation could not be determined. Please contact an admin.', flags: [MessageFlags.Ephemeral] });
        }
        const targetUser = interaction.options.getUser('user', true);
        const targetData = await User.findOne({ userId: targetUser.id });

        if (!targetData || targetData.nationality !== nation) {
            return interaction.reply({ content: `❌ **${targetUser.username}** must be a citizen of **${nation}** to be recruited into its military.`, flags: [MessageFlags.Ephemeral] });
        }

        if (targetData.isMilitary) {
            return interaction.reply({ content: `❌ **${targetUser.username}** is already serving in the military.`, flags: [MessageFlags.Ephemeral] });
        }

        const branch = nation === 'Israelian' ? 'IDF' : 'U.S. Armed Forces';
        targetData.isMilitary = true;
        targetData.militaryBranch = branch;
        await targetData.save();

        const emoji = nation === 'Israelian' ? '🇮🇱' : '🇺🇸';
        await interaction.reply(`${emoji} **Recruitment Successful!** ${targetUser.username} has been drafted into the **${branch}**! 🫡`);
    },

    async messageExecute(message: Message, args: string[]) {
        const executorData = await User.findOne({ userId: message.author.id });
        if (!executorData || (!executorData.isPresident && !executorData.isVicePresident && !executorData.isPrimeMinister)) {
            return message.reply('❌ **Access Denied.** Only the President, Vice President, or Prime Minister can recruit soldiers.');
        }

        const nation = executorData.presidentOf !== 'None' ? executorData.presidentOf : 
                       executorData.vicePresidentOf !== 'None' ? executorData.vicePresidentOf : 
                       executorData.primeMinisterOf;

        if (!nation || nation === 'None') {
            return message.reply('❌ **Error.** Your leadership nation could not be determined.');
        }
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply('❌ Please tag a citizen to recruit: `$recruit <@user>`');

        const targetData = await User.findOne({ userId: targetUser.id });
        if (!targetData || targetData.nationality !== nation) {
            return message.reply(`❌ **${targetUser.username}** must be a citizen of **${nation}**.`);
        }

        if (targetData.isMilitary) {
            return message.reply(`❌ **${targetUser.username}** is already in the military.`);
        }

        const branch = nation === 'Israelian' ? 'IDF' : 'U.S. Armed Forces';
        targetData.isMilitary = true;
        targetData.militaryBranch = branch;
        await targetData.save();

        const emoji = nation === 'Israelian' ? '🇮🇱' : '🇺🇸';
        await message.reply(`${emoji} **Recruitment Successful!** ${targetUser.username} has been drafted into the **${branch}**! 🫡`);
    }
};
