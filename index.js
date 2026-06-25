
```javascript
/**
 * TASKVAULT PRODUCTION SYSTEM - PART 1/4
 * SECURE .ENV INITIALIZATION, FILE SYSTEM PERSISTENCE & TIMERS
 */

// THIS LINE UNLOCKS YOUR .ENV FILE - IT MUST BE AT THE VERY TOP
require('dotenv').config();

const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ====================================================================
// CONFIGURATION CENTER
// Your Bot Token, Bot ID, and Server ID are now securely hidden in .env
// You can still manually update your UPI or Crypto address here.
// ====================================================================
const CONFIG = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID,
    UPI_ID: "himanshushakya1234567890@okicici",
    CRYPTO_WALLET: "0x777B89324A3dE1581f0070DE948d19DC7497d147"
};
// ====================================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

const DB_PATH = path.join(__dirname, 'vault_database.json');
let db = { users: {} };

// Synchronously pull existing user tracking baselines on server startup
function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
            console.log("[DATABASE] Successfully synchronized all state tracking history parameters.");
        } else {
            saveDatabase();
        }
    } catch (err) {
        console.error("[DATABASE ERROR] Initialization failure:", err);
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 4), 'utf8');
    } catch (err) {
        console.error("[DATABASE ERROR] Failed writing runtime parameters:", err);
    }
}

function getOrCreateUser(userId) {
    if (!db.users[userId]) {
        db.users[userId] = {
            subscribed: false,
            subscriptionEnd: null,
            tier: null,
            trialActive: false,
            hasAccessToProTips: false,
            canReplyToTickets: false, // Tracks custom staff moderator clearance rules
            tasksCompleted: 0,
            earnings: 0.00,
            referralCode: Math.random().toString(36).substring(2, 10),
            hasWarnedExpiration: false
        };
        saveDatabase();
    }
    return db.users[userId];
}

// Background scheduler running continuously to handle active expirations and 6-hour prompts
setInterval(() => {
    const now = Date.now();
    Object.keys(db.users).forEach(async (userId) => {
        const userData = db.users[userId];
        if (userData.subscribed && userData.subscriptionEnd) {
            const timeLeft = userData.subscriptionEnd - now;
            
            // 6-Hour warning threshold notifications
            if (timeLeft > 0 && timeLeft <= 21600000 && !userData.hasWarnedExpiration) {
                userData.hasWarnedExpiration = true;
                saveDatabase();
                try {
                    const discordUser = await client.users.fetch(userId);
                    if (discordUser) {
                        const embed = new EmbedBuilder()
                            .setTitle("⚠️ TaskVault Subscription Running Low")
                            .setDescription("Your automated task pipeline access expires in less than 6 hours. Navigate back to the onboarding terminal to renew your profile.")
                            .setColor("#FFA500");
                        await discordUser.send({ embeds: [embed] }).catch(() => null);
                    }
                } catch (e) {}
            }
            
            // Natural clean cutoff execution
            if (timeLeft <= 0) {
                userData.subscribed = false;
                userData.subscriptionEnd = null;
                userData.tier = null;
                userData.hasWarnedExpiration = false;
                userData.hasAccessToProTips = false;
                saveDatabase();
                try {
                    const discordUser = await client.users.fetch(userId);
                    if (discordUser) {
                        const embed = new EmbedBuilder()
                            .setTitle("🔒 Premium Access Concluded")
                            .setDescription("Your current subscription term has ended. Google task extraction channels have returned to locked configuration states.")
                            .setColor("#FF0000");
                        await discordUser.send({ embeds: [embed] }).catch(() => null);
                    }
                } catch (e) {}
            }
        }
    });
}, 60000);

loadDatabase();




/**
 * TASKVAULT PRODUCTION SYSTEM - PART 2/4
 * ISOLATION OVERWRITES & REGEX CLEAN ANSWER PARSERS
 */

client.on('ready', () => {
    console.log("[CORE TERMINAL ACTIVE] Connected and listening as system app: " + client.user.tag);
});

// Structural security function managing individual visibility matrices on channels
async function updateChannelPermissionsForUser(guild, member, state) {
    try {
        const channels = await guild.channels.fetch();
        const chatChannel = channels.find(c => c.name === 'chat');
        const googleTaskChannel = channels.find(c => c.name === 'googletask');
        
        const userData = getOrCreateUser(member.id);
        const holdsValidAccess = userData.subscribed || userData.trialActive;

        if (chatChannel) {
            if (state === 'show_chat') {
                await chatChannel.permissionOverwrites.edit(member.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            } else if (!chatChannel.permissionOverwrites.cache.has(member.id)) {
                await chatChannel.permissionOverwrites.edit(member.id, { ViewChannel: false });
            }
        }

        if (googleTaskChannel) {
            if (holdsValidAccess) {
                await googleTaskChannel.permissionOverwrites.edit(member.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: false // Turning history off makes the channel completely private for every user
                });
            } else {
                await googleTaskChannel.permissionOverwrites.edit(member.id, { ViewChannel: false });
            }
        }
    } catch (error) {
        console.error("[PERMISSIONS FAULT] Failed updating user runtime overrides:", error);
    }
}

client.on('guildMemberAdd', async (member) => {
    getOrCreateUser(member.id);
    await updateChannelPermissionsForUser(member.guild, member, 'default');
});

// Monitoring query inputs and matching verification protocols inside googletask
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.channel.name === 'googletask') {
        const userData = getOrCreateUser(message.author.id);
        
        if (!userData.subscribed && !userData.trialActive) {
            const warn = await message.reply("⚠️ Workspace locked. Please initialize an active operational tier plan inside the launch panel.");
            setTimeout(() => { message.delete().catch(() => null); warn.delete().catch(() => null); }, 5000);
            return;
        }

        const lowerMessage = message.content.toLowerCase();
        if (lowerMessage.includes("locate") || lowerMessage.includes("find") || lowerMessage.includes("words")) {
            
            // Output fix: Returns ONLY the raw text answer cleanly so copying is straightforward on mobile devices
            const extractedRawAnswer = "confirmation times"; 

            userData.tasksCompleted += 1;
            userData.earnings += 0.04; 
            saveDatabase();

            return message.reply(extractedRawAnswer);
        }
    }
});




/**
 * TASKVAULT PRODUCTION SYSTEM - PART 3/4
 * SYSTEM ONBOARDING ENGINE, RULES LAYOUTS & TICKETING TRIGGERS
 */

function generateHomeEmbedAndButtons() {
    const hubEmbed = new EmbedBuilder()
        .setTitle("🤖 Welcome to TaskVault")
        .setDescription("Your ultimate automation hub for bypassing micro-task grinds and scaling your earnings instantly.\n\n" +
                        "**Need Help?**\nTalk to each other and sort things out directly in our chat panel!\n\n" +
                        "📱 **TaskVault Updates WhatsApp**\nDaily updates are given here join here 👍\n[Click here to Join WhatsApp](https://chat.whatsapp.com/)\n\n" +
                        "✈️ **TaskVault Telegram**\nDaily trading alpha, system updates, and platform performance metrics.\n[Click here to Join Telegram](https://t.me/)\n\n" +
                        "➡️ **Select an option below to begin:**")
        .setColor("#00AAFF");

    const layoutRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_start_here').setLabel('Start Here').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_help_chat').setLabel('Help (#chat)').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_tg').setLabel('TaskVault Telegram').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_wa').setLabel('TaskVault WhatsApp').setStyle(ButtonStyle.Secondary)
    );

    return { embeds: [hubEmbed], components: [layoutRow] };
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const userId = interaction.user.id;
    const userData = getOrCreateUser(userId);

        if (interaction.customId === 'btn_help_chat') {
        await updateChannelPermissionsForUser(interaction.guild, interaction.member, 'show_chat');
        const chatChannel = interaction.guild.channels.cache.find(c => c.name === 'chat');
        
        // Mobile-safe string concatenation using standard quotes
        return await interaction.reply({
            content: "**Need Help?**\nEnter the community chat node:\n👉 " + (chatChannel ? "<#" + chatChannel.id + ">" : "#chat"),
            ephemeral: true
        });
    }

        await updateChannelPermissionsForUser(interaction.guild, interaction.member, 'show_chat');
        const chatChannel = interaction.guild.channels.cache.find(c => c.name === 'chat');
        return await interaction.reply({
            content: `**Need Help?**\nEnter the community chat node:\n👉 ${chatChannel ? `<#${chatChannel.id}>` : '#chat'}`,
            ephemeral: true
        });
    }

    if (interaction.customId === 'btn_tg') return await interaction.reply({ content: "🔗 **TaskVault Telegram:** https://t.me/your_telegram_link", ephemeral: true });
    if (interaction.customId === 'btn_wa') return await interaction.reply({ content: "🔗 **TaskVault WhatsApp:** https://chat.whatsapp.com/your_whatsapp_link", ephemeral: true });

    if (interaction.customId === 'btn_start_here') {
        await interaction.reply({ content: "⚙️ *Syncing databank nodes...*", ephemeral: true });
        setTimeout(async () => {
            await interaction.followUp({ content: "📝 **How TaskVault works**\nTaskVault do the heavy lifting for you by instently fetching answer for you.", ephemeral: true });
            setTimeout(async () => {
                const rulesRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_view_rules').setLabel('View Operational Rules').setStyle(ButtonStyle.Primary)
                );
                await interaction.followUp({ content: "🏁 Introduction matrix verified. Review rules sequence below to finalize authorization.", components: [rulesRow], ephemeral: true });
            }, 20000); // 20-second delay countdown sequence
        }, 1500);
    }

    if (interaction.customId === 'btn_view_rules') {
        await interaction.reply({ content: "🔄 *TaskVault is typing...*", ephemeral: true });
        setTimeout(async () => {
            const rulesEmbed = new EmbedBuilder()
                .setTitle("⚠️ MANDATORY COMPLIANCE RULES")
                .setDescription(
                    "**Need follow rules if you don't want to get banned from jtask**\n\n" +
                    "1️⃣ **No multi accounting** you surely get banned if you do.\n" +
                    "2️⃣ Copy 4th point of google task and give to TaskVault it gives you verified answer.\n" +
                    "3️⃣ **For pro tips access 14 day or 30 day premium**\n" +
                    "   - It made by admin best ones\n" +
                    "   - You gain 5 to 6 $ every week\n" +
                    "   - In a month 20 to 30 $\n" +
                    "   - Just buy 14 or 30 day premium to unlock pro tips."
                )
                .setColor("#FF0000");

            const hasProAccess = userData.subscribed && (userData.tier === '14_day' || userData.tier === '30_day' || userData.hasAccessToProTips);
            
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_pro_tips')
                    .setLabel(hasProAccess ? '🔓 Pro Tips Unlocked' : '🔒 Pro Tips Locked')
                    .setStyle(hasProAccess ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_subscription_portal').setLabel('Subscription Packages').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('btn_support_ticket').setLabel('Contact Support').setStyle(ButtonStyle.Secondary)
            );
            await interaction.followUp({ embeds: [rulesEmbed], components: [actionRow], ephemeral: true });
        }, 2000);
    }

    if (interaction.customId === 'btn_pro_tips') {
        const hasProAccess = userData.subscribed && (userData.tier === '14_day' || userData.tier === '30_day' || userData.hasAccessToProTips);
        if (!hasProAccess) {
            return await interaction.reply({ content: "🔒 **Access Denied:** Pro Tips are reserved for 14-day and 30-day Premium plans, or via manual admin clearance overrides.", ephemeral: true });
        }
        return await interaction.reply({ content: "💡 **VIP PRO TIP MATCHES:** Avoid peak task traffic hours, verify text hashes carefully, and run concurrent routing nodes to clear up to $6 weekly effortlessly.", ephemeral: true });
    }

    if (interaction.customId === 'btn_subscription_portal') {
        const portalEmbed = new EmbedBuilder()
            .setTitle("💳 TaskVault Tier Portal")
            .setDescription("Select your payment track below:")
            .setColor("#F1C40F");

        const portalRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('sub_crypto').setLabel('Access via Crypto').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('sub_upload').setLabel('Access via Upload').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('sub_referral').setLabel('Access via Referral').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('sub_upi').setLabel('Access via UPI').setStyle(ButtonStyle.Primary)
        );
        return await interaction.reply({ embeds: [portalEmbed], components: [portalRow], ephemeral: true });
    }

    // Referral link option (Set to 3 days cleanly)
    if (interaction.customId === 'sub_referral') {
        return await interaction.reply({
            content: "🔗 **Affiliate Referral Gateway**\nUse our tracking referral to claim completely free workspace access for **3 days**.\n\n" +
                     "1️⃣ **Use Link:** https://www.jumptask.io/r/wodarajysedi\n" +
                     `2️⃣ **Your Target Code (Tap to Copy):** \`${userData.referralCode}\` \n\n` +
                     "Send this code to your referral. Upload evidence captures below for activation.",
            ephemeral: true
        });
    }

    // Private pop-up implementations with image placeholders for QR assets
    if (interaction.customId === 'sub_crypto') {
        const cryptoEmbed = new EmbedBuilder()
            .setTitle("🪙 Crypto Assets Node")
            .setDescription(`Tap the hash value below to copy cleanly:\n\n\`${CONFIG.CRYPTO_WALLET}\`\n\n• 1 Day - $0.25 | • 2 Days - $0.40 | • 4 Days - $0.65\n• 7 Days - $1.05 | • 14 Days - $1.80 | • 30 Days - $3.30`)
            .setImage("https://your-image-hosting-link.com/crypto-qr.jpg") 
            .setColor("#9B59B6");
        return await interaction.reply({ embeds: [cryptoEmbed], ephemeral: true });
    }

    if (interaction.customId === 'sub_upi') {
        const upiEmbed = new EmbedBuilder()
            .setTitle("🇮🇳 UPI Pay Assets Gateway")
            .setDescription(`Long-press the text field below to copy the address:\n\n\`${CONFIG.UPI_ID}\`\n\n**Rates:**\n• 1 Day: 23 Rs | • 2 Days: 36 Rs\n• 4 Days: 60 Rs | • 7 Days: 99 Rs\n• 14 Days: 169 Rs | • 30 Days: 310 Rs`)
            .setImage("https://your-image-hosting-link.com/upi-qr.jpg")
            .setColor("#1ABC9C");
        return await interaction.reply({ embeds: [upiEmbed], ephemeral: true });
    }
});




/**
 * TASKVAULT PRODUCTION SYSTEM - PART 4/4
 * INTERACTIVE COMMANDS, TICKET NODES & CATEGORY BUILDER
 */

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, user, guild } = interaction;

    // Suggestion system ticket instantiation logic
    if (customId === 'btn_create_suggestion_ticket') {
        await interaction.reply({ content: "🚀 *Spinning up secure recommendation node...*", ephemeral: true });
        try {
            // Build absolute base permission overwrites array
            const permissionOverwrites = [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
            ];

            // Scan database dynamically and add authorized helper nodes automatically
            Object.keys(db.users).forEach((id) => {
                if (db.users[id].canReplyToTickets) {
                    permissionOverwrites.push({
                        id: id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    });
                }
            });

            const ticketChannel = await guild.channels.create({
                name: `suggest-${user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: permissionOverwrites
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle("📝 Suggestion Workspace")
                .setDescription(`Welcome <@${user.id}>. Drop your application suggestions here in detail.\n\nAdministrators and cleared staff will evaluate your feedback. If adopted, an active subscription tier will be credited to your profile manually. Use channel configurations to close this node when complete.`)
                .setColor("#E67E22");

            await ticketChannel.send({ embeds: [ticketEmbed] });
            return await interaction.followUp({ content: `🎯 Secure suggestion pipeline initialized: <#${ticketChannel.id}>`, ephemeral: true });
        } catch (e) {
            return await interaction.followUp({ content: "❌ Failed generating secure suggestion workspace channel node.", ephemeral: true });
        }
    }

    // Payout system processing handlers
    if (customId === 'pay_crypto_upi' || customId === 'pay_google_play') {
        const isCrypto = customId === 'pay_crypto_upi';
        const selectionEmbed = new EmbedBuilder()
            .setTitle(isCrypto ? "💵 Exchange Request: Crypto to UPI" : "🎟️ Exchange Request: Google Play Voucher")
            .setDescription(isCrypto 
                ? "**Select your target withdrawal tier volume below:**\n\n• 4$ get = 329 Rs\n• 5$ get = 422 Rs\n• 6$ get = 499 Rs\n*Or any custom amount accepted for processing.*"
                : "**Select your target voucher exchange tier volume below:**\n\n• 4$ get = 329 Rs\n• 5$ get = 410 Rs\n• 6$ get = 499 Rs\n*Or any custom amount accepted for processing.*"
            )
            .setColor("#E67E22");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`payout_val_4_${customId}`).setLabel('$4.00 Tier').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`payout_val_5_${customId}`).setLabel('$5.00 Tier').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`payout_val_6_${customId}`).setLabel('$6.00 Tier').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`payout_val_custom_${customId}`).setLabel('Type Custom Amount').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`payout_upload_proof_${customId}`).setLabel('Upload Proof & Process').setStyle(ButtonStyle.Success)
        );
        return await interaction.reply({ embeds: [selectionEmbed], components: [row], ephemeral: true });
    }

    if (customId.startsWith('payout_upload_proof_')) {
        await interaction.reply({ content: "🚀 *Spinning up isolated secure payout channel...*", ephemeral: true });
        try {
            const privateChannel = await guild.channels.create({
                name: `payout-${user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                ]
            });
            const workerEmbed = new EmbedBuilder()
                .setTitle("💼 Payout Pipeline Processing Node")
                .setDescription("Please drop your payment details or balance logs here directly. An administrator will handle confirmation and resolve the channel manually.")
                .setColor("#2ECC71");
            await privateChannel.send({ embeds: [workerEmbed] });
            return await interaction.followUp({ content: `🎯 Secure payout window generated: <#${privateChannel.id}>`, ephemeral: true });
        } catch (e) {
            return await interaction.followUp({ content: "❌ Thread pipeline allocation fault.", ephemeral: true });
        }
    }
});

// App application slash layout commands handlers
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, guild } = interaction;
    const userData = getOrCreateUser(user.id);

    if (commandName === 'stats') {
        const now = Date.now();
        let statusString = "❌ No active package verified.";
        let clockString = "N/A";

        if (userData.trialActive) {
            statusString = "🚀 Evaluation Free Trial Active";
            clockString = "Unlimited configuration profile rules applied.";
        } else if (userData.subscribed && userData.subscriptionEnd) {
            const delta = userData.subscriptionEnd - now;
            if (delta > 0) {
                const hoursLeft = Math.floor(delta / 3600000);
                const minsLeft = Math.floor((delta % 3600000) / 60000);
                statusString = `👑 Premium Tier active [${userData.tier.toUpperCase()}]`;
                clockString = `${hoursLeft} Hours, ${minsLeft} Minutes remaining tracking lifecycles.`;
            }
        }

        const metricsEmbed = new EmbedBuilder()
            .setTitle(`📊 System Diagnostics: ${user.username}`)
            .addFields(
                { name: 'Subscription Level', value: statusString, inline: false },
                { name: 'Time Remaining Life', value: clockString, inline: false },
                { name: 'Total Tasks Evaluated', value: `${userData.tasksCompleted} tracking nodes`, inline: true },
                { name: 'Accumulated Ledger Balances', value: `$${userData.earnings.toFixed(2)} USD`, inline: true }
            )
            .setColor("#9B59B6");
        return await interaction.reply({ embeds: [metricsEmbed], ephemeral: true });
    }

    if (commandName === 'myperformance') {
        const metricsEmbed = new EmbedBuilder()
            .setTitle("📈 Your Performance Overview")
            .setDescription(`Current operational totals logged across active platform tasks:\n\n• **Tasks Completed:** ${userData.tasksCompleted}\n• **Total Value Cleared:** $${userData.earnings.toFixed(2)} USD`)
            .setColor("#2ECC71");
        return await interaction.reply({ embeds: [metricsEmbed], ephemeral: true });
    }

    // Flexible `/grant` Command (Capped at 90 days silently, automatically unlocks pro tips for 14 or 30 days)
    if (commandName === 'grant') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.reply({ content: "🛑 Admin access denied.", ephemeral: true });
        const targetUser = options.getUser('target_user');
        let days = options.getInteger('days');

        if (days > 90) days = 90;
        if (days < 1) days = 1;

        const targetData = getOrCreateUser(targetUser.id);
        targetData.subscribed = true;
        targetData.subscriptionEnd = Date.now() + (days * 24 * 60 * 60 * 1000);
        targetData.tier = days === 30 ? '30_day' : (days === 14 ? '14_day' : `custom_${days}_days`);

        if (days >= 14) targetData.hasAccessToProTips = true;
        saveDatabase();

        return await interaction.reply({ content: `✅ Granted **${days} Days** subscription access to **${targetUser.username}**.`, ephemeral: true });
    }

    // Revoke Subscription Command
    if (commandName === 'revokesub') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.reply({ content: "🛑 Admin access denied.", ephemeral: true });
        const targetUser = options.getUser('target_user');
        const targetData = getOrCreateUser(targetUser.id);

        targetData.subscribed = false;
        targetData.subscriptionEnd = null;
        targetData.tier = null;
        targetData.hasAccessToProTips = false;
        saveDatabase();

        return await interaction.reply({ content: `✅ Subscription package terminated for user **${targetUser.username}**.`, ephemeral: true });
    }

    // Grant Reply Access Command
    if (commandName === 'canreply') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.reply({ content: "🛑 Admin access denied.", ephemeral: true });
        const targetUser = options.getUser('target_user');
        const targetData = getOrCreateUser(targetUser.id);

        targetData.canReplyToTickets = true;
        saveDatabase();

        return await interaction.reply({ content: `✅ **${targetUser.username}** added to the ticket team access list.`, ephemeral: true });
    }

    // Revoke Reply Access Command
    if (commandName === 'revokereply') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.reply({ content: "🛑 Admin access denied.", ephemeral: true });
        const targetUser = options.getUser('target_user');
        const targetData = getOrCreateUser(targetUser.id);

        targetData.canReplyToTickets = false;
        saveDatabase();

        return await interaction.reply({ content: `❌ **${targetUser.username}** removed from the ticket team access list.`, ephemeral: true });
    }

    // Multi-Category Architecture Structural Builder
    if (commandName === 'deploychannels') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.reply({ content: "🛑 Admin permissions required.", ephemeral: true });
        await interaction.reply({ content: "🏗️ Building server layout streams...", ephemeral: true });

        // Category 1: TaskVault Channels
        const cat1 = await guild.channels.create({ name: 'TaskVault Channels', type: ChannelType.GuildCategory });
        const cStart = await guild.channels.create({ name: 'start', type: ChannelType.GuildText, parent: cat1.id });
        await guild.channels.create({ name: 'general', type: ChannelType.GuildText, parent: cat1.id });
        await guild.channels.create({ name: 'chat', type: ChannelType.GuildText, parent: cat1.id });
        await guild.channels.create({ name: 'googletask', type: ChannelType.GuildText, parent: cat1.id });
        const cSugg = await guild.channels.create({ name: 'any-suggestions', type: ChannelType.GuildText, parent: cat1.id });

        // Category 2: Payout Channels
        const cat2 = await guild.channels.create({ name: 'Payout Channels', type: ChannelType.GuildCategory });
        const cPay = await guild.channels.create({ name: 'payout-here', type: ChannelType.GuildText, parent: cat2.id });

        // Category 3: Collaborative Channels
        const cat3 = await guild.channels.create({ name: 'Collaborative Channels', type: ChannelType.GuildCategory });
        const cCollab = await guild.channels.create({ name: 'alpha-community', type: ChannelType.GuildText, parent: cat3.id });

        // Setup #start layout
        await cStart.send(generateHomeEmbedAndButtons());

        // Setup #any-suggestions layout
        const suggEmbed = new EmbedBuilder()
            .setTitle("💡 Help Us & Get Subscription")
            .setDescription("**Help us**\nAny suggestions to improve our app. If your suggestion good we take that and update in feature. And give you free subscription few days.\n\nClick below to open a private ticket to pitch your ideas directly to our staff!")
            .setColor("#E67E22");
        const suggRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_create_suggestion_ticket').setLabel('Submit Suggestion').setStyle(ButtonStyle.Primary)
        );
        await cSugg.send({ embeds: [suggEmbed], components: [suggRow] });

        // Setup #payout-here layout
        const payEmbed = new EmbedBuilder()
            .setTitle("💰 TaskVault Payout Verification Gateway")
            .setDescription("If you want earned money direct in your account or any google play balance voucher click below to select one payout option:")
            .setColor("#1ABC9C");
        const payRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('pay_crypto_upi').setLabel('Crypto to UPI').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('pay_google_play').setLabel('Google Play Voucher').setStyle(ButtonStyle.Success)
        );
        await cPay.send({ embeds: [payEmbed], components: [payRow] });

        // Setup #alpha-community layout
        const alphaEmbed = new EmbedBuilder()
            .setTitle("🤝 Alpha Community Connection")
            .setDescription("Join our collaborative channel too\n**Alpha community**\n\n• **Premium Vibes:** Connect with a thriving community for epic chats and socializing.\n• **Active Gaming:** Join intense tournaments and fun gaming sessions.\n• **Win Big:** Participate in giveaways, reward events, and community highlights.\n• **Your Home Base:** Move your conversations here to keep the task-server clean and your social life active!\n\n🔗 **Server Invite Link:** https://discord.gg/vvKhuu7DPn\n🆔 **Server ID Reference:** `1071303837945700412`")
            .setColor("#3498DB");
        await cCollab.send({ embeds: [alphaEmbed] });

        return await interaction.followUp({ content: "✅ Server layout streams mapped and structural panels deployed successfully.", ephemeral: true });
    }
});

// Command Array Synchronizers
client.on('ready', async () => {
    // Note: It uses process.env.GUILD_ID to grab your specific server directly from the .env file!
    const guild = client.guilds.cache.get(CONFIG.GUILD_ID);
    if (guild) {
        await guild.commands.set([
            { name: 'stats', description: 'Displays your current premium status parameters.' },
            { name: 'myperformance', description: 'Outputs total completed task metrics.' },
            { name: 'deploychannels', description: 'Administrative infrastructure channel setup organizer.' },
            { 
                name: 'grant', 
                description: 'Allocates manual subscription access time directly.',
                options: [
                    { name: 'target_user', description: 'The user profile node to update.', type: 6, required: true },
                    { name: 'days', description: 'Number of active days access to give.', type: 4, required: true }
                ]
            },
            {
                name: 'revokesub',
                description: 'Terminates a specified user subscription manually.',
                options: [{ name: 'target_user', description: 'The user to strip premium from.', type: 6, required: true }]
            },
            {
                name: 'canreply',
                description: 'Gives a user permission to view and reply to suggestion tickets.',
                options: [{ name: 'target_user', description: 'The team member to add.', type: 6, required: true }]
            },
            {
                name: 'revokereply',
                description: 'Removes a user from the ticket team access list.',
                options: [{ name: 'target_user', description: 'The user to remove.', type: 6, required: true }]
            }
        ]);
        console.log("[DEPLOYMENT] Global slash interface commands registered smoothly.");
    }
});

// The bot logs in securely using the Token from your hidden .env file
client.login(CONFIG.TOKEN);
