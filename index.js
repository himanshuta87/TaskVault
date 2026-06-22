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
        
        // Simulating the 10-second active pipeline build sequence
        await interaction.channel.sendTyping();
        await sleep(10000);

        const noticeEmbed = new EmbedBuilder()
            .setTitle('⚠️ CRITICAL COMPLIANCE NOTICE: Read everything below.')
            .setDescription(`Welcome to the TaskVault Ecosystem.\n\n[YOUR NORMAL GREETING & INFORMATION GOES HERE - YOU CAN FREELY PASTE AND EDIT THIS SPACE WITH YOUR SPECIFIC USER DETAILS LATER]\n\n⏳ *Security parsing active. Compliance unlock options initializing in 20 seconds.*`)
            .setColor('#ff3333');

        const initialSetupMsg = await interaction.followUp({ embeds: [noticeEmbed], ephemeral: true });

        // Enforcing the 20-second reading verification barrier
        await sleep(20000);

        const readyEmbed = new EmbedBuilder()
            .setTitle('⚠️ CRITICAL COMPLIANCE NOTICE: Read everything below.')
            .setDescription(`Welcome to the TaskVault Ecosystem.\n\n[YOUR NORMAL GREETING & INFORMATION GOES HERE - YOU CAN FREELY PASTE AND EDIT THIS SPACE WITH YOUR SPECIFIC USER DETAILS LATER]\n\n✅ *Compliance parsing complete. You may now advance to the rules segment.*`)
            .setColor('#ff3333');

        const rulesRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('funnel_step_2_rules').setLabel('⚖️ Advance to Operational Rules').setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({ embeds: [readyEmbed], components: [rulesRow] });
    }

    // STAGE 3: THE RULES LAYOUT & PRO-TIPS WARNING BLOCKS
    if (interaction.customId === 'funnel_step_2_rules') {
        const rulesEmbed = new EmbedBuilder()
            .setTitle('⚖️ Core System Rules & Parameter Compliance')
            .setDescription(
                `[YOUR NORMAL REVENUE PROTOCOLS AND PLATFORM RULES GO HERE - FILL THIS CELL LATER]\n\n` +
                `🚨 **REDUNDANTLY CRITICAL WARNING:**\n` +
                `If you do not follow these parameters explicitly, you will highly likely receive a prompt **PERMANENT BAN FROM JUMPTASK** due to anti-cheat system matching.\n\n` +
                `💡 **PRO-TIPS LOCK CONFIGURATION:**\n` +
                `*Pro-Tips are currently locked inside your layout.* These are highly guarded strategies compiled directly by the system Administrator to maximize verification payouts. **These configurations unlock completely upon purchasing a Premium Subscription pass.**`
            )
            .setColor('#d63031');

        // Check if user has already run free trial to display proper buttons
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
            return await interaction.reply({ content: '❌ **Sandbox Usage Complete.** Your sandbox profile has already used its free credits. Please advance to the Premium Entry portal.', ephemeral: true });
        }

        return await interaction.reply({ 
            content: `🎉 **Sandbox Framework Initialized.** You possess exactly **${2 - uses} free database searches** remaining. Proceed directly to <#${GOOGLETASK_CHANNEL_ID}> to run queries!`, 
            ephemeral: true 
        });
    }

    // THE 3 SUBSCRIPTION ACCESS SELECTION PANELS
    if (interaction.customId === 'gateway_premium_portal') {
        const portalEmbed = new EmbedBuilder()
            .setTitle('💳 TaskVault Tier Authorization Portal')
            .setDescription(
                `Select your preferred structural gateway route below to authorize your active premium user file:\n\n` +
                `🪙 **Option 1: Direct Crypto Route**\n` +
                `Process secure checkout manually or use instant automated tracking QR matrices across BNB, JMPT, SOL networks.\n\n` +
                `📤 **Option 2: Crowdsource Data Extraction**\n` +
                `Mine new verified data and map missing configurations to earn standard day passes entirely free.\n\n` +
                `🔗 **Option 3: Affiliate Referral Pipelines**\n` +
                `TaskVault speaks: If you do not have active crypto allocations yet, not a problem! You can easily leverage our affiliate referral loop to earn a 4-day premium pass instantly.`
            )
            .setColor('#6c5ce7');

        const portalRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tier_crypto_view').setLabel('🪙 Option 1: Crypto Checkout').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('tier_upload_loop').setLabel('📤 Option 2: Earn Via Uploads').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('tier_referral_view').setLabel('🔗 Option 3: Affiliate Referral').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [portalEmbed], components: [portalRow], ephemeral: true });
    }

    // OPTION 1: CRYPTO MANAGEMENT INTEGRATION
    if (interaction.customId === 'tier_crypto_view') {
        const cryptoEmbed = new EmbedBuilder()
            .setTitle('🪙 Crypto Network Direct Gateway')
            .setDescription(
                `You may complete your transaction manually by copying our corporate EVM network terminal block, or instantly utilize your mobile scanning wallet to map any of our automated asset packages.\n\n` +
                `📌 **Terminal EVM Wallet Target:**\n\`${WALLET_ADDRESS}\` *(Click to auto-copy on mobile)*\n\n` +
                `👇 **Select an Asset / Access Duration Package to pull your payment QR parameters:**`
            )
            .setColor('#f1c40f');

        const qrTierSelectorRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('qr_package_1d').setLabel('1 Day Pass').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_2d').setLabel('2 Day Pass').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_4d').setLabel('4 Day Pass').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_7d').setLabel('7 Day Pass').setStyle(ButtonStyle.Secondary)
        );
        const qrTierSelectorRow2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('qr_package_14d').setLabel('14 Day Pass').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_30d').setLabel('30 Day Pass').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('qr_package_any').setLabel('✨ Open/Custom Amount QR').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('crypto_open_ticket').setLabel('🎫 I Have Sent Payment').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [cryptoEmbed], components: [qrTierSelectorRow, qrTierSelectorRow2], ephemeral: true });
    }

    // SUB-LOGIC: SERVING QR SELECTIONS STATIC FILE STORAGE PATHS
    if (interaction.customId.startsWith('qr_package_')) {
        const selectedTier = interaction.customId.split('_')[2];
        const responseEmbed = new EmbedBuilder().setColor('#f39c12');
        
        if (selectedTier === 'any') {
            responseEmbed.setTitle('✨ Open Network Custom Allocation QR')
                .setDescription(`Scan this specific signature code template to manually declare your own transaction payload amount directly to wallet destination \`${WALLET_ADDRESS}\`.`);
        } else {
            responseEmbed.setTitle(`📊 Automated ${selectedTier.toUpperCase()} Package Tracking QR`)
                .setDescription(`This QR auto-encrypts your target address registry and set pricing parameter context for the **${selectedTier} premium authorization plan**.\n\n*Scan via your primary decentralized wallet application to confirm.*`);
        }
        
        // Return context layout holding your static image attachments mapping
        return await interaction.reply({ embeds: [responseEmbed], content: `📁 *[PLACEHOLDER LINK TO YOUR UPLOADED QR_IMAGE_FOR_${selectedTier.toUpperCase()} HERE]*`, ephemeral: true });
    }

    // SUB-LOGIC: PRIVATE CRYPTO TICKET HANDLERS
    if (interaction.customId === 'crypto_open_ticket') {
        const ticketChannel = await interaction.guild.channels.create({
            name: `🎫-ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const controlEmbed = new EmbedBuilder()
            .setTitle('🎫 Billing Payment Verification Ticket')
            .setDescription(`Hello <@${interaction.user.id}>. Provide your tx hash string values or copy-paste verification pictures directly here for staff verification processing.`)
            .setColor('#2ecc71');

        const closeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('🔒 Close & Vanish Ticket Channel').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [controlEmbed], components: [closeRow] });
        return await interaction.reply({ content: `✅ Ticket channel built successfully. Complete validation steps here: <#${ticketChannel.id}>`, ephemeral: true });
    }

    // OPTION 2: EARN VIA UPLOADS (CROWDSOURCING HIDDEN MATRIX)
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
            .setTitle('📤 Crowdsourced Submission Pipeline Workspace')
            .setDescription(
                `Welcome to your data logging vault. You can upload media assets, screen recordings, or type textual text data rows to secure free manual day-passes.\n\n` +
                `🚨 **REWARD STRUCTURE SCALE METRICS:**\n` +
                `*   **5 New Databank Additions:** Receive 2 Days Free Premium Tier Access.\n` +
                `*   **8 New Databank Additions:** Receive 4 Days Free Premium Tier Access.\n` +
                `*   **40 Standard/Existing Verification Syncs:** Full Platform Subscription Pass Granted.\n\n` +
                `🚫 **COMPLIANCE ALERT MATRIX:**\n` +
                `Do not attempt to resubmit matching data profiles or clone media graphics. All operations checked manually by staff systems.\n\n` +
                `👇 *Staff verification engines handle configurations below:*`
            )
            .setColor('#3498db');

        const uploadControlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('upload_grant_and_close').setLabel('✅ Grant Subscription & Evaporate Channel').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('❌ Reject & Terminate Channel').setStyle(ButtonStyle.Danger)
        );

        await uploadChannel.send({ embeds: [uploadEmbed], components: [uploadControlRow] });
        return await interaction.reply({ content: `✅ Submissions workspace created. Access room: <#${uploadChannel.id}>`, ephemeral: true });
    }

    // THE FINAL YES/NO DESTRUCTION TERMINATOR INTERCEPTORS
    if (interaction.customId.startsWith('confirm_yes_')) {
        await interaction.reply({ content: '⚙️ *Destruction authorization sequence confirmed. Channel clearing from active registry...*' });
        await sleep(2000);
        return await interaction.channel.delete().catch(() => {});
    }

            .setColor('#2ecc71');

        const refControlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('upload_grant_and_close').setLabel('✅ Verify Video & Grant 4 Days Access').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_admin_close_trigger').setLabel('❌ Deny & Close Room').setStyle(ButtonStyle.Danger)
        );

        await referralChannel.send({ embeds: [refEmbed], components: [refControlRow] });
        return await interaction.reply({ content: `✅ Referral pipeline channel constructed. Access room here: <#${referralChannel.id}>`, ephemeral: true });
    }

    // ADMINISTRATIVE WORKSPACE MUTATION DELETION CONFIRMATIONS (YES/NO PROTECTION LABELS)
    if (interaction.customId === 'ticket_admin_close_trigger' || interaction.customId === 'upload_grant_and_close') {
        if (!interaction.member.permissions.has('Administrator')) {
            return await interaction.reply({ content: '❌ System error: Access block restricted to Administrative clear tokens.', ephemeral: true });
        }

        const actionType = interaction.customId;
        const verificationEmbed = new EmbedBuilder()
            .setTitle('🚨 Warning: Critical Destruction Sequence Flagged')
            .setDescription('Are you completely sure you want to finalize this action and vanish this active room workspace channel completely from the network?')
            .setColor('#e74c3c');

        const verificationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`confirm_yes_${actionType}`).setLabel('🔴 Yes, Confirm Termination').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('confirm_no_abort').setLabel('🟢 No, Abort Sequence').setStyle(ButtonStyle.Success)
        );

        return await interaction.reply({ embeds: [verificationEmbed], components: [verificationRow], ephemeral: true });
    }

    // THE FINAL YES/NO DESTRUCTION TERMINATOR INTERCEPTORS
    if (interaction.customId.startsWith('confirm_yes_')) {
        const actionContext = interaction.customId.replace('confirm_yes_', '');
        
        if (actionContext === 'upload_grant_and_close') {
            // Locate user context from current channel mapping and auto grant parameters
            const targetLogsId = interaction.channel.name.split('-')[2];
            const foundUser = interaction.guild.members.cache.find(m => m.user.username.toLowerCase() === targetLogsId.toLowerCase());
            
            if (foundUser) {
                const expiresAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(); // Defaulting automated award baseline parameters
                await supabase.from('user_subscriptions').upsert({ user_id: foundUser.id, expires_at: expiresAt, trial_uses: 2 });
                const billingTracker = interaction.guild.channels.cache.get(BILLING_LOGS_ID);
                if (billingTracker) {
                    billingTracker.send(`📤 **Crowdsource Verification Matrix Sync:** Granted access tracking parameters to user <@${foundUser.id}> via media crowdsourcing verification data.`);
                }
            }
        }

        await interaction.reply({ content: '⚙️ *Destruction authorization sequence confirmed. Channel clearing from active registry...*' });
        await sleep(2000);
        return await interaction.channel.delete().catch(() => {});
    }

    if (interaction.customId === 'confirm_no_abort') {
        return await interaction.reply({ content: '✅ *Destruction sequence aborted successfully. Target channel preserved.*', ephemeral: true });
    }
});

// --- ENGINE STABILITY BACKUP DEPLOYMENT CONFIGURATIONS ---
const http = require('http');
http.createServer((req, res) => res.end('TaskVault Engine Matrix V2.0 Core Active.')).listen(process.env.PORT || 3000);

client.login(process.env.DISCORD_TOKEN);

process.on('unhandledRejection', (reason, promise) => { console.error('⚠️ Core Matrix Failure Caught at:', promise, 'Reason:', reason); });
process.on('uncaughtException', (err, origin) => { console.error('⚠️ Internal Exception Intercepted:', err, 'Origin Location:', origin); });
