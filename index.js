require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { supabase, searchDatabase } = require('./supabase');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- LIVE CHANNEL CONFIGURATIONS ---
const GOOGLETASK_CHANNEL_ID = '1518236682950934619'; 
const UNANSWERED_CHANNEL_ID = '1518236790958325821';
const CHAT_CHANNEL_ID = '1518218058504736898';
const SUPPORT_LOGS_ID = '1518224380339949720';

client.once('ready', () => {
    console.log(`✅ TaskVault Premium Platform is online! Logged in as ${client.user.tag}`);
});

function generateStatsEmbed(username, logs, subText) {
    const calcInterval = (days) => {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const count = logs.filter(log => new Date(log.created_at).getTime() >= cutoff).length;
        return { count, earned: (count * 0.04).toFixed(2) };
    };

    const today = calcInterval(1);
    const day2 = calcInterval(2);
    const day4 = calcInterval(4);
    const week1 = calcInterval(7);
    const week2 = calcInterval(14);
    const week3 = calcInterval(21);
    const week4 = calcInterval(28);
    const month1 = calcInterval(30);
    const totalCount = logs.length;
    const totalEarned = (totalCount * 0.04).toFixed(2);

    return new EmbedBuilder()
        .setTitle(`📊 TaskVault Metrics Panel — ${username}`)
        .setColor('#00ffcc')
        .setDescription(`⏱️ **Time Status:** ${subText}`)
        .addFields(
            { name: '📅 Today', value: `Tasks: **${today.count}**\nEarned: **$${today.earned}**`, inline: true },
            { name: '📅 2 Days', value: `Tasks: **${day2.count}**\nEarned: **$${day2.earned}**`, inline: true },
            { name: '📅 4 Days', value: `Tasks: **${day4.count}**\nEarned: **$${day4.earned}**`, inline: true },
            { name: '📅 1 Week', value: `Tasks: **${week1.count}**\nEarned: **$${week1.earned}**`, inline: true },
            { name: '📅 2 Weeks', value: `Tasks: **${week2.count}**\nEarned: **$${week2.earned}**`, inline: true },
            { name: '📅 3 Weeks', value: `Tasks: **${week3.count}**\nEarned: **$${week3.earned}**`, inline: true },
            { name: '📅 4 Weeks', value: `Tasks: **${week4.count}**\nEarned: **$${week4.earned}**`, inline: true },
            { name: '📅 1 Month', value: `Tasks: **${month1.count}**\nEarned: **$${month1.earned}**`, inline: true },
            { name: '🏆 All Time Summary', value: `Total Completed Tasks: **${totalCount}**\nTotal Money Earned: **$${totalEarned}**`, inline: false }
        )
        .setFooter({ text: 'TaskVault Accounting Engine' });
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!grant')) {
        if (!message.member.permissions.has('Administrator')) return;
        const args = message.content.split(' ');
        const targetUser = message.mentions.users.first();
        const days = parseInt(args[2]);

        if (!targetUser || isNaN(days)) return message.reply('❌ Format error! Use: !grant @user <days>');

        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        
        const { error } = await supabase.from('user_subscriptions').upsert({ user_id: targetUser.id, expires_at: expiresAt });
        if (error) {
            console.error(error);
            return message.reply(`❌ Supabase Database Error: ${error.message}\nMake sure RLS is disabled!`);
        }

        return message.reply(`✅ Premium configuration loaded. Granted **${days} days** of access to <@${targetUser.id}>.`);
    }

    if (message.content.startsWith('!viewscore')) {
        if (!message.member.permissions.has('Administrator')) return;
        const targetUser = message.mentions.users.first() || message.author;

        const { data: sub } = await supabase.from('user_subscriptions').select('expires_at').eq('user_id', targetUser.id).maybeSingle();
        const subText = sub ? `Active (Expires: ${new Date(sub.expires_at).toLocaleDateString()})` : 'No Subscription Found';

        const { data: logs } = await supabase.from('task_logs').select('created_at').eq('user_id', targetUser.id);
        const statsEmbed = generateStatsEmbed(targetUser.username, logs || [], subText);

        return message.reply({ embeds: [statsEmbed] });
    }

    if (message.content === '!viewall') {
        if (!message.member.permissions.has('Administrator')) return;
        
        const { data: logs } = await supabase.from('task_logs').select('user_id');
        if (!logs || logs.length === 0) return message.reply('❌ No active records found in production data logs.');

        const tracking = {};
        logs.forEach(item => tracking[item.user_id] = (tracking[item.user_id] || 0) + 1);

        let manifestOutput = '📊 **Global User Performance Summary:**\n\n';
        for (const [uid, totalTasks] of Object.entries(tracking)) {
            manifestOutput += `<@${uid}>: **${totalTasks}** tasks verified ($${(totalTasks * 0.04).toFixed(2)})\n`;
        }
        return message.reply({ content: manifestOutput.substring(0, 2000) });
    }

    if (message.content === '!postscore') {
        if (!message.member.permissions.has('Administrator')) return;
        
        const scoreEmbed = new EmbedBuilder()
            .setTitle('TaskVault — Personal Accounting Dashboard')
            .setDescription('Click the button below to review your live metrics history, rolling windows, and total system valuation payouts.')
            .setColor('#2b2d31');

        const interactionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('score_btn').setLabel('View My Score').setStyle(ButtonStyle.Success)
        );

        await message.channel.send({ embeds: [scoreEmbed], components: [interactionRow] });
        await message.delete().catch(() => {});
        return;
    }

    if (message.content === '!poststart') {
        const menuEmbed = new EmbedBuilder()
            .setTitle('TaskVault — Start Menu')
            .setDescription(`Welcome to TaskVault. Please select an option to begin:\n\n**1. Introduction** (Coming Soon)\n**2. Rules** (Coming Soon)\n**3. Subscription** (Coming Soon)\n**4. Help** (Discussion & Support)\n**5. Contact Support** (Get your access token)`)
            .setColor('#5865F2');

        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('intro_btn').setLabel('Introduction').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('rules_btn').setLabel('Rules').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('sub_btn').setLabel('Subscription').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('help_btn').setLabel('Help').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('support_btn').setLabel('Contact Support').setStyle(ButtonStyle.Danger)
        );

        await message.channel.send({ embeds: [menuEmbed], components: [buttonRow] });
        await message.delete().catch(() => {});
        return;
    }

    if (message.channel.id === GOOGLETASK_CHANNEL_ID) {
        const userQuery = message.content.trim();
        if (userQuery.length <= 3) return;

        const { data: sub, error: subError } = await supabase.from('user_subscriptions').select('expires_at').eq('user_id', message.author.id).maybeSingle();
        
        if (subError || !sub || new Date(sub.expires_at) < new Date()) {
            return message.reply('❌ **Access Denied.** You do not have an active premium membership plan. Use **Contact Support** to unlock.');
        }

        await message.channel.sendTyping();
        const answer = await searchDatabase(userQuery);

        if (answer) {
            await supabase.from('task_logs').insert([{ user_id: message.author.id, question: userQuery }]);

            const replyEmbed = new EmbedBuilder()
                .setColor('#00ffcc')
                .setTitle('🔍 Task Found')
                .setDescription(`**Question:** ${userQuery}\n\n**Verified Answer:** ${answer}`)
                .setFooter({ text: 'TaskVault Database' });
            await message.reply({ embeds: [replyEmbed] });
        } else {
            await message.reply({ content: '⏳ **This task is updating soon!** The tracking team has been alerted.' });
            
            const alertChannel = message.guild.channels.cache.get(UNANSWERED_CHANNEL_ID);
            if (alertChannel) {
                alertChannel.send(`❓ **Unresolved Query Alert**\nUser: <@${message.author.id}>\nQuestion text: \`${userQuery}\``);
            }
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'score_btn') {
        const { data: sub } = await supabase.from('user_subscriptions').select('expires_at').eq('user_id', interaction.user.id).maybeSingle();
        
        let subText = 'No Subscription Active';
        if (sub) {
            const timeDiff = new Date(sub.expires_at) - Date.now();
            if (timeDiff > 0) {
                const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                subText = `${daysRemaining} days remaining`;
            } else {
                subText = 'Subscription Expired';
            }
        }

        const { data: logs } = await supabase.from('task_logs').select('created_at').eq('user_id', interaction.user.id);
        const compositeEmbed = generateStatsEmbed(interaction.user.username, logs || [], subText);

        return await interaction.reply({ embeds: [compositeEmbed], ephemeral: true });
    }

    if (interaction.customId === 'help_btn') {
        await interaction.reply({ content: `Click here to join the discussion: <#${CHAT_CHANNEL_ID}>`, ephemeral: true });
    } 
    else if (interaction.customId === 'support_btn') {
        const token = Math.random().toString(36).substring(7).toUpperCase();
        const supportChannel = interaction.guild.channels.cache.get(SUPPORT_LOGS_ID);
        if (supportChannel) {
            supportChannel.send(`🔔 **New Support Request**\nUser: <@${interaction.user.id}>\nToken: **${token}**`);
        }
        await interaction.reply({ content: `Your Support Token is: **${token}**\n\nPlease copy this token. You will need to show this to the Admin for verification.`, ephemeral: true });
    } 
    else if (['intro_btn', 'rules_btn', 'sub_btn'].includes(interaction.customId)) {
        await interaction.reply({ content: 'This section is currently under construction. Please check back later!', ephemeral: true });
    }
});

const http = require('http');
http.createServer((req, res) => res.end('TaskVault is running!')).listen(process.env.PORT || 3000);

const { REST, Routes } = require('discord.js');
const { commands } = require('./discord.command.js'); 
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    } catch (error) {
        console.error(error);
    }
})();

client.login(process.env.DISCORD_TOKEN);

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err, origin) => {
    console.error('⚠️ Uncaught Exception:', err, 'origin:', origin);
});
