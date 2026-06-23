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
const WALLET_ADDRESS = '0x777B89324A3dE1581f0070DE948d19DC7497d147';
const REFERRAL_LINK = 'https://www.jumptask.io/r/wodarajysedi';
const REFERRAL_CODE = 'wodarajysedi';

client.once('ready', () => {
    console.log(`🚀 TaskVault V2 Core Engine Fully Online.`);
});

// --- TIMER HELPER FUNCTION ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- SYSTEM TRIGGERS ---
    if (message.content === '!poststart') {
        if (!message.member.permissions.has('Administrator')) return;

        const startEmbed = new EmbedBuilder()
            .setTitle('🤖 Welcome to TaskVault System Control')
            .setDescription('Your ultimate automation hub for bypassing micro-task grinds and scaling your earnings instantly.\n\n➡️ **Click the button below to initiate your system onboarding configuration layout.**')
            .setColor('#5865F2');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('funnel_step_1_start').setLabel('🚀 Initialize TaskVault Onboarding').setStyle(ButtonStyle.Success)
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
            return message.reply(`❌ User <@${targetUser.id}> does not possess an active premium tier profile configuration.`);
        }
        const timeLeft = new Date(sub.expires_at) - new Date();
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        return message.reply(`💳 **Subscription Manifest:** <@${targetUser.id}> has **${daysLeft} active authorization days** remaining on their account file.`);
    }

    if (message.content.startsWith('!revokesub')) {
        if (!message.member.permissions.has('Administrator')) return;
        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply('❌ Please mention a valid target profile network block.');

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
            return message.reply('🛑 **Access Boundary Reached.** Your 2 free trial queries have been thoroughly exhausted. Please access the start menu platform settings to configure a full operational access pass.');
        }

        await message.channel.sendTyping();
        const answer = await searchDatabase(userQuery);

        if (answer) {
            await supabase.from('task_logs').insert([{ user_id: message.author.id, question: userQuery }]);

            if (!isPremium) {
                const newTrialCount = trialCount + 1;
                await supabase.from('user_subscriptions').upsert({ user_id: message.author.id, trial_uses: newTrialCount });

                const trialEmbed = new EmbedBuilder()
                    .setColor('#e67e22')
                    .setTitle('🔍 Task Located (Free Sandbox Runtime)')
                    .setDescription(`**Question:** ${userQuery}\n\n**Verified Solution:** ${answer}`)
                    .setFooter({ text: `TaskVault Sandbox System — Profile Credits Used: ${newTrialCount}/2` });
                
                await message.reply({ embeds: [trialEmbed] });
                if (newTrialCount >= 2) {
                    await message.channel.send(`<@${message.author.id}> ⚠️ **Sandbox runtime metrics completely utilized.** Access limits enforced. Please acquire standard subscription parameters to continue extraction.`);
                }
            } else {
                const premiumEmbed = new EmbedBuilder()
                    .setColor('#00ffcc')
                    .setTitle('🔍 Solution Match Found')
                    .setDescription(`**Question:** ${userQuery}\n\n**Verified Solution:** ${answer}`)
                    .setFooter({ text: 'TaskVault Databank Operational Nodes' });
                await message.reply({ embeds: [premiumEmbed] });
            }
        } else {
            await message.reply({ content: '⏳ **This query signature is updating now.** The tracking team has been dispatched.' });
            const diagnosticsRoom = message.guild.channels.cache.get(UNANSWERED_CHANNEL_ID);
            if (diagnosticsRoom) {
                diagnosticsRoom.send(`❓ **Unresolved Databank Signature**\nUser Context: <@${message.author.id}>\nString Data: \`${userQuery}\``);
            }
        }
    }
});


// --- COMPONENT INTERACTION GATEWAY CONTROLLER ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // STAGE 1 & 2: LOADING, GREETINGS AND TYPING DELAY WRAPPERS
    if (interaction.customId === 'funnel_step_1_start') {
        await interaction.reply({ content: '⚙️ *TaskVault is processing your registration parameters. Syncing databank nodes...*', ephemeral: true });
        
        await interaction.channel.sendTyping();
        await sleep(10000);

        const noticeEmbed = new EmbedBuilder()
            .setTitle('⚠️ CRITICAL COMPLIANCE NOTICE: Read everything below.')
            .setDescription(`Welcome to the TaskVault Ecosystem.\n\n[YOUR NORMAL GREETING & INFORMATION GOES HERE]\n\n⏳ *Security parsing active. Compliance unlock options initializing in 20 seconds.*`)
            .setColor('#ff3333');

        await interaction.followUp({ embeds: [noticeEmbed], ephemeral: true });

        await sleep(20000);

        const readyEmbed = new EmbedBuilder()
            .setTitle('⚠️ CRITICAL COMPLIANCE NOTICE: Read everything below.')
            .setDescription(`Welcome to the TaskVault Ecosystem.\n\n[YOUR NORMAL GREETING & INFORMATION GOES HERE]\n\n✅ *Compliance parsing complete. You may now advance to the rules segment.*`)
            .setColor('#ff3333');

        const rulesRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('funnel_step_2_rules').setLabel('⚖️ Advance to Operational Rules').setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({ embeds: [readyEmbed], components: [rulesRow] });
    }

    // STAGE 3: THE RULES LAYOUT
    if (interaction.customId === 'funnel_step_2_rules') {
        const rulesEmbed = new EmbedBuilder()
            .setTitle('⚖️ Core System Rules & Parameter Compliance')
            .setDescription(
                `[YOUR RULES GO HERE]\n\n` +
                `🚨 **REDUNDANTLY CRITICAL WARNING:**\nIf you do not follow these parameters explicitly, you will highly likely receive a prompt **PERMANENT BAN FROM JUMPTASK**.\n\n` +
                `💡 **PRO-TIPS LOCK CONFIGURATION:**\n*Pro-Tips unlock completely upon purchasing a Premium Subscription pass.*`
            )
            .setColor('#d63031');

        const { data: sub } = await supabase.from('user_subscriptions').select('trial_uses, expires_at').eq('user_id', interaction.user.id).maybeSingle();
        const uses = sub ? (sub.trial_uses || 0) : 0;
        const isPremium = sub && sub.expires_at && new Date(sub.expires_at) >= new Date();

        const navigationRow = new ActionRowBuilder();

        if (!isPremium && uses < 2) {
            navigationRow.addComponents(
                new ButtonBuilder().setCustomId('gateway_activate_trial').setLabel('🚀 Start Free Sandbox Trial (2 Tasks)').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('gateway_premium_portal').setLabel('💳 Premium Access Portal').setStyle(ButtonStyle.Danger)
            );
        } else {
            navigationRow.addComponents(
                new ButtonBuilder().setCustomId('gateway_premium_portal').setLabel('💳 Purchase Premium Subscription').setStyle(ButtonStyle.Danger)
            );
        }

        await interaction.reply({ embeds: [rulesEmbed], components: [navigationRow], ephemeral: true });
    }

    // STAGE 4: FREE TRIAL PROCESSING MATRIX
    if (interaction.customId === 'gateway_activate_trial') {
        const { data: sub } = await supabase.from('user_subscriptions').select('trial_uses').eq('user_id', interaction.user.id).maybeSingle();
        const uses = sub ? (sub.trial_uses || 0) : 0;

        if (uses >= 2) {
            return await interaction.reply({ content: '❌ **Sandbox Usage Complete.** Please advance to the Premium Entry portal.', ephemeral: true });
        }

        return await interaction.reply({ 
            content: `🎉 **Sandbox Framework Initialized.** You possess exactly **${2 - uses} free database searches** remaining. Proceed directly to <#${GOOGLETASK_CHANNEL_ID}>!`, 
            ephemeral: true 
        });
    }

    // SUBSCRIPTION PORTAL
    if (interaction.customId === 'gateway_premium_portal') {
        const portalEmbed = new EmbedBuilder()
            .setTitle('💳 TaskVault Tier Authorization Portal')
            .setDescription(`Select your preferred route below:\n\n🪙 **Option 1: Crypto Checkout**\n📤 **Option 2: Earn Via Uploads**\n🔗 **Option 3: Affiliate Referral Pipelines**`)
            .setColor('#6c5ce7');

        const portalRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tier_crypto_view').setLabel('🪙 Option 1: Crypto Checkout').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tier_upload_loop').setLabel('📤 Option 2: Earn Via Uploads').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tier_referral_view').setLabel('🔗 Option 3: Affiliate Referral').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [portalEmbed], components: [portalRow], ephemeral: true });
    }

    // CRYPTO VIEW
    if (interaction.customId === 'tier_crypto_view') {
        const cryptoEmbed = new EmbedBuilder()
            .setTitle('🪙 Crypto Network Direct Gateway')
            .setDescription(`📌 **Terminal EVM Wallet Target:**\n\`${WALLET_ADDRESS}\`\n\n👇 **Select an Asset / Access Duration Package:**`)
            .setColor('#f1c40f');

        const qrTierSelectorRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('qr_package_1d').setLabel('1 Day Pass').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_4d').setLabel('4 Day Pass').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_any').setLabel('✨ Custom Amount QR').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('crypto_open_ticket').setLabel('🎫 I Have Sent Payment').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [cryptoEmbed], components: [qrTierSelectorRow], ephemeral: true });
    }

    if (interaction.customId.startsWith('qr_package_')) {
        const selectedTier = interaction.customId.split('_')[2];
        const responseEmbed = new EmbedBuilder().setColor('#f39c12')
            .setTitle(`📊 QR Template Package`)
            .setDescription(`Scan via your primary decentralized wallet application.`);
        return await interaction.reply({ embeds: [responseEmbed], content: `📁 *[PLACEHOLDER LINK TO YOUR UPLOADED QR IMAGE]*`, ephemeral: true });
    }

    // TICKET CREATION LOGIC (FIXED PERMISSIONS ERROR)
    if (interaction.customId === 'crypto_open_ticket') {
        const ticketChannel = await interaction.guild.channels.create({
            name: `🎫-ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const controlEmbed = new EmbedBuilder().setTitle('🎫 Payment Verification').setDescription(`Provide your tx hash string values or screenshots here.`).setColor('#2ecc71');
        const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('🔒 Close & Vanish Ticket').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ embeds: [controlEmbed], components: [closeRow] });
        return await interaction.reply({ content: `✅ Ticket built successfully: <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (interaction.customId === 'tier_upload_loop') {
        const uploadChannel = await interaction.guild.channels.create({
            name: `📤-upload-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const uploadEmbed = new EmbedBuilder().setTitle('📤 Crowdsourced Submission Pipeline').setDescription(`Upload data to secure free passes.`).setColor('#3498db');
        const uploadControlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('upload_grant_and_close').setLabel('✅ Verify & Close Channel').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('❌ Reject & Terminate').setStyle(ButtonStyle.Danger)
        );
        await uploadChannel.send({ embeds: [uploadEmbed], components: [uploadControlRow] });
        return await interaction.reply({ content: `✅ Submissions workspace created: <#${uploadChannel.id}>`, ephemeral: true });
    }

    if (interaction.customId === 'tier_referral_view') {
        const referralChannel = await interaction.guild.channels.create({
            name: `🔗-referral-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const refEmbed = new EmbedBuilder().setTitle('🔗 Strategic Affiliate Integration').setDescription(`1️⃣ Use Link: ${REFERRAL_LINK}\n2️⃣ Or Code: \`${REFERRAL_CODE}\`\n3️⃣ Upload proof below.`).setColor('#2ecc71');
        const refControlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('upload_grant_and_close').setLabel('✅ Verify & Close Channel').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('❌ Deny & Close Room').setStyle(ButtonStyle.Danger)
        );
        await referralChannel.send({ embeds: [refEmbed], components: [refControlRow] });
        return await interaction.reply({ content: `✅ Referral pipeline channel constructed: <#${referralChannel.id}>`, ephemeral: true });
    }

    // --- CLEAN DESTRUCTION LOGIC (NO AUTO GRANT, PERFECT SYNTAX) ---
    if (interaction.customId === 'ticket_admin_close_trigger' || interaction.customId === 'upload_grant_and_close') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ System error: Access restricted.', ephemeral: true });
        }

        return await interaction.reply({
            content: '🚨 **Warning: Critical Destruction Sequence Flagged**\nAre you sure you want to completely vanish this workspace channel from the server?',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_yes_delete').setLabel('🔴 Yes, Confirm Termination').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('confirm_no_abort').setLabel('🟢 No, Abort Sequence').setStyle(ButtonStyle.Success)
                )
            ],
            ephemeral: true
        });
    }

    if (interaction.customId === 'confirm_yes_delete') {
        await interaction.reply({ content: '⚙️ Destruction authorization sequence confirmed. Channel clearing from active registry...' });
        await sleep(2000);
        return await interaction.channel.delete().catch(() => {});
    }

    if (interaction.customId === 'confirm_no_abort') {
        return await interaction.reply({ content: '✅ Destruction sequence aborted successfully. Channel preserved.', ephemeral: true });
    }
});

// --- ENGINE STABILITY BACKUP DEPLOYMENT CONFIGURATIONS ---
const http = require('http');
http.createServer((req, res) => res.end('TaskVault Engine Matrix V2.0 Core Active.')).listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);

process.on('unhandledRejection', (reason, promise) => { console.error('⚠️ Core Matrix Failure Caught at:', promise, 'Reason:', reason); });
process.on('uncaughtException', (err, origin) => { console.error('⚠️ Internal Exception Intercepted:', err, 'Origin Location:', origin); });
