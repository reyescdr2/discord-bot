const { SlashCommandBuilder } = require('discord.js');
const music = require('../lib/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa la música actual.'),
  async execute(interaction) {
    const queue = music.queues.get(interaction.guildId);
    if (!queue || !queue.playing) return interaction.reply({ content: '❌ No hay música sonando ahora mismo.', ephemeral: true });

    queue.player.pause();
    return await interaction.reply('⏸️ Música pausada.');
  }
};
