const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
const GuildSettings = require('../../models/GuildSettings');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Panel de control: Configura las funciones del bot CDR.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('logs')
                .setDescription('Canal para registros de auditoria.')
                .addChannelOption(ch => ch.setName('canal').setDescription('Canal de logs').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('bienvenida')
                .setDescription('Canal para mensajes de bienvenida.')
                .addChannelOption(ch => ch.setName('canal').setDescription('Canal de bienvenida').setRequired(true))
                .addAttachmentOption(opt => opt.setName('imagen').setDescription('Sube una imagen desde tu galeria'))
                .addStringOption(opt => opt.setName('archivo').setDescription('Vinculo de imagen (PNG/JPG/GIF URL)'))
        )
        .addSubcommand(sub =>
            sub.setName('despedida')
                .setDescription('Canal para mensajes de despedida.')
                .addChannelOption(ch => ch.setName('canal').setDescription('Canal de despedida').setRequired(true))
                .addAttachmentOption(opt => opt.setName('imagen').setDescription('Sube una imagen desde tu galeria'))
                .addStringOption(opt => opt.setName('archivo').setDescription('Vinculo de imagen (PNG/JPG/GIF URL)'))
        )
        .addSubcommand(sub =>
            sub.setName('anti-delete')
                .setDescription('Registro de mensajes borrados.')
                .addBooleanOption(opt => opt.setName('estado').setDescription('¿Activar sistema?').setRequired(true))
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal de logs anti-delete').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('nsfw')
                .setDescription('Comandos para adultos.')
                .addBooleanOption(opt => opt.setName('estado').setDescription('¿Activar comandos NSFW?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('autoplay')
                .setDescription('Reproduccion automatica de musica.')
                .addBooleanOption(opt =>
                    opt.setName('estado')
                        .setDescription('¿Activar autoplay?')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('tickets')
                .setDescription('Configuracion global del sistema de soporte.')
                .addBooleanOption(opt => opt.setName('estado').setDescription('¿Activar sistema de tickets?').setRequired(true))
                .addChannelOption(opt => opt.setName('categoria').setDescription('Categoria donde se crearan los tickets').addChannelTypes(require('discord.js').ChannelType.GuildCategory).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('musica')
                .setDescription('Configura un canal dedicado para musica (auto-play).')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal de musica').addChannelTypes(require('discord.js').ChannelType.GuildText).setRequired(true))
                .addBooleanOption(opt => opt.setName('estado').setDescription('¿Activar auto-play en este canal?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('autorole')
                .setDescription('Configura los roles que se dan automaticamente al entrar.')
                .addBooleanOption(opt => opt.setName('estado').setDescription('¿Activar auto-roles?').setRequired(true))
        ),

    async execute(interaction) {
        if (!interaction.guild) return interaction.reply({ content: '[X] Los ajustes solo se pueden realizar en servidores.', flags: 64 });
        
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        await interaction.deferReply({ flags: 64 });

        if (mongoose.connection.readyState !== 1) {
            return interaction.editReply({ 
                content: '[!] Error de Base de Datos: La conexion esta caida.', 
                flags: 64
            });
        }

        let settings = await GuildSettings.findOne({ guildId }) || new GuildSettings({ guildId });

        let description = '';
        if (sub === 'logs') {
            const channel = interaction.options.getChannel('canal');
            settings.logChannelId = channel.id;
            description = `Canal de auditoria configurado en ${channel}.`;
        } else if (sub === 'bienvenida') {
            const channel = interaction.options.getChannel('canal');
            const imageUrl = interaction.options.getString('archivo');
            const attachment = interaction.options.getAttachment('imagen');
            const finalImage = attachment ? attachment.url : imageUrl;

            settings.welcomeChannelId = channel.id;
            if (finalImage) settings.welcomeImageUrl = finalImage;
            
            description = `Mensajes de bienvenida activados en ${channel}.${finalImage ? `\nImagen personalizada cargada correctamente.` : ''}`;
        } else if (sub === 'despedida') {
            const channel = interaction.options.getChannel('canal');
            const imageUrl = interaction.options.getString('archivo');
            const attachment = interaction.options.getAttachment('imagen');
            const finalImage = attachment ? attachment.url : imageUrl;

            settings.farewellChannelId = channel.id;
            if (finalImage) settings.farewellImageUrl = finalImage;
            
            description = `Mensajes de despedida activados en ${channel}.${finalImage ? `\nImagen personalizada cargada correctamente.` : ''}`;
        } else if (sub === 'anti-delete') {
            const state = interaction.options.getBoolean('estado');
            const channel = interaction.options.getChannel('canal');
            settings.antiDeleteEnabled = state;
            if (channel) settings.antiDeleteChannelId = channel.id;
            description = `Sistema de registro de borrado: ${state ? 'ACTIVADO' : 'DESACTIVADO'}${channel ? ` en el canal ${channel}` : ''}.`;
        } else if (sub === 'nsfw') {
            const state = interaction.options.getBoolean('estado');
            settings.nsfwEnabled = state;
            description = `Contenido para adultos: ${state ? 'PERMITIDO (Solo en canales NSFW)' : 'BLOQUEADO'}.`;
        } else if (sub === 'chatbot') {
            const state = interaction.options.getBoolean('estado');
            const channel = interaction.options.getChannel('canal');
            settings.chatbotEnabled = state;
            settings.chatbotChannelId = channel.id;
            description = `Interaccion IA: ${state ? 'ACTIVADA' : 'DESACTIVADA'} en el canal ${channel}.`;
        } else if (sub === 'autoplay') {
            const state = interaction.options.getBoolean('estado');
            settings.autoplayEnabled = state;

            const music = require('../lib/music');
            music.autoplayEnabled = state;

            description = `Reproduccion automatica de musica: ${state
                ? 'ACTIVADA (pondre canciones similares al terminar)'
                : 'DESACTIVADA'}`;
        } else if (sub === 'tickets') {
            const Ticket = require('../../models/Ticket');
            let ticketConfig = await Ticket.findOne({ guildId }) || new Ticket({ guildId });
            const state = interaction.options.getBoolean('estado');
            ticketConfig.settings.enabled = state;
            await ticketConfig.save();
            description = `Sistema de Tickets: ${state ? 'ACTIVADO (Usa /ticket para configurarlo)' : 'DESACTIVADO'}.`;
        } else if (sub === 'musica') {
            const state = interaction.options.getBoolean('estado');
            const channel = interaction.options.getChannel('canal');

            settings.musicChannelId = state ? channel.id : null;
            description = `Canal de Musica Dedicado: ${state ? `Configurado en ${channel}. Ahora cualquier mensaje aqui sera una cancion.` : 'DESACTIVADO'}`;
        } else if (sub === 'autorole') {
            const state = interaction.options.getBoolean('estado');
            const { ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');

            settings.automodEnabled = true; // Aseguramos que los settings existen
            // Si el estado es false, simplemente desactivamos
            if (!state) {
                settings.autoRoleIds = [];
                description = 'Sistema de Auto-Role: DESACTIVADO.';
            } else {
                const roleMenu = new RoleSelectMenuBuilder()
                    .setCustomId('autorole_setup')
                    .setPlaceholder('Selecciona los roles para nuevos miembros...')
                    .setMinValues(1)
                    .setMaxValues(10);

                const row = new ActionRowBuilder().addComponents(roleMenu);

                return interaction.editReply({ 
                    content: `👤 **Sistema de Auto-Role iniciado.**\n\n👇 **Selecciona los roles que quieres dar automáticamente a los nuevos usuarios:**`,
                    components: [row]
                });
            }
        }

        await settings.save();

        const embed = new EmbedBuilder()
            .setTitle('CONFIGURACION CDR ACTUALIZADA')
            .setDescription(`[OK] ${description}`)
            .setColor('#5865F2')
            .setFooter({ text: `Sistema CDR - Panel de Control`, iconURL: config.ICON_URL })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
