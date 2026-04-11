const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logToChannel = require('../../utils/logToChannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Retira el baneo a un usuario del barrio.')
    .addStringOption(option =>
      option.setName('id').setDescription('ID del usuario a desbanear').setRequired(true))
    .addStringOption(option =>
      option.setName('razon').setDescription('¿Por qué lo perdonamos?').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const userId = interaction.options.getString('id');
    const reason = interaction.options.getString('razon') || 'Sin motivo especificado';

    try {
      await interaction.deferReply({ flags: 64 });
      
      await interaction.guild.members.unban(userId, reason);

      const embed = new EmbedBuilder()
        .setTitle('SISTEMA DE SEGURIDAD: BAN RETIRADO')
        .setDescription(`El usuario con ID **${userId}** ha sido readmitido en el servidor.`)
        .addFields({ name: 'Motivo del Desban', value: `\`${reason}\`` })
        .setColor('Blue')
        .setFooter({ text: 'Sistema CDR - Registro de Sanciones' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      await logToChannel(interaction.guild, {
        title: 'LOG DE UNBAN',
        fields: [
          { name: 'Objetivo (ID)', value: userId, inline: true },
          { name: 'Moderador', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Razon', value: reason }
        ],
        color: 'Blue'
      });

    } catch (err) {
      console.error('Error en Unban:', err);
      const errorMsg = { content: `[!] ERROR: No se pudo retirar el baneo. Verifica la ID y el estado del usuario.`, flags: 64 };
      if (interaction.deferred) await interaction.editReply(errorMsg);
      else await interaction.reply(errorMsg);
    }
  }
};
