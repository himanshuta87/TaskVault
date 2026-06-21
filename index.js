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

// Listen for messages in your Discord server
client.on('messageCreate', async (message) => {
    // Ignore messages sent by other bots or itself
    if (message.author.bot) return;

    const userQuery = message.content.trim();

    // Check if the user typed something longer than 3 characters
    if (userQuery.length > 3) {
        // Trigger the "bot is typing..." indicator
        await message.channel.sendTyping();

        // Search your 368 Supabase records
        const answer = await searchDatabase(userQuery);

        if (answer) {
            // Create a clean visual box (Embed) for the reply
            const replyEmbed = new EmbedBuilder()
                .setColor('#00ffcc')
                .setTitle('🔍 Task Found')
                .setDescription(`**Question:** ${userQuery}\n\n**Verified Answer:** ${answer}`)
                .setFooter({ text: 'TaskVault Database' });

            await message.reply({ embeds: [replyEmbed] });
        } else {
            // Optional: Remove the comments below if you want the bot to say nothing was found
            // await message.reply("❌ No matching task found in the vault.");
        }
    }
});

// Log into Discord using the token from your .env file
// Dummy server to keep Render hosting happy
const http = require('http');
http.createServer((req, res) => res.end('TaskVault is running!')).listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);

client.on('messageCreate', async message => {
    // Ignore messages from other bots
    if (message.author.bot) return;

    // The secret command to spawn the UI
    if (message.content === '!setupmenu') {
        const menuEmbed = new EmbedBuilder()
            .setTitle('Welcome to TaskVault!')
            .setDescription('Please select an option below to get started with your tasks.')
            .setColor('#5865F2');
            // We will add the image and texts later using your to-do list!

        const buttonRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_intro')
                    .setLabel('Intro')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('btn_rules')
                    .setLabel('Rules')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('btn_start')
                    .setLabel('Start')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('btn_help')
                    .setLabel('Help')
                    .setStyle(ButtonStyle.Danger)
            );

        // Send the menu to the channel
        await message.channel.send({ embeds: [menuEmbed], components: [buttonRow] });
        
        // Delete the '!setupmenu' message so the command stays a secret
        await message.delete().catch(() => {});
    }
});

client.on('interactionCreate', async interaction => {
    // If the interaction isn't a button press, ignore it
    if (!interaction.isButton()) return;

    // Check which button was pressed and reply
    if (interaction.customId === 'btn_intro') {
        await interaction.reply({ content: 'Welcome to the Intro! (We will add more text here later)', ephemeral: true });
    } 
    else if (interaction.customId === 'btn_rules') {
        await interaction.reply({ content: 'Here are the Rules! (We will add more text here later)', ephemeral: true });
    } 
    else if (interaction.customId === 'btn_start') {
        await interaction.reply({ content: 'Let us get started! Use /addtask to add a task.', ephemeral: true });
    } 
    else if (interaction.customId === 'btn_help') {
        await interaction.reply({ content: 'Need help? Here are the commands...', ephemeral: true });
    }
});
