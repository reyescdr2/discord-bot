const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logToChannel = require('../../utils/logToChannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Silencia a un usuario del barrio (Timeout).')
    .addUserOption(option =>
      option.setName('usuario').setDescription('El objetivo del silencio').setRequired(true))
    .addIntegerOption(option =>
      option.setName('tiempo')
        .setDescription('Duración del silencio')
        .setRequired(true)
        .addChoices(
          { name: '60 Segundos', value: 60 * 1000 },
          { name: '5 Minutos', value: 5 * 60 * 1000 },
          { name: '10 Minutos', value: 10 * 60 * 1000 },
          { name: '1 Hora', value: 60 * 60 * 1000 },
          { name: '1 Día', value: 24 * 60 * 60 * 1000 },
          { name: '1 Semana', value: 7 * 24 * 60 * 60 * 1000 }
        ))
    .addStringOption(option =>
      option.setName('razon').setDescription('¿Por qué lo callamos?').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const duration = interaction.options.getInteger('tiempo');
    const reason = interaction.options.getString('razon') || 'Sin motivo especificado';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '[X] No se pudo encontrar a ese usuario en el servidor.', flags: 64 });
    }

    if (!member.moderatable) {
      return interaction.reply({ content: '[X] No tengo permisos suficientes para silenciar a este usuario.', flags: 64 });
    }

    try {
      await interaction.deferReply({ flags: 64 });
      
      await member.timeout(duration, reason);

      const embed = new EmbedBuilder()
        .setTitle('SISTEMA DE SEGURIDAD: SILENCIO')
        .setDescription(`**${user.tag}** ha sido silenciado temporalmente.`)
        .addFields(
          { name: 'Duracion', value: `\`${interaction.options.get('tiempo').name}\``, inline: true },
          { name: 'Razon', value: `\`${reason}\``, inline: true }
        )
        .setColor('Yellow')
        .setFooter({ text: 'Sistema CDR - Registro de Sanciones' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      await logToChannel(interaction.guild, {
        title: 'LOG DE SILENCIO',
        fields: [
          { name: 'Objetivo', value: `<@${user.id}>`, inline: true },
          { name: 'Moderador', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Razon', value: reason }
        ],
        color: 'Yellow'
      });

    } catch (err) {
      console.error('Error en Mute:', err);
      const errorMsg = { content: `[!] ERROR: No se pudo aplicar el silencio.`, flags: 64 };
      if (interaction.deferred) await interaction.editReply(errorMsg);
      else await interaction.reply(errorMsg);
    }
  }
};
