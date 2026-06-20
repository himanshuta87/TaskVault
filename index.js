require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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
