const { SlashCommandBuilder } = require('discord.js');
const music = require('../lib/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Reanuda la música pausada.'),
  async execute(interaction) {
    const queue = music.queues.get(interaction.guildId);
    if (!queue || !queue.playing) return interaction.reply({ content: '❌ No hay música sonando ahora mismo.', ephemeral: true });

    queue.player.unpause();
    return await interaction.reply('▶️ Música reanudada.');
  }
};
