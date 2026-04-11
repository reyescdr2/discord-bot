const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Muestra la latencia del bot con precisión quirúrgica.'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: '[...] Sincronizando datos...', fetchReply: true, flags: 64 });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setTitle('ESTADO DE LA CONEXION')
      .addFields(
        { name: 'Respuesta del Servidor', value: `\`${latency}ms\``, inline: true },
        { name: 'Latencia de la API', value: `\`${Math.round(interaction.client.ws.ping)}ms\``, inline: true }
      )
      .setColor('#5865F2')
      .setFooter({ text: 'Sistema CDR - En linea' })
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
