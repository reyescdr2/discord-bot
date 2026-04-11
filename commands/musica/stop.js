const { SlashCommandBuilder } = require('discord.js');
const music = require('../lib/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene la musica y limpia la cola.'),
  async execute(interaction) {
    const queue = music.queues.get(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ No hay música sonando ahora mismo.', ephemeral: true });

    queue.tracks = [];
    queue.player.stop();
    if(queue.connection) queue.connection.destroy();
    music.queues.delete(interaction.guildId);

    return await interaction.reply('⏹️ Música detenida y cola limpiada.');
  }
};
