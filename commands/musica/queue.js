const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const music = require('../lib/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la cola de reproducción actual.'),
  async execute(interaction) {
    const queue = music.queues.get(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay música sonando ahora mismo.', ephemeral: true });

    const currentTrack = queue.playing;
    
    const embed = new EmbedBuilder()
      .setTitle(`Cola de Reproducción - ${interaction.guild.name}`)
      .setColor('#1DB954')
      .setTimestamp();

    let description = '';
    
    if (currentTrack) {
        description += `**Reproduciendo ahora:**\n[${currentTrack.title}](${currentTrack.url})\n\n`;
    }

    if (queue.tracks.length > 0) {
        description += `**Siguientes en la cola:**\n`;
        const items = queue.tracks.map((track, i) => `${i + 1}. [${track.title}](${track.url})`).join('\n').slice(0, 1800);
        description += items;
    } else if (!currentTrack) {
        description = 'La cola está vacía.';
    }

    embed.setDescription(description);

    return await interaction.reply({ embeds: [embed] });
  }
};
