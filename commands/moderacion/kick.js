const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logToChannel = require('../../utils/logToChannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un usuario del barrio.')
    .addUserOption(option =>
      option.setName('usuario').setDescription('El objetivo de la expulsión').setRequired(true))
    .addStringOption(option =>
      option.setName('razon').setDescription('¿Por qué lo echamos?').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: '[X] Solo se puede expulsar dentro del servidor.', flags: 64 });
    }

    const member = interaction.options.getMember('usuario');
    const reason = interaction.options.getString('razon') || 'Sin motivo especificado';

    if (!member) {
        return interaction.reply({ content: '[X] No se pudo encontrar a ese miembro en el servidor.', flags: 64 });
    }

    if (!member.kickable) {
      return interaction.reply({ content: '[X] No tengo permisos suficientes para expulsar a este usuario.', flags: 64 });
    }

    try {
        await member.kick(reason);

        const embed = new EmbedBuilder()
          .setTitle('SISTEMA DE SEGURIDAD: EXPULSION')
          .setDescription(`**${member.user.tag}** ha sido echado del servidor.`)
          .addFields({ name: 'Motivo', value: `\`${reason}\`` })
          .setColor('Orange')
          .setFooter({ text: 'Sistema CDR - Registro de Sanciones' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        await logToChannel(interaction.guild, {
          title: 'LOG DE EXPULSION',
          fields: [
            { name: 'Objetivo', value: `<@${member.id}>`, inline: true },
            { name: 'Moderador', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Razon', value: reason }
          ],
          color: 'Orange'
        });
    } catch (err) {
        console.error('Error en Kick:', err);
        await interaction.reply({ content: '[!] ERROR: Algo fallo al intentar expulsar al usuario.', flags: 64 });
    }
  }
};
