const { SlashCommandBuilder } = require('discord.js');
const music = require('../lib/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta a la siguiente cancion en la cola.'),
  async execute(interaction) {
    const queue = music.queues.get(interaction.guildId);
    if (!queue || !queue.playing) return interaction.reply({ content: '❌ No hay música sonando ahora mismo.', ephemeral: true });

    queue.player.stop(); // Esto dispara el evento Idle y pasa a la siguiente automáticamente en music.js
    return await interaction.reply('⏭️ Canción saltada.');
  }
};
