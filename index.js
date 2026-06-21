require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { searchDatabase } = require('./supabase');

// Initialize Discord Client with necessary permissions
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// When the bot boots up successfully
client.once('ready', () => {
    console.log(`✅ TaskVault is online! Logged in as ${client.user.tag}`);
});

// Listen for messages
client.on('messageCreate', async (message) => {
    // Ignore messages sent by other bots or itself
    if (message.author.bot) return;

    // 1. The secret command to spawn the UI
    if (message.content === '!setupmenu') {
        const menuEmbed = new EmbedBuilder()
            .setTitle('Welcome to TaskVault!')
            .setDescription('Please select an option below to get started with your tasks.')
            .setColor('#5865F2');

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('btn_intro').setLabel('Intro').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_rules').setLabel('Rules').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_start').setLabel('Start').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_help').setLabel('Help').setStyle(ButtonStyle.Danger)
            );

        await message.channel.send({ embeds: [menuEmbed], components: [buttonRow] });
        await message.delete().catch(() => {});
        return; // Exit here so it doesn't trigger the database search
    }

    // 2. Database Search
    const userQuery = message.content.trim();
    if (userQuery.length > 3) {
        await message.channel.sendTyping();
        const answer = await searchDatabase(userQuery);
        if (answer) {
            const replyEmbed = new EmbedBuilder()
                .setColor('#00ffcc')
                .setTitle('🔍 Task Found')
                .setDescription(`**Question:** ${userQuery}\n\n**Verified Answer:** ${answer}`)
                .setFooter({ text: 'TaskVault Database' });
            await message.reply({ embeds: [replyEmbed] });
        }
    }
});

// Handle Interactions (Buttons AND Slash Commands)
client.on('interactionCreate', async interaction => {
    // 1. Handle Buttons
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_intro') {
            await interaction.reply({ content: 'Welcome to the Intro!', ephemeral: true });
        } else if (interaction.customId === 'btn_rules') {
            await interaction.reply({ content: 'Here are the Rules!', ephemeral: true });
        } else if (interaction.customId === 'btn_start') {
            await interaction.reply({ content: 'Let us get started! Use /addtask to add a task.', ephemeral: true });
        } else if (interaction.customId === 'btn_help') {
            await interaction.reply({ content: 'Need help? Here are the commands...', ephemeral: true });
        }
    } 
    // 2. Handle Slash Commands (/addtask)
    else if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'addtask') {
            await interaction.reply({ content: 'Task added successfully!', ephemeral: true });
        }
    }
});

// Web server for Render and Login
const http = require('http');
http.createServer((req, res) => res.end('TaskVault is running!')).listen(process.env.PORT || 3000);
client.login(process.env.DISCORD_TOKEN);
