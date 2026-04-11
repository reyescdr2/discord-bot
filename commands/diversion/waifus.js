const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('waifus')
    .setDescription('🌸 Invoca una waifu aleatoria del multiverso anime.'),

  async execute(interaction) {
    if (interaction.isButton()) {
        await interaction.deferUpdate().catch(() => {});
    } else {
        await interaction.deferReply().catch(() => {});
    }

    try {
        const response = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 6000 });
        const data = response.data;

        if (!data || !data.url) {
            return await interaction.editReply({ content: '❌ No se pudo encontrar una waifu en este momento, intenta de nuevo.' });
        }

        const embed = new EmbedBuilder()
            .setTitle('💖 TU WAIFU HA LLEGADO')
            .setImage(data.url)
            .setColor('#FF69B4')
            .setFooter({ text: 'Sistema CDR • /waifus' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('waifu_next')
                .setLabel('🔄 Siguiente')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel('🔗 Original')
                .setURL(data.url)
                .setStyle(ButtonStyle.Link)
        );

        await interaction.editReply({ 
            content: null,
            embeds: [embed], 
            components: [row] 
        });

    } catch (e) {
        console.error('Error Waifus:', e.message);
        await interaction.editReply({ content: '⚠️ El servicio de waifus está saturado. Reintenta en unos segundos.' });
    }
  },
};
