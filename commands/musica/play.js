const { SlashCommandBuilder } = require('discord.js');
const music = require('../lib/music');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce música de YouTube usando motor local de alta calidad.')
    .addStringOption(option =>
      option.setName('busqueda')
        .setDescription('Nombre de la canción o URL')
        .setRequired(true)
        .setAutocomplete(true)),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    if (!focusedValue) return interaction.respond([]);
    
    // Buscar videos para las sugerencias
    const searchResults = await music.searchTracks(focusedValue);
    
    try {
        await interaction.respond(
            searchResults.map(video => ({
                name: `${video.author.slice(0, 25)} - ${video.title.slice(0, 50)} - ${video.duration}`.slice(0, 100),
                value: video.title,
            }))
        );
    } catch (error) {
        if (error.code !== 10062) console.error('[Autocomplete Play Error]', error);
    }
  },

  async execute(interaction) {
    // TEMPORAL: Desactivado para evitar cierres en Railway
    return interaction.reply({ 
        content: '🎶 **Comando Desactivado:** La música ha sido inhabilitada temporalmente porque estamos en servidores gratuitos limitados. ¡Pronto volveremos a encender el estéreo!', 
        ephemeral: true 
    });

    const query = interaction.options.getString('busqueda');
    await interaction.deferReply();

    try {
        await music.startPlayback(query, interaction);
    } catch (error) {
        interaction.editReply('❌ Se produjo un error al intentar reproducir la música.').catch(() => {});
    }
  },
};
