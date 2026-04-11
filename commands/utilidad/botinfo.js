const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Muestra las estadísticas internas del bot CDR.'),
  async execute(interaction) {
    const totalSeconds = (interaction.client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const seconds = Math.floor(totalSeconds % 60);

    const embed = new EmbedBuilder()
      .setTitle('ESTADO DEL SISTEMA CDR')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { name: 'Nombre del Bot', value: `\`${interaction.client.user.tag}\``, inline: true },
        { name: 'Libreria', value: `\`Discord.js v${version}\``, inline: true },
        { name: 'Memoria en Uso', value: `\`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\``, inline: true },
        { name: 'Tiempo Activo', value: `\`${days}d ${hours}h ${minutes}m ${seconds}s\``, inline: false },
        { name: 'Sistema Operativo', value: `\`${os.platform()} (${os.arch()})\``, inline: true },
        { name: 'Version Node', value: `\`${process.version}\``, inline: true }
      )
      .setColor('#5865F2')
      .setFooter({ text: 'Sistema CDR - Operativo' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
