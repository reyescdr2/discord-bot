const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logToChannel = require('../../utils/logToChannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un usuario del barrio de forma permanente.')
    .addUserOption(option =>
      option.setName('usuario').setDescription('El objetivo del baneo').setRequired(true))
    .addStringOption(option =>
      option.setName('razon').setDescription('¿Por qué lo echamos?').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({ content: '[X] Los baneos solo se pueden realizar dentro del servidor.', flags: 64 });
    }

    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || 'Sin motivo especificado';

    try {
      await interaction.deferReply({ flags: 64 });
      
      await interaction.guild.members.ban(user.id, { reason }).catch(err => { throw err; });

      const embed = new EmbedBuilder()
        .setTitle('SISTEMA DE SEGURIDAD: BANEO')
        .setDescription(`**${user.tag}** ha sido expulsado permanentemente del servidor.`)
        .addFields({ name: 'Motivo', value: `\`${reason}\`` })
        .setColor('Red')
        .setFooter({ text: 'Sistema CDR - Registro de Sanciones' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      await logToChannel(interaction.guild, {
        title: 'LOG DE BANEO',
        fields: [
          { name: 'Objetivo', value: `<@${user.id}>`, inline: true },
          { name: 'Moderador', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Razon', value: reason }
        ],
        color: 'Red'
      });

    } catch (err) {
      console.error('Error en Ban:', err);
      const errorMsg = { content: `[!] ERROR: No pude completar el baneo de ${user.tag}. Revisa los permisos de mi rol.`, flags: 64 };
      if (interaction.deferred) await interaction.editReply(errorMsg);
      else await interaction.reply(errorMsg);
    }
  }
};
