const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const GuildSettings = require('../models/GuildSettings');
const config = require('../config');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    if (mongoose.connection.readyState !== 1) return;

    const settings = await GuildSettings.findOne({ guildId: member.guild.id });
    if (!settings?.farewellChannelId) return;

    const channel = member.guild.channels.cache.get(settings.farewellChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setColor('#FF4136')
      .setTimestamp()
      .setFooter({ text: `Sistema CDR - Salida del Servidor`, iconURL: member.guild.iconURL({ dynamic: true }) });

    if (settings.farewellImageUrl) embed.setImage(settings.farewellImageUrl);


    await channel.send({ 
        content: `👋 **Adiós, ${member.user.username}.** Te esperamos de vuelta.`, 
        embeds: [embed] 
    }).catch((e) => console.error('Error enviando despedida:', e));

  }
};

