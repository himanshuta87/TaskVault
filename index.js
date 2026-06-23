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
const CHAT_CHANNEL_ID = 'REPLACE_WITH_YOUR_CHAT_CHANNEL_ID'; // <-- Paste your public community chat channel ID here
const WALLET_ADDRESS = '0x777B89324A3dE1581f0070DE948d19DC7497d147';
const REFERRAL_LINK = 'https://www.jumptask.io/r/wodarajysedi';
const REFERRAL_CODE = 'wodarajysedi';

client.once('ready', () => {
    console.log(`🚀 TaskVault V2 Core Engine Fully Online.`);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- SYSTEM ONBOARDING TRIGGER (WITH SOCIALS & CHAT) ---
    if (message.content === '!poststart') {
        if (!message.member.permissions.has('Administrator')) return;

        const startEmbed = new EmbedBuilder()
            .setTitle('🤖 Welcome to TaskVault System Control')
            .setDescription(
                `Your ultimate automation hub for bypassing micro-task grinds and scaling your earnings instantly.\n\n` +
                `💬 **Need Help?**\nTalk to each other and sort things out directly in <#${CHAT_CHANNEL_ID}>!\n\n` +
                `📱 **TaskVault Updates WhatsApp**\nDaily updates are given here join here 👍\n[🔗 Click here to Join WhatsApp](https://whatsapp.com/channel/0029VbCrux5GOj9k4swJmq2M)\n\n` +
                `✈️ **TaskVault Telegram**\nDaily trading alpha, system updates, and platform performance metrics.\n[🔗 Click here to Join Telegram](https://t.me/placeholder_link)\n\n` +
                `➡️ **Select an option below to begin:**`
            )
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('funnel_step_1_start').setLabel('🚀 Initialize Onboarding').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('gateway_premium_portal').setLabel('💳 Subscription Packages').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('crypto_open_ticket').setLabel('🎫 Open Private Ticket').setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [startEmbed], components: [row] });
        await message.delete().catch(() => {});
        return;
    }

    // --- ADMINISTRATIVE ACCOUNT MANAGEMENT COMMANDS ---
    if (message.content.startsWith('!grant')) {
        if (!message.member.permissions.has('Administrator')) return;
        const args = message.content.split(' ');
        const targetUser = message.mentions.users.first();
        const days = parseInt(args[2]);

        if (!targetUser || isNaN(days)) return message.reply('❌ Format: `!grant @user <days>`');

        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('user_subscriptions').upsert({ user_id: targetUser.id, expires_at: expiresAt, trial_uses: 2 });
        return message.reply(`✅ **Premium Core Activated.** Granted **${days} days** of tier-access to <@${targetUser.id}>.`);
    }

    if (message.content.startsWith('!checksub')) {
        const targetUser = message.mentions.users.first() || message.author;
        const { data: sub } = await supabase.from('user_subscriptions').select('expires_at').eq('user_id', targetUser.id).maybeSingle();

        if (!sub || !sub.expires_at || new Date(sub.expires_at) < new Date()) {
            return message.reply(`❌ User <@${targetUser.id}> does not possess an active premium tier profile.`);
        }
        const timeLeft = new Date(sub.expires_at) - new Date();
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        return message.reply(`💳 **Subscription Manifest:** <@${targetUser.id}> has **${daysLeft} active days** remaining.`);
    }

    if (message.content.startsWith('!revokesub')) {
        if (!message.member.permissions.has('Administrator')) return;
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply('❌ Please mention a valid target profile.');

        await supabase.from('user_subscriptions').delete().eq('user_id', targetUser.id);
        return message.reply(`🛑 **Authorization Revoked.** Subscription network permissions wiped for <@${targetUser.id}>.`);
    }

    // --- THE CENTRAL CORE SEARCH LIFECYCLE ---
    if (message.channel.id === GOOGLETASK_CHANNEL_ID) {
        const userQuery = message.content.trim();
        if (userQuery.length <= 3) return;

        const { data: sub } = await supabase.from('user_subscriptions').select('expires_at, trial_uses').eq('user_id', message.author.id).maybeSingle();
        const isPremium = sub && sub.expires_at && new Date(sub.expires_at) >= new Date();
        const trialCount = sub ? (sub.trial_uses || 0) : 0;

        if (!isPremium && trialCount >= 2) {
            return message.reply('🛑 **Access Boundary Reached.** Your 2 free trial queries have been exhausted. Please purchase a subscription to continue.');
        }

        await message.channel.sendTyping();
        const answer = await searchDatabase(userQuery);

        if (answer) {
            await supabase.from('task_logs').insert([{ user_id: message.author.id, question: userQuery }]);

            if (!isPremium) {
                const newTrialCount = trialCount + 1;
                await supabase.from('user_subscriptions').upsert({ user_id: message.author.id, trial_uses: newTrialCount });

                const trialEmbed = new EmbedBuilder().setColor('#e67e22').setTitle('🔍 Task Located (Free Sandbox Runtime)').setDescription(`**Question:** ${userQuery}\n\n**Verified Solution:** ${answer}`).setFooter({ text: `TaskVault Sandbox System — Profile Credits Used: ${newTrialCount}/2` });
                await message.reply({ embeds: [trialEmbed] });
            } else {
                const premiumEmbed = new EmbedBuilder().setColor('#00ffcc').setTitle('🔍 Solution Match Found').setDescription(`**Question:** ${userQuery}\n\n**Verified Solution:** ${answer}`).setFooter({ text: 'TaskVault Databank Operational Nodes' });
                await message.reply({ embeds: [premiumEmbed] });
            }
        } else {
            await message.reply({ content: '⏳ **This query signature is updating now.** The tracking team has been dispatched.' });
        }
    }
});


// --- COMPONENT INTERACTION GATEWAY CONTROLLER ---
client.on('interactionCreate', async (interaction) => {
    
    // --- SECTION A: SLASH COMMAND PROCESSING HANDLERS ---
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'stats') {
            await interaction.deferReply({ ephemeral: true });
            const { count } = await supabase.from('task_logs').select('*', { count: 'exact', head: true });
            const { data: sub } = await supabase.from('user_subscriptions').select('expires_at').eq('user_id', interaction.user.id).maybeSingle();
            const isPremium = sub && sub.expires_at && new Date(sub.expires_at) >= new Date();

            const statsEmbed = new EmbedBuilder()
                .setTitle('📊 TaskVault Engine Statistics')
                .setDescription(
                    `🤖 **Total Processed Database Logs:** \`${count || 0}\` items\n` +
                    `💳 **Network Access Profile:** ${isPremium ? '`Premium Active Profile` ✨' : '`Standard Sandbox Level` 🔒'}`
                )
                .setColor('#f1c40f');
            return await interaction.editReply({ embeds: [statsEmbed] });
        }

        if (interaction.commandName === 'myperformance') {
            await interaction.deferReply({ ephemeral: true });
            const { count } = await supabase.from('task_logs').select('*', { count: 'exact', head: true }).eq('user_id', interaction.user.id);
            const { data: sub } = await supabase.from('user_subscriptions').select('expires_at, trial_uses').eq('user_id', interaction.user.id).maybeSingle();
            const uses = sub ? (sub.trial_uses || 0) : 0;
            const isPremium = sub && sub.expires_at && new Date(sub.expires_at) >= new Date();

            const perfEmbed = new EmbedBuilder()
                .setTitle('📈 Your System Ledger Performance')
                .setDescription(
                    `👤 **Operator ID:** <@${interaction.user.id}>\n` +
                    `🔍 **Your Complete Logged Inquiries:** \`${count || 0}\` tasks matched\n` +
                    `⏳ **Free Allocations Expended:** \`${uses}/2\` trial uses\n` +
                    `🛡️ **System Priority:** ${isPremium ? '`Premium Pipeline Core` ✅' : '`Restricted Authorization` 🛑'}`
                )
                .setColor('#3498db');
            return await interaction.editReply({ embeds: [perfEmbed] });
        }
    }

    // --- SECTION B: BUTTON INTERACTION HANDLERS ---
    if (!interaction.isButton()) return;

    // STAGE 1 & 2: LOADING AND TIMER PROTECTION
    if (interaction.customId === 'funnel_step_1_start') {
        await interaction.reply({ content: '⚙️ *TaskVault is processing your registration parameters. Syncing databank nodes...*', ephemeral: true });
        await interaction.channel.sendTyping();
        await sleep(10000);

        const noticeEmbed = new EmbedBuilder()
            .setTitle('⚠️ CRITICAL COMPLIANCE NOTICE: Read everything below.')
            .setDescription(`Welcome to the TaskVault Ecosystem.\n\n⏳ *Security parsing active. Compliance unlock options initializing in 20 seconds.*`)
            .setColor('#ff3333');

        await interaction.followUp({ embeds: [noticeEmbed], ephemeral: true });
        await sleep(20000);

        const readyEmbed = new EmbedBuilder()
            .setTitle('⚠️ CRITICAL COMPLIANCE NOTICE: Read everything below.')
            .setDescription(`Welcome to the TaskVault Ecosystem.\n\n✅ *Compliance parsing complete. You may now advance to the rules segment.*`)
            .setColor('#ff3333');

        const rulesRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('funnel_step_2_rules').setLabel('⚖️ Advance to Operational Rules').setStyle(ButtonStyle.Primary)
        );
        await interaction.editReply({ embeds: [readyEmbed], components: [rulesRow] });
    }

    // STAGE 3: THE RULES LAYOUT
    if (interaction.customId === 'funnel_step_2_rules') {
        const { data: sub } = await supabase.from('user_subscriptions').select('trial_uses, expires_at').eq('user_id', interaction.user.id).maybeSingle();
        const uses = sub ? (sub.trial_uses || 0) : 0;
        const isPremium = sub && sub.expires_at && new Date(sub.expires_at) >= new Date();

        let rulesText = 
            `1️⃣ **Single Identity Framework:** Do not combine multiple Discord accounts into one single JumpTask extraction link.\n` +
            `2️⃣ **Automation Controls:** Do not implement unverified system plugins beside the TaskVault search engine.\n` +
            `3️⃣ **Query Sanitization:** Avoid repetitive submission queries to avoid database strain.\n\n` +
            `🚨 **WARNING:** Failing to comply with these baseline values can result in direct JumpTask system limits.\n\n`;

        if (isPremium) {
            rulesText += 
                `💡 **PRO-TIPS UNLOCKED (Premium Asset Core Available):**\n` +
                `• 🚀 **Peak Windows:** Submit high-tier micro-tasks between 12 AM and 4 AM UTC to reduce allocation congestion.\n` +
                `• 💸 **Node Splitting:** Host JumpTask bandwidth processes across two isolated IP targets to compound rewards safely.\n` +
                `• 🛡️ **Cache Clears:** Clean out local storage vectors before logging automated matching processes.`;
        } else {
            rulesText += `💡 **PRO-TIPS LOCK:**\nPro-Tips are currently LOCKED. These are highly guarded tips made by the Admin to maximize your earnings. They will automatically unlock when you purchase a subscription.`;
        }

        const rulesEmbed = new EmbedBuilder()
            .setTitle('⚖️ Core System Rules & Parameter Compliance')
            .setDescription(rulesText)
            .setColor('#d63031');

        const navigationRow = new ActionRowBuilder();
        if (!isPremium && uses < 2) {
            navigationRow.addComponents(
                new ButtonBuilder().setCustomId('gateway_activate_trial').setLabel('🚀 Start Free Trial (2 Searches)').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('gateway_premium_portal').setLabel('💳 Purchase Subscription').setStyle(ButtonStyle.Danger)
            );
        } else {
            navigationRow.addComponents(
                new ButtonBuilder().setCustomId('gateway_premium_portal').setLabel('💳 Purchase Subscription').setStyle(ButtonStyle.Danger)
            );
        }
        await interaction.reply({ embeds: [rulesEmbed], components: [navigationRow], ephemeral: true });
    }

    // STAGE 4: FREE TRIAL PROCESSING
    if (interaction.customId === 'gateway_activate_trial') {
        const { data: sub } = await supabase.from('user_subscriptions').select('trial_uses').eq('user_id', interaction.user.id).maybeSingle();
        const uses = sub ? (sub.trial_uses || 0) : 0;
        if (uses >= 2) return await interaction.reply({ content: '❌ **Trial Complete.** Please advance to the Premium Entry portal.', ephemeral: true });
        return await interaction.reply({ content: `🎉 **Trial Initialized.** You possess exactly **${2 - uses} free database searches** remaining. Proceed to <#${GOOGLETASK_CHANNEL_ID}>!`, ephemeral: true });
    }

    // THE 3 SUBSCRIPTION OPTIONS PORTAL
    if (interaction.customId === 'gateway_premium_portal') {
        const portalEmbed = new EmbedBuilder()
            .setTitle('💳 TaskVault Tier Authorization Portal')
            .setDescription(`Select your preferred route below:\n\n🪙 **Option 1:** Crypto Checkout (QR/Manual)\n📤 **Option 2:** Earn Via Uploads (Crowdsourcing)\n🔗 **Option 3:** Affiliate Referrals (JumpTask)`)
            .setColor('#6c5ce7');

        const portalRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tier_crypto_view').setLabel('🪙 Option 1: Crypto Checkout').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tier_upload_loop').setLabel('📤 Option 2: Earn Via Uploads').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tier_referral_view').setLabel('🔗 Option 3: Affiliate Referral').setStyle(ButtonStyle.Success)
        );
        await interaction.reply({ embeds: [portalEmbed], components: [portalRow], ephemeral: true });
    }

    // 🪙 OPTION 1: CRYPTO MATRIX
    if (interaction.customId === 'tier_crypto_view') {
        const cryptoEmbed = new EmbedBuilder()
            .setTitle('🪙 Crypto Network Direct Gateway')
            .setDescription(`📌 **Terminal EVM Wallet Target:**\n\`${WALLET_ADDRESS}\` *(Click to auto-copy)*\n\n👇 **Select an Asset / Access Duration Package:**`)
            .setColor('#f1c40f');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('qr_package_1d').setLabel('1 Day').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_2d').setLabel('2 Days').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_4d').setLabel('4 Days').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_7d').setLabel('7 Days').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_14d').setLabel('14 Days').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('qr_package_30d').setLabel('30 Days').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_any').setLabel('✨ Custom Amount QR').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('crypto_open_ticket').setLabel('🎫 I Have Sent Payment').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [cryptoEmbed], components: [row1, row2], ephemeral: true });
    }

    if (interaction.customId.startsWith('qr_package_')) {
        const responseEmbed = new EmbedBuilder().setColor('#f39c12').setTitle(`📊 QR Template Package`).setDescription(`Scan via your primary decentralized wallet application.`);
        return await interaction.reply({ embeds: [responseEmbed], content: `📁 *[PLACEHOLDER LINK TO YOUR UPLOADED QR IMAGE]*`, ephemeral: true });
    }

    if (interaction.customId === 'crypto_open_ticket') {
        const ticketChannel = await interaction.guild.channels.create({
            name: `🎫-ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });
        const controlEmbed = new EmbedBuilder().setTitle('🎫 Verification & Support').setDescription(`Provide your tx hash string values, screenshots, or questions here.`).setColor('#2ecc71');
        const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ embeds: [controlEmbed], components: [closeRow] });
        return await interaction.reply({ content: `✅ Ticket built successfully: <#${ticketChannel.id}>`, ephemeral: true });
    }

    // 📤 OPTION 2: EARN VIA UPLOADS
    if (interaction.customId === 'tier_upload_loop') {
        const uploadChannel = await interaction.guild.channels.create({
            name: `📤-upload-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const uploadEmbed = new EmbedBuilder()
            .setTitle('📤 Crowdsourced Submission Pipeline')
            .setDescription(`Upload images, videos, and text to secure free passes.\n\n📊 **Reward Scale:**\n* 5 New Tasks = 2 Days Free\n* 8 New Tasks = 4 Days Free\n* 40 Existing/Standard Tasks = Subscription Granted\n\n🚫 **WARNING:** Do not send similar or duplicate tasks.`)
            .setColor('#3498db');
            
        const uploadControlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('✅ Grant Sub & Close').setStyle(ButtonStyle.Success)
        );
        await uploadChannel.send({ embeds: [uploadEmbed], components: [uploadControlRow] });
        return await interaction.reply({ content: `✅ Submissions workspace created: <#${uploadChannel.id}>`, ephemeral: true });
    }

    // 🔗 OPTION 3: AFFILIATE REFERRAL
    if (interaction.customId === 'tier_referral_view') {
        const referralChannel = await interaction.guild.channels.create({
            name: `🔗-referral-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const refEmbed = new EmbedBuilder()
            .setTitle('🔗 Strategic Affiliate Integration')
            .setDescription(`If you don't have crypto yet, not a problem! You can still have premium. Use our referral to get free access for 4 days.\n\n1️⃣ Use Link: ${REFERRAL_LINK}\n2️⃣ Or Code: \`${REFERRAL_CODE}\`\n\nRegister or paste the code into the bonus field, and upload a screen recording of you doing it below.`)
            .setColor('#2ecc71');
            
        const refControlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('✅ Verify & Close Channel').setStyle(ButtonStyle.Success)
        );
        await referralChannel.send({ embeds: [refEmbed], components: [refControlRow] });
        return await interaction.reply({ content: `✅ Referral pipeline channel constructed: <#${referralChannel.id}>`, ephemeral: true });
    }

    // --- 100% MANUAL DESTRUCTION LOGIC ---
    if (interaction.customId === 'ticket_admin_close_trigger') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ System error: Access restricted.', ephemeral: true });
        }

        return await interaction.reply({
            content: '🚨 **Warning: Critical Destruction Sequence**\nAre you sure you want to completely delete and close this channel? (Yes/No)',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_yes_delete').setLabel('🔴 Yes, Delete').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('confirm_no_abort').setLabel('🟢 No, Cancel').setStyle(ButtonStyle.Success)
                )
            ],
            ephemeral: true
        });
    }

    if (interaction.customId === 'confirm_yes_delete') {
        await interaction.reply({ content: '⚙️ Destruction sequence confirmed. Closing channel...' });
        await sleep(2000);
        return await interaction.channel.delete().catch(() => {});
    }

    if (interaction.customId === 'confirm_no_abort') {
        return await interaction.reply({ content: '✅ Destruction sequence aborted. Channel kept open.', ephemeral: true });
    }
});

// --- ENGINE BACKUP DEPLOYMENT ---
const http = require('http');
http.createServer((req, res) => res.end('TaskVault Engine Matrix V2.0 Core Active.')).listen(process.env.PORT || 3000);
client.login(process.env.DISCORD_TOKEN);
