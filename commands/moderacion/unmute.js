const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logToChannel = require('../../utils/logToChannel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Retira el silencio a un usuario del barrio.')
    .addUserOption(option =>
      option.setName('usuario').setDescription('El objetivo a perdonar').setRequired(true))
    .addStringOption(option =>
      option.setName('razon').setDescription('¿Por qué le devolvemos la voz?').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || 'Sin motivo especificado';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.reply({ content: '[X] No se pudo encontrar a ese usuario en el servidor.', flags: 64 });
    }

    try {
      await interaction.deferReply({ flags: 64 });
      
      await member.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setTitle('SISTEMA DE SEGURIDAD: SILENCIO RETIRADO')
        .setDescription(`**${user.tag}** ya no tiene restricciones de voz.`)
        .addFields({ name: 'Razon del Perdon', value: `\`${reason}\`` })
        .setColor('Green')
        .setFooter({ text: 'Sistema CDR - Registro de Sanciones' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      await logToChannel(interaction.guild, {
        title: 'LOG DE UNMUTE',
        fields: [
          { name: 'Objetivo', value: `<@${user.id}>`, inline: true },
          { name: 'Moderador', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Razon', value: reason }
        ],
        color: 'Green'
      });

    } catch (err) {
      console.error('Error en Unmute:', err);
      const errorMsg = { content: `[!] ERROR: No se pudo retirar el silencio.`, flags: 64 };
      if (interaction.deferred) await interaction.editReply(errorMsg);
      else await interaction.reply(errorMsg);
    }
  }
};
