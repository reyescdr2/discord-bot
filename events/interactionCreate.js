const { InteractionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../models/Ticket');
const config = require('../config');
const { logToFile } = require('../utils/logger');
const music = require('../commands/lib/music');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const { client } = interaction;

        // 🔍 DEBUG: Log de todas las interacciones
        logToFile(`Interaccion Recibida: ${interaction.type} | ID: ${interaction.id} | User: ${interaction.user.username}`, 'DEBUG');

        // 1. Autocompletado (Sugerencias en vivo)
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                if (typeof command.autocomplete === 'function') {
                    await command.autocomplete(interaction);
                } else {
                    await interaction.respond([]).catch(() => {});
                }
            } catch (error) {
                if (error.code !== 10062) console.error('Error Autocomplete:', error);
            }
            return;
        }

        // 2. Manejo de Botones (Música, NSFW y TICKETS)
        if (interaction.isButton()) {
            try {
                // --- BOTONES DE MÚSICA ---
                if (interaction.customId.startsWith('music_')) {
                    const queue = music.queues.get(interaction.guildId);
                    if (!queue) return interaction.reply({ content: '❌ No hay música sonando ahora mismo.', ephemeral: true });

                    if (interaction.customId === 'music_pause') {
                        if (queue.player.state.status === 'paused') {
                            queue.player.unpause();
                        } else {
                            queue.player.pause();
                        }
                        return await interaction.update({ components: music.getRows(queue.player.state.status === 'paused') });
                    }
                    if (interaction.customId === 'music_skip') {
                        queue.player.stop();
                        return await interaction.deferUpdate();
                    }
                    if (interaction.customId === 'music_previous') {
                        const success = await music.previousTrack(interaction.guildId);
                        if (!success) return interaction.reply({ content: '🚫 No hay historial anterior.', ephemeral: true });
                        return await interaction.deferUpdate();
                    }
                    if (interaction.customId === 'music_replay') {
                        await interaction.deferUpdate();
                        await music.replayTrack(interaction.guildId);
                        return;
                    }
                    return;
                }

                // --- BOTONES DE TICKETS ---
                if (interaction.customId === 'ticket_open') {
                    await interaction.deferReply({ ephemeral: true });

                    const ticketConfig = await Ticket.findOne({ guildId: interaction.guild.id });
                    if (!ticketConfig || !ticketConfig.settings.enabled) {
                        return interaction.editReply({ content: '❌ El sistema de tickets está desactivado.' });
                    }

                    // Verificar si el usuario ya tiene un ticket abierto
                    const hasTicket = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
                    if (hasTicket) {
                        return interaction.editReply({ content: `⚠️ Ya tienes un ticket abierto en ${hasTicket}.` });
                    }

                    // Incrementar contador de tickets
                    ticketConfig.settings.lastTicketCount += 1;
                    await ticketConfig.save();

                    const ticketNumber = ticketConfig.settings.lastTicketCount.toString().padStart(4, '0');
                    const channelName = `ticket-${interaction.user.username}`;

                    const overrides = [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                    ];

                    // Agregar todos los roles de staff configurados
                    if (ticketConfig.settings.staffRoleIds && ticketConfig.settings.staffRoleIds.length > 0) {
                        ticketConfig.settings.staffRoleIds.forEach(roleId => {
                            overrides.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
                        });
                    }

                    const ticketChannel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: ticketConfig.settings.categoryId || null,
                        permissionOverwrites: overrides
                    });

                    const ticketEmbed = new EmbedBuilder()
                        .setTitle(`🎫 TICKET DE SOPORTE #${ticketNumber}`)
                        .setDescription(`Hola ${interaction.user}, el equipo de soporte te atenderá en breve.\n\n` +
                            `Mientras tanto, por favor explica tu problema detalladamente.`)
                        .addFields({ name: 'Usuario', value: interaction.user.tag, inline: true })
                        .setColor('#F1C40F')
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_close')
                            .setLabel('Cerrar Ticket')
                            .setEmoji('🔒')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
                    return interaction.editReply({ content: `✅ Ticket creado correctamente: ${ticketChannel}` });
                }

                if (interaction.customId === 'ticket_close') {
                    await interaction.reply({ content: '🔒 **Cerrando ticket...** El canal se eliminará en 5 segundos.' });
                    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
                }

                // --- BOTONES DE NSFW (Mapeo a Comandos) ---
                if (interaction.customId.startsWith('r34_next:') || interaction.customId.startsWith('r34gif_next:') || interaction.customId === 'waifu_next') {
                    const cmdName = interaction.customId.startsWith('r34gif') ? 'r34gif' : (interaction.customId.startsWith('r34_next') ? 'rule34' : 'waifus');
                    const command = client.commands.get(cmdName);
                    if (command) {
                        try {
                            return await command.execute(interaction);
                        } catch (err) {
                            if (err.code !== 10062 && err.code !== 40060) {
                                logToFile(`Error Ejecutando Botón ${cmdName}: ${err.message}`, 'ERROR');
                            }
                        }
                    }
                }
            } catch (e) {
                if (e.code !== 10062 && e.code !== 40060) {
                    logToFile(`Error Botón: ${e}`, 'ERROR');
                    console.error('Error Botón:', e);
                }
            }
            return;
        }
        
        // 2.2 Manejo de Menús de Selección (Roles de Tickets, Auto-Roles, Asignación Manual)
        if (interaction.isAnySelectMenu()) {
            const guildId = interaction.guild.id;

            // 🎫 CONFIGURACIÓN ROLES TICKETS
            if (interaction.customId === 'ticket_roles_setup') {
                await interaction.deferUpdate();
                const Ticket = require('../models/Ticket');
                const ticketConfig = await Ticket.findOne({ guildId });
                if (ticketConfig) {
                    ticketConfig.settings.staffRoleIds = interaction.values;
                    await ticketConfig.save();

                    // --- GENERAR Y ENVIAR EL PANEL DE SOPORTE AUTOMÁTICAMENTE ---
                    const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
                    const config = require('../config');

                    const panelEmbed = new EmbedBuilder()
                        .setTitle('📩 CENTRO DE SOPORTE CDR')
                        .setDescription('¿Necesitas ayuda? Pulsa el botón de abajo para abrir un ticket de soporte.\n\n' +
                            '⚠️ **Recuerda:** Sé paciente, el staff te atenderá lo antes posible.\n' +
                            '🚫 **Abuso:** El mal uso de los tickets puede resultar en sanción.')
                        .setColor('#00FF7F')
                        .setThumbnail(interaction.guild.iconURL())
                        .setFooter({ text: 'Sistema de Soporte CDR 👑', iconURL: config.ICON_URL || null });

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_open')
                            .setLabel('Abrir Ticket')
                            .setEmoji('🎫')
                            .setStyle(ButtonStyle.Success)
                    );

                    // Enviamos el panel al canal actual
                    await interaction.channel.send({ embeds: [panelEmbed], components: [row] });

                    return interaction.editReply({ 
                        content: `✅ **¡Configuración Completa y Panel Enviado!**\nLos roles seleccionados (${interaction.values.length}) ya tienen permisos de staff.`,
                        components: [] 
                    });
                }
            }

            // 👤 CONFIGURACIÓN AUTO-ROLES
            if (interaction.customId === 'autorole_setup') {
                await interaction.deferUpdate();
                const GuildSettings = require('../models/GuildSettings');
                let settings = await GuildSettings.findOne({ guildId });
                if (settings) {
                    settings.autoRoleIds = interaction.values;
                    await settings.save();
                    return interaction.editReply({ 
                        content: `✅ **Auto-Roles Guardados!**\nLos nuevos usuarios recibirán ${interaction.values.length} roles al entrar.`,
                        components: [] 
                    });
                }
            }

            // 🎭 ASIGNACIÓN MANUAL DE ROLES (/addroleuser)
            if (interaction.customId.startsWith('role_add_user_')) {
                await interaction.deferUpdate();
                const targetUid = interaction.customId.replace('role_add_user_', '');
                try {
                    const member = await interaction.guild.members.fetch(targetUid);
                    if (!member) throw new Error('Usuario no encontrado.');

                    // Filtrar roles que el bot NO puede dar (evitar errores de jerarquía)
                    const rolesToSet = interaction.values;
                    await member.roles.set(rolesToSet);

                    return interaction.editReply({ 
                        content: `✅ **Roles actualizados correctamente para <@${targetUid}>!**\nSe han aplicado ${rolesToSet.length} roles.`,
                        components: [] 
                    });
                } catch (e) {
                    return interaction.editReply({ content: `❌ **Error al asignar roles:** ${e.message}`, components: [] });
                }
            }

            return;
        }

        // 3. Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            let resolvedChannel = interaction.channel;
            if (!resolvedChannel && interaction.channelId) {
                try { resolvedChannel = await client.channels.fetch(interaction.channelId); } catch (e) {}
            }

            try {
                logToFile(`[Slash] /${interaction.commandName} | Usuario: ${interaction.user.username} | Guild: ${interaction.guild?.name || 'DM'}`, 'CMD');
                await command.execute(interaction, resolvedChannel);
            } catch (error) {
                logToFile(`Error Ejecucion /${interaction.commandName}: ${error}`, 'ERROR');
                let message = 'Error critico en el bloque del Malandro.';
                if (error.name === 'MongooseError') message = '❌ Error de Base de Datos.';
                const msg = { content: message, flags: 64 };
                if (interaction.replied || interaction.deferred) await interaction.editReply(msg).catch(() => {});
                else await interaction.reply(msg).catch(() => {});
            }
        }
    }
};
