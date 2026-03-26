import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    Message, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import User, { IUser } from '../database/models/User';
import PoliticalParty from '../database/models/PoliticalParty';
import NationalBank from '../database/models/NationalBank';

export default {
    data: new SlashCommandBuilder()
        .setName('party')
        .setDescription('Manage your political party or join one!')
        .addSubcommand(sub => sub.setName('info').setDescription('Show your party information'))
        .addSubcommand(sub => 
            sub.setName('create')
               .setDescription('Create a new political party')
               .addStringOption(opt => opt.setName('name').setDescription('The name of your party').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('settings')
               .setDescription('Update party settings')
               .addStringOption(opt => 
                   opt.setName('type')
                      .setDescription('Setting to change')
                      .setRequired(true)
                      .addChoices(
                          { name: 'Name', value: 'name' },
                          { name: 'Motto', value: 'motto' },
                          { name: 'Emoji', value: 'emoji' }
                      )
               )
               .addStringOption(opt => opt.setName('value').setDescription('The new value').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('recruit')
               .setDescription('Recruit a member to your party')
               .addUserOption(opt => opt.setName('target').setDescription('The user to recruit').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('leave').setDescription('Leave your current party'))
        .addSubcommand(sub => sub.setName('overthrow').setDescription('Attempt a coup to overthrow the president')),

    async execute(interaction: ChatInputCommandInteraction) {
        // Since the user focused on prefix commands ($), I'll implement logic in a shared handler
        return this.handlePartyCommand(interaction);
    },

    async messageExecute(message: Message, args: string[]) {
        return this.handlePartyCommand(message, args);
    },

    async handlePartyCommand(context: any, args: string[] = []) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        const authorId = isInteraction ? context.user.id : context.author.id;
        const subCommand = isInteraction ? context.options.getSubcommand(false) : args[0]?.toLowerCase();

        const userData = await User.findOne({ userId: authorId }).populate('partyId') as any;
        
        if (!subCommand || subCommand === 'info') {
            return this.showInfo(context, authorId, userData);
        }

        switch (subCommand) {
            case 'create':
                return this.createParty(context, authorId, userData, args.slice(1));
            case 'settings':
                return this.updateSettings(context, authorId, userData, args.slice(1));
            case 'recruit':
                return this.recruitMember(context, authorId, userData, args.slice(1));
            case 'leave':
                return this.leaveParty(context, authorId, userData);
            case 'overthrow':
            case 'coup':
                return this.initiateCoup(context, authorId, userData);
            default:
                const helpMsg = '❌ **Unknown Subcommand.** Available: `info`, `create`, `settings`, `recruit`, `leave`, `overthrow`.';
                return isInteraction ? context.reply({ content: helpMsg, flags: [MessageFlags.Ephemeral] }) : context.reply(helpMsg);
        }
    },

    async showInfo(context: any, authorId: string, userData: any) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        
        if (!userData?.partyId) {
            const msg = '❌ You are not in a political party. Use `$party create <name>` to start one!';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const party = userData.partyId;
        const leader = await User.findOne({ userId: party.leaderId });

        const embed = new EmbedBuilder()
            .setTitle(`${party.emoji} Party: ${party.name}`)
            .setDescription(`*"${party.motto}"*`)
            .addFields(
                { name: 'Leader', value: leader?.username || 'Unknown', inline: true },
                { name: 'Nationality', value: party.nationality, inline: true },
                { name: 'Members', value: `${party.memberIds.length}/10`, inline: true }
            )
            .setColor(party.nationality === 'Israelian' ? 0x005EB8 : 0xBF0A30)
            .setTimestamp();

        return isInteraction ? context.reply({ embeds: [embed] }) : context.reply({ embeds: [embed] });
    },

    async createParty(context: any, authorId: string, userData: any, args: string[]) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        
        if (!userData || userData.citizenshipStatus !== 'Approved') {
            const msg = '❌ Only approved citizens can create a political party!';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        if (userData.partyId) {
            const msg = '❌ You are already in a party! Leave your current one first.';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const partyName = isInteraction ? context.options.getString('name') : args.join(' ');
        if (!partyName || partyName.length < 3) {
            const msg = '❌ Please provide a party name (min 3 characters). Example: `$party create Justice Party`';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        try {
            const newParty = await PoliticalParty.create({
                name: partyName,
                nationality: userData.nationality,
                leaderId: authorId,
                memberIds: [authorId]
            });

            userData.partyId = newParty._id;
            await userData.save();

            return context.reply(`✅ **Party Established!** Welcome, Leader of the **${partyName}**! Use \`$party settings\` to customize your motto and emoji.`);
        } catch (err: any) {
            if (err.code === 11000) {
                return context.reply('❌ A party with that name already exists!');
            }
            console.error(err);
            return context.reply('❌ Error creating party.');
        }
    },

    async updateSettings(context: any, authorId: string, userData: any, args: string[]) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        
        if (!userData?.partyId) {
            const msg = '❌ You are not in a party.';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const party = userData.partyId;
        if (party.leaderId !== authorId) {
            const msg = '❌ Only the party leader can change settings!';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const type = isInteraction ? context.options.getString('type') : args[0]?.toLowerCase();
        const value = isInteraction ? context.options.getString('value') : args.slice(1).join(' ');

        if (!type || !['name', 'motto', 'emoji'].includes(type) || !value) {
            const msg = '❌ Usage: `$party settings <name|motto|emoji> <value>`';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        if (type === 'name') party.name = value;
        if (type === 'motto') party.motto = value;
        if (type === 'emoji') party.emoji = value;

        await party.save();
        return context.reply(`✅ Party ${type} updated to: **${value}**`);
    },

    async recruitMember(context: any, authorId: string, userData: any, args: string[]) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        
        if (!userData?.partyId) {
            const msg = '❌ You are not in a party.';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }
        const party = userData.partyId;
        
        if (party.leaderId !== authorId) {
            const msg = '❌ Only the leader can recruit members!';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }
        if (party.memberIds.length >= 10) {
            const msg = '❌ Your party is full (max 10 members).';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const target = isInteraction ? context.options.getUser('target') : context.mentions?.users.first();
        if (!target) {
            const msg = '❌ Please tag a user or select a target to recruit!';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }

        const targetData = await User.findOne({ userId: target.id }) as any;
        if (!targetData || targetData.citizenshipStatus !== 'Approved' || targetData.nationality !== party.nationality) {
            return context.reply(`❌ **${target.username}** must be an approved citizen of **${party.nationality}** to join your party!`);
        }

        if (targetData.partyId) return context.reply(`❌ **${target.username}** is already in a political party.`);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId(`party_join_${party._id}`).setLabel('Accept Invite').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('party_decline').setLabel('Decline').setStyle(ButtonStyle.Danger)
            );

        const inviteMsg = `✉️ **${target}**, you have been invited to join the **${party.name}** party! Do you accept?`;
        
        const sentMsg = await context.reply({ content: inviteMsg, components: [row] });

        const collector = sentMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (i: any) => {
            if (i.user.id !== target.id) {
                return i.reply({ content: '❌ This invitation is not for you!', flags: [MessageFlags.Ephemeral] });
            }

            if (i.customId === 'party_decline') {
                collector.stop();
                return i.update({ content: `❌ invitation declined by ${target.username}.`, components: [] });
            }

            // Join logic
            const latestParty = await PoliticalParty.findById(party._id);
            if (!latestParty || latestParty.memberIds.length >= 10) {
                return i.update({ content: '❌ Sorry, the party is now full or no longer exists.', components: [] });
            }

            latestParty.memberIds.push(target.id);
            await latestParty.save();

            targetData.partyId = latestParty._id;
            await targetData.save();

            collector.stop();
            return i.update({ content: `✅ **Success!** ${target} is now a member of **${latestParty.name}**!`, components: [] });
        });
    },

    async leaveParty(context: any, authorId: string, userData: any) {
        const isInteraction = context.isChatInputCommand?.() || !!context.applicationId;
        if (!userData?.partyId) {
            const msg = '❌ You are not in a party.';
            return isInteraction ? context.reply({ content: msg, flags: [MessageFlags.Ephemeral] }) : context.reply(msg);
        }
        
        const party = userData.partyId;
        
        if (party.leaderId === authorId) {
            // Disband party
            await User.updateMany({ partyId: party._id }, { $set: { partyId: undefined } });
            await PoliticalParty.findByIdAndDelete(party._id);
            return context.reply(`🚩 **The ${party.name} party has been disbanded.** All members have been removed.`);
        } else {
            // Just leave
            party.memberIds = party.memberIds.filter((id: string) => id !== authorId);
            await party.save();
            
            userData.partyId = undefined;
            await userData.save();
            
            return context.reply(`✅ You have left the **${party.name}** party.`);
        }
    },

    async initiateCoup(context: any, authorId: string, userData: any) {
        const isInteraction = !!context.editReply || !!context.applicationId;
        
        if (!userData?.partyId) return context.reply('❌ You are not in a party.');
        const party = userData.partyId;
        
        if (party.leaderId !== authorId) return context.reply('❌ Only the party leader can initiate a coup!');
        if (party.memberIds.length < 10) {
            return context.reply(`❌ **Inadequate Strength.** Your party needs **10 members** to attempt a coup! (${party.memberIds.length}/10)`);
        }

        const nation = party.nationality;
        const currentPresident = await User.findOne({ [`isPresident`]: true, [`presidentOf`]: nation });

        if (!currentPresident) return context.reply('❌ There is no president to overthrow.');

        await context.reply(`🧨 **ATTEMPTED COUP!** 🧨\n\nThe **${party.name}** party is marching on the capital to overthrow President **${currentPresident.username}**!\n\nCalculating outcome...`);

        setTimeout(async () => {
            // Coup Calculation: 30% base chance
            const success = Math.random() < 0.3;
            
            if (success) {
                // Remove old president
                currentPresident.isPresident = false;
                currentPresident.presidentOf = 'None';
                await currentPresident.save();

                // New president from party leader
                userData.isPresident = true;
                userData.presidentOf = nation;
                await userData.save();

                const flag = nation === 'Israelian' ? '🇮🇱' : '🇺🇸';
                return context.channel.send(`🎉 **THE COUP WAS SUCCESSFUL!** ${flag}\n\nPresident **${currentPresident.username}** has been overthrown! **${userData.username}** is the new President of **${nation}**!`);
            } else {
                return context.channel.send(`💀 **THE COUP FAILED.**\n\nPresident **${currentPresident.username}** has suppressed the rebellion. The leaders of **${party.name}** have been temporarily blacklisted from power!`);
            }
        }, 5000);
    }
};
