require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');
const { supabase, searchDatabase } = require('./supabase');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- OPERATIONAL CONFIGURATION PANEL ---
const GOOGLETASK_CHANNEL_ID = '1518236682950934619'; 
const UNANSWERED_CHANNEL_ID = '1518236790958325821';
const BILLING_LOGS_ID = '1518224380339949720'; 
const CHAT_CHANNEL_ID = '123456789012345678'; // <-- PUT YOUR ACTUAL CHAT CHANNEL ID HERE
const WALLET_ADDRESS = '0x777B89324A3dE1581f0070DE948d19DC7497d147';
const REFERRAL_LINK = 'https://www.jumptask.io/r/wodarajysedi';
const REFERRAL_CODE = 'wodarajysedi';

client.once('ready', () => {
    console.log(`🚀 TaskVault V2 Core Engine Fully Online.`);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- MESSAGE CREATION HANDLER ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- SYSTEM ONBOARDING TRIGGER (!poststart) ---
    if (message.content === '!poststart') {
        if (!message.member.permissions.has('Administrator')) return;

        const startEmbed = new EmbedBuilder()
            .setTitle('🤖 Welcome to TaskVault')
            .setDescription('➡️ **Select an option below to begin:**')
            .setColor('#5865F2');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('funnel_step_1_start').setLabel('🚀 Initialize Onboarding').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('gateway_premium_portal').setLabel('💳 Subscription Packages').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('open_support_ticket').setLabel('🎫 Contact Support').setStyle(ButtonStyle.Primary)
        );

        // Link buttons to automatically open chats/websites
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('💬 Help (#chat)').setURL(`https://discord.com/channels/${message.guild.id}/${CHAT_CHANNEL_ID}`).setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('✈️ TaskVault Telegram').setURL('https://t.me/TaskVault0fficial').setStyle(ButtonStyle.Link),
            new ButtonBuilder().setLabel('📱 TaskVault WhatsApp').setURL('https://whatsapp.com/channel/0029VbCrux5GOj9k4swJmq2M').setStyle(ButtonStyle.Link)
        );

        await message.channel.send({ 
            content: `**TaskVault Official Socials:**\n✈️ **Telegram:** The best place to find daily JumpTask strategies, new high-paying task alerts, and fast system updates!\n📱 **WhatsApp:** Daily updates are given here, join here 👍`,
            embeds: [startEmbed], 
            components: [row1, row2] 
        });
        
        await message.delete().catch(() => {});
        return;
    }

    // --- ADMINISTRATIVE COMMANDS ---
    if (message.content.startsWith('!grant')) {
        if (!message.member.permissions.has('Administrator')) return;
        const args = message.content.split(' ');
        const targetUser = message.mentions.users.first();
        const days = parseInt(args[2]);

        if (!targetUser || isNaN(days)) return message.reply('❌ Format: `!grant @user <days>`');

        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('user_subscriptions').upsert({ user_id: targetUser.id, expires_at: expiresAt, trial_uses: 2 });
        return message.reply(`✅ Granted **${days} days** of tier-access to <@${targetUser.id}>.`);
    }

    if (message.content.startsWith('!checksub')) {
        const targetUser = message.mentions.users.first() || message.author;
        const { data: sub } = await supabase.from('user_subscriptions').select('expires_at').eq('user_id', targetUser.id).maybeSingle();

        if (!sub || !sub.expires_at || new Date(sub.expires_at) < new Date()) return message.reply(`❌ User <@${targetUser.id}> has no active sub.`);
        const daysLeft = Math.ceil((new Date(sub.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
        return message.reply(`💳 <@${targetUser.id}> has **${daysLeft} days** remaining.`);
    }

    // --- CENTRAL CORE SEARCH ---
    if (message.channel.id === GOOGLETASK_CHANNEL_ID) {
        const userQuery = message.content.trim();
        if (userQuery.length <= 3) return;

        const { data: sub } = await supabase.from('user_subscriptions').select('expires_at, trial_uses').eq('user_id', message.author.id).maybeSingle();
        const isPremium = sub && sub.expires_at && new Date(sub.expires_at) >= new Date();
        const trialCount = sub ? (sub.trial_uses || 0) : 0;

        if (!isPremium && trialCount >= 2) return message.reply('🛑 **Limit Reached.** Your 2 free searches are used up. Please purchase a subscription.');

        await message.channel.sendTyping();
        const answer = await searchDatabase(userQuery);

        if (answer) {
            await supabase.from('task_logs').insert([{ user_id: message.author.id, question: userQuery }]);

            if (!isPremium) {
                const newTrialCount = trialCount + 1;
                await supabase.from('user_subscriptions').upsert({ user_id: message.author.id, trial_uses: newTrialCount });
                const trialEmbed = new EmbedBuilder().setColor('#e67e22').setTitle('🔍 Task Located').setDescription(`**Verified Solution:** ${answer}`).setFooter({ text: `Free Credits Used: ${newTrialCount}/2` });
                await message.reply({ embeds: [trialEmbed] });
            } else {
                const premiumEmbed = new EmbedBuilder().setColor('#00ffcc').setTitle('🔍 Solution Match Found').setDescription(`**Verified Solution:** ${answer}`);
                await message.reply({ embeds: [premiumEmbed] });
            }
        } else {
            await message.reply({ content: '⏳ **This query signature is updating soon.** The tracking team has been dispatched.' });
        }
    }
});



// --- BUTTON AND COMMAND INTERACTION HANDLER ---
client.on('interactionCreate', async (interaction) => {
    
    // --- SLASH COMMANDS (Fixed to prevent "Did not respond" errors) ---
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'stats' || interaction.commandName === 'myperformance') {
            await interaction.deferReply({ ephemeral: true });
            
            let query = supabase.from('task_logs').select('*', { count: 'exact', head: true });
            if (interaction.commandName === 'myperformance') {
                query = query.eq('user_id', interaction.user.id);
            }
            
            const { count } = await query;
            const embed = new EmbedBuilder()
                .setTitle(interaction.commandName === 'stats' ? '📊 System Stats' : '📈 Your Performance')
                .setDescription(`Total Tasks Processed: \`${count || 0}\``)
                .setColor('#f1c40f');
                
            return await interaction.editReply({ embeds: [embed] });
        }
    }

    // If it's not a button, stop here.
    if (!interaction.isButton()) return;

    // --- ONBOARDING STAGES ---
    if (interaction.customId === 'funnel_step_1_start') {
        await interaction.reply({ content: '⚙️ *Syncing databank nodes...*', ephemeral: true });
        await interaction.channel.sendTyping();
        await sleep(3000); 
        const readyEmbed = new EmbedBuilder().setTitle('⚠️ NOTICE').setDescription(`✅ *Compliance complete. Advance to rules.*`).setColor('#ff3333');
        const rulesRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('funnel_step_2_rules').setLabel('⚖️ Advance to Rules').setStyle(ButtonStyle.Primary));
        await interaction.editReply({ embeds: [readyEmbed], components: [rulesRow] });
    }

    if (interaction.customId === 'funnel_step_2_rules') {
        const rulesEmbed = new EmbedBuilder()
            .setTitle('⚖️ Core System Rules')
            .setDescription(`1️⃣ Do not combine multiple Discord accounts.\n2️⃣ Do not use unverified plugins.\n\n💡 **PRO-TIPS LOCK:** Locked. Purchase a sub to reveal Admin pro-tips!`)
            .setColor('#d63031');

        const navigationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gateway_activate_trial').setLabel('🚀 Start Free Trial (2 Searches)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('gateway_premium_portal').setLabel('💳 Purchase Subscription').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ embeds: [rulesEmbed], components: [navigationRow], ephemeral: true });
    }

    if (interaction.customId === 'gateway_activate_trial') {
        return await interaction.reply({ content: `🎉 **Trial Initialized.** Proceed to <#${GOOGLETASK_CHANNEL_ID}>!`, ephemeral: true });
    }

    // --- SUBSCRIPTION PORTAL ---
    if (interaction.customId === 'gateway_premium_portal') {
        const portalEmbed = new EmbedBuilder()
            .setTitle('💳 TaskVault Tier Portal')
            .setDescription(`🪙 **Option 1:** Crypto Checkout\n📤 **Option 2:** Earn Via Uploads\n🔗 **Option 3:** Affiliate Referrals`)
            .setColor('#6c5ce7');

        const portalRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tier_crypto_view').setLabel('🪙 Option 1: Crypto Checkout').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tier_upload_loop').setLabel('📤 Option 2: Earn Via Uploads').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tier_referral_view').setLabel('🔗 Option 3: Affiliate Referral').setStyle(ButtonStyle.Success)
        );
        await interaction.reply({ embeds: [portalEmbed], components: [portalRow], ephemeral: true });
    }

    // 🪙 OPTION 1: CRYPTO
    if (interaction.customId === 'tier_crypto_view') {
        const cryptoEmbed = new EmbedBuilder()
            .setTitle('🪙 Crypto Checkout')
            .setDescription(
                `📌 **Manual Wallet Address:**\n\`${WALLET_ADDRESS}\`\n\n` +
                `*After pay click 'Upload Proof' below. Soon admin check and grant you access.*\n\n` +
                `💡 **Tip:** Try to do "updating soon" tasks! It helps a lot and you can get a subscription too by uploading them.\n\n` +
                `👇 **Select a Package (BNB, SOL, JMPT, USDT, USDC):**`
            )
            .setColor('#f1c40f');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('qr_package_1d').setLabel('1 Day - $0.25').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_2d').setLabel('2 Days - $0.40').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_4d').setLabel('4 Days - $0.65').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_7d').setLabel('7 Days - $1.05').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('qr_package_14d').setLabel('14 Days - $1.80').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_30d').setLabel('30 Days - $3.30').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('open_support_ticket').setLabel('📤 Upload Proof').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [cryptoEmbed], components: [row1, row2], ephemeral: true });
    }

    if (interaction.customId.startsWith('qr_package_')) {
        const responseEmbed = new EmbedBuilder().setColor('#f39c12').setTitle(`📊 QR Template Package`).setDescription(`Scan via your primary decentralized wallet application.`);
        return await interaction.reply({ embeds: [responseEmbed], content: `📁 *[QR IMAGE LINK HERE]*`, ephemeral: true });
    }

    // 📤 OPTION 2: UPLOADS
    if (interaction.customId === 'tier_upload_loop') {
        const uploadChannel = await interaction.guild.channels.create({
            name: `📤-upload-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]
        });

        const uploadEmbed = new EmbedBuilder()
            .setTitle('📤 Earn Via Uploads')
            .setDescription(
                `If a task shows **"updating soon"**, you can search it manually, save that task, and upload it here! You can do one by one or collect 5 and get free subscription after checking.\n\n` +
                `📊 **Reward Scale:**\n* 5 New Tasks = 2 Days Free\n* 8 New Tasks = 4 Days Free\n* 40 Existing Tasks = Sub Granted`
            )
            .setColor('#3498db');
            
        await uploadChannel.send({ embeds: [uploadEmbed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('🔒 Close').setStyle(ButtonStyle.Danger))] });
        return await interaction.reply({ content: `✅ Submissions workspace created: <#${uploadChannel.id}>`, ephemeral: true });
    }

    // 🔗 OPTION 3: REFERRAL
    if (interaction.customId === 'tier_referral_view') {
        const referralChannel = await interaction.guild.channels.create({
            name: `🔗-referral-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]
        });

        const refEmbed = new EmbedBuilder()
            .setTitle('🔗 Affiliate Referral')
            .setDescription(`Use our referral to get free access for 4 days.\n1️⃣ Use Link: ${REFERRAL_LINK}\n2️⃣ Or Code: \`${REFERRAL_CODE}\`\n\nUpload a screen recording of you doing it below.\n\n💡 **Tip:** When TaskVault gives "updating soon", try to find that task, save it, and grab a subscription!`)
            .setColor('#2ecc71');
            
        await referralChannel.send({ embeds: [refEmbed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('🔒 Close').setStyle(ButtonStyle.Danger))] });
        return await interaction.reply({ content: `✅ Referral pipeline channel constructed: <#${referralChannel.id}>`, ephemeral: true });
    }

    // 🎫 SUPPORT TICKET GENERATION
    if (interaction.customId === 'open_support_ticket') {
        const ticketChannel = await interaction.guild.channels.create({
            name: `🎫-ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });
        
        const controlEmbed = new EmbedBuilder()
            .setTitle('🎫 TaskVault Support Ticket')
            .setDescription(`Admin will check soon.\n\n**Your query:**\n*(Please type your questions or upload your payment proof below)*`)
            .setColor('#2ecc71');
            
        const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ embeds: [controlEmbed], components: [closeRow] });
        return await interaction.reply({ content: `✅ Support ticket opened: <#${ticketChannel.id}>`, ephemeral: true });
    }

    // --- MANUAL CHANNEL CLOSING ---
    if (interaction.customId === 'ticket_admin_close_trigger') {
        if (!interaction.member.permissions.has('Administrator')) return await interaction.reply({ content: '❌ System error: Access restricted.', ephemeral: true });
        return await interaction.reply({
            content: '🚨 Delete and close this channel?',
            components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirm_yes_delete').setLabel('🔴 Yes').setStyle(ButtonStyle.Danger), new ButtonBuilder().setCustomId('confirm_no_abort').setLabel('🟢 No').setStyle(ButtonStyle.Success))],
            ephemeral: true
        });
    }

    if (interaction.customId === 'confirm_yes_delete') {
        await interaction.reply({ content: '⚙️ Closing channel...' });
        await sleep(1000);
        return await interaction.channel.delete().catch(() => {});
    }
    if (interaction.customId === 'confirm_no_abort') return await interaction.reply({ content: '✅ Aborted.', ephemeral: true });
});

// --- ENGINE BACKUP DEPLOYMENT ---
const http = require('http');
http.createServer((req, res) => res.end('TaskVault Engine Matrix V2.0 Core Active.')).listen(process.env.PORT || 3000);
client.login(process.env.DISCORD_TOKEN);
