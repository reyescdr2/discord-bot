const { SlashCommandBuilder } = require('discord.js');
const nsfw = require('../lib/nsfw');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('r34gif')
    .setDescription('🎬 Motor dual (Rule34+Gelbooru) especializado en GIFs y Videos.')
    .addStringOption(option => 
      option.setName('busqueda')
        .setDescription('¿Qué GIFs buscamos? (Si no pones nada será random)')
        .setRequired(false)
        .setAutocomplete(true)
    ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        if (!focusedValue) return interaction.respond([]);

        try {
            const url = `https://gelbooru.com/index.php?page=dapi&s=tag&q=index&json=1&name_pattern=%${encodeURIComponent(focusedValue)}%`;
            const auth = (process.env.GELBOORU_API_KEY && process.env.GELBOORU_USER_ID) 
                ? `&api_key=${process.env.GELBOORU_API_KEY}&user_id=${process.env.GELBOORU_USER_ID}` 
                : '';

            const resp = await axios.get(url + auth, { 
                timeout: 4000, 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0'
                }
            }).catch(() => null);

            if (!resp || !resp.data) return interaction.respond([]);
            const data = resp.data;
            let choices = Array.isArray(data) ? data : (data.tag ? (Array.isArray(data.tag) ? data.tag : [data.tag]) : []);

            if (choices.length > 0) {
                await interaction.respond(
                    choices.slice(0, 25).map(tag => ({ 
                        name: `${tag.name} (${tag.count || 0})`.slice(0, 100), 
                        value: tag.name 
                    }))
                );
            } else {
                await interaction.respond([]);
            }
        } catch (e) {
            const { logToFile } = require('../../utils/logger');
            logToFile(`[Autocomplete] Error en r34gif: ${e.message}`, 'ERROR');
            await interaction.respond([]).catch(() => {});
        }
    },

    async execute(interaction) {
        let query;
        if (interaction.isButton()) {
            query = interaction.customId.split(':')[1];
        } else {
            query = interaction.options.getString('busqueda');
        }
        
        await nsfw.sendRule34(query, interaction, { isGif: true, isUpdate: interaction.isButton() });
    },
};
