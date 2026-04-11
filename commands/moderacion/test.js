const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mongoose = require('mongoose');
const GuildSettings = require('../../models/GuildSettings');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Comandos de prueba para administradores del barrio.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('bienvenida')
                .setDescription('Simula una entrada triunfal.')
        )
        .addSubcommand(sub =>
            sub.setName('despedida')
                .setDescription('Simula una salida del barrio.')
        ),
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        
        if (!interaction.guild) return interaction.reply({ content: '[X] Los tests solo funcionan en servidores.', flags: 64 });

        if (mongoose.connection.readyState !== 1) {
            return interaction.reply({ 
                content: '[!] Error: No se pueden realizar pruebas sin base de datos activa.', 
                flags: 64 
            });
        }

        const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
        const member = interaction.member;

        if (sub === 'bienvenida') {
            if (!settings?.welcomeChannelId) {
                return interaction.reply({ content: '[X] Configura primero el canal con /setup bienvenida.', flags: 64 });
            }

            const channel = interaction.guild.channels.cache.get(settings.welcomeChannelId);
            if (!channel) return interaction.reply({ content: '[X] El canal ya no existe.', flags: 64 });

            const welcomeImage = settings.welcomeImageUrl || process.env.WELCOME_IMAGE || member.user.displayAvatarURL({ dynamic: true, size: 1024 });

            const embed = new EmbedBuilder()
                .setTitle('SISTEMA DE PRUEBA: BIENVENIDA')
                .setDescription(`[!] TEST: Bienvenido/a al servidor, ${member}. Preparando todo para tu llegada.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setImage(welcomeImage)
                .setColor('#00FF7F')
                .addFields(
                  { name: 'Usuario', value: `\`${member.user.tag}\``, inline: true },
                  { name: 'Miembro Nro.', value: `\`#${interaction.guild.memberCount}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Sistema CDR - Modo de Prueba`, iconURL: config.ICON_URL });

            await channel.send({ embeds: [embed] });
            return interaction.reply({ content: '[OK] Se ha enviado la prueba de bienvenida.', flags: 64 });

        } else if (sub === 'despedida') {
            if (!settings?.farewellChannelId) {
                return interaction.reply({ content: '[X] Configura primero el canal con /setup despedida.', flags: 64 });
            }

            const channel = interaction.guild.channels.cache.get(settings.farewellChannelId);
            if (!channel) return interaction.reply({ content: '[X] El canal ya no existe.', flags: 64 });

            const embed = new EmbedBuilder()
                .setTitle('SISTEMA DE PRUEBA: DESPEDIDA')
                .setDescription(`[!] TEST: ${member.user.username} ha salido. Esperamos que vuelva pronto.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setColor('#FF4500')
                .setTimestamp()
                .setFooter({ text: `Sistema CDR - Modo de Prueba`, iconURL: config.ICON_URL });

            if (settings.farewellImageUrl) embed.setImage(settings.farewellImageUrl);

            await channel.send({ embeds: [embed] });
            return interaction.reply({ content: '[OK] Se ha enviado la prueba de despedida.', flags: 64 });
        }
    },
};
