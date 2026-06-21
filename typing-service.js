// typing-service.js
// Handles Discord interaction delays to prevent timeout errors

async function safeDeferReply(interaction) {
    try {
        // Checks if the bot has already replied or deferred
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: false });
        }
    } catch (error) {
        console.error("Error deferring reply:", error);
    }
}

module.exports = { safeDeferReply };
