const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const GuildSettings = require('../models/GuildSettings');


module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;

    if (mongoose.connection.readyState !== 1) return;

    const settings = await GuildSettings.findOne({ guildId: newMessage.guild.id });
    if (!settings?.logChannelId) return;

    const logChannel = newMessage.guild.channels.cache.get(settings.logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('✏️ Mensaje Editado')
      .addFields(
        { name: 'Usuario', value: `${newMessage.author.tag}`, inline: true },
        { name: 'Canal', value: `${newMessage.channel}`, inline: true },
        { name: 'Antes', value: oldMessage.content || '*[Sin contenido]*' },
        { name: 'Después', value: newMessage.content || '*[Sin contenido]*' }
      )
      .setTimestamp()
      .setColor('Orange')
      .setFooter({ text: 'Registro de Ediciones | CDR' });


    logChannel.send({ embeds: [embed] });
  }
};
