require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
// IMPORTANT: We added 'supabase' to this import line
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
        return;
    }

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

client.on('interactionCreate', async interaction => {
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

const http = require('http');
http.createServer((req, res) => res.end('TaskVault is running!')).listen(process.env.PORT || 3000);
// --- AUTO-DEPLOY COMMANDS ---
const { REST, Routes } = require('discord.js');
const { commands } = require('./discord.command.js'); // Point to your command file

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        // Replace 'YOUR_CLIENT_ID' with your Bot ID from Discord Developer Portal
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.login(process.env.DISCORD_TOKEN);
