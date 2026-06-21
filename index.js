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

client.once('ready', () => {
    console.log(`✅ TaskVault is online! Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- 1. START MENU COMMAND ---
    if (message.content === '!poststart') {
        const menuEmbed = new EmbedBuilder()
            .setTitle('TaskVault — Start Menu')
            .setDescription(`
                Welcome to TaskVault. Please select an option to begin:
                
                **1. Introduction** (Coming Soon)
                **2. Rules** (Coming Soon)
                **3. Subscription** (Coming Soon)
                **4. Help** (Discussion & Support)
                **5. Contact Support** (Get your access token)
            `)
            .setColor('#5865F2');

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('intro_btn').setLabel('Introduction').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('rules_btn').setLabel('Rules').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('sub_btn').setLabel('Subscription').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('help_btn').setLabel('Help').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('support_btn').setLabel('Contact Support').setStyle(ButtonStyle.Danger)
            );

        await message.channel.send({ embeds: [menuEmbed], components: [buttonRow] });
        await message.delete().catch(() => {}); // Deletes the '!poststart' command so chat stays clean
        return; // Stops the bot from trying to search the database for "!poststart"
    }

    // --- 2. SUPABASE DATABASE SEARCH ---
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

// --- 3. HANDLING INTERACTIONS (Buttons & Slash Commands) ---
client.on('interactionCreate', async interaction => {
    
    // --- BUTTON CLICKS ---
    if (interaction.isButton()) {
        
        // Help Button
        if (interaction.customId === 'help_btn') {
            // REPLACE THIS ID!
            await interaction.reply({ content: 'Click here to join the discussion: <1518218058504736898>', ephemeral: true });
        } 
        
        // Contact Support Button
        else if (interaction.customId === 'support_btn') {
            const token = Math.random().toString(36).substring(7).toUpperCase();
            
            // REPLACE THIS ID!
            const supportChannel = interaction.guild.channels.cache.get('#1518224380339949720');
            if (supportChannel) {
                supportChannel.send(`🔔 **New Support Request**\nUser: <@${interaction.user.id}>\nToken: **${token}**`);
            }
            
            await interaction.reply({ content: `Your Support Token is: **${token}**\n\nPlease copy this token. You will need to show this to the Admin for verification.`, ephemeral: true });
        } 
        
        // Placeholders (Intro, Rules, Subscription)
        else if (['intro_btn', 'rules_btn', 'sub_btn'].includes(interaction.customId)) {
            await interaction.reply({ content: 'This section is currently under construction. Please check back later!', ephemeral: true });
        }
    } 
    
    // --- SLASH COMMANDS ---
    else if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'addtask') {
            const q = interaction.options.getString('question');
            const a = interaction.options.getString('answer');

            // Insert into Supabase
            const { error } = await supabase
                .from('tasks')
                .insert([{ fourth_point_question: q, verified_answer: a }]);

            if (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Error saving to database.', ephemeral: true });
            } else {
                await interaction.reply({ content: `✅ Task added successfully!\n**Q:** ${q}`, ephemeral: true });
            }
        }
    }
});

// --- SERVER PING & AUTO-DEPLOY COMMANDS ---
const http = require('http');
http.createServer((req, res) => res.end('TaskVault is running!')).listen(process.env.PORT || 3000);

const { REST, Routes } = require('discord.js');
const { commands } = require('./discord.command.js'); 

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.login(process.env.DISCORD_TOKEN);
