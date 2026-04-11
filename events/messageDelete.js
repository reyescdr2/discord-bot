const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const GuildSettings = require('../models/GuildSettings');


module.exports = {
  name: 'messageDelete',
  async execute(message) {
    // 🛡️ EXCEPCIÓN DEL CREADOR: No loguear mensajes borrados por reyescdr
    if (message.author?.username === 'reyescdr' || message.author?.id === process.env.OWNER_ID) return;

    // Si el bot mismo borra algo, ignorar
    if (message.author?.bot) return;

    // Ignorar si no hay gremio o si la DB no está lista
    if (!message.guild || mongoose.connection.readyState !== 1) return;

    const settings = await GuildSettings.findOne({ guildId: message.guild.id });
    if (!settings?.antiDeleteEnabled) return;

    const targetChannelId = settings.antiDeleteChannelId || settings.logChannelId;
    if (!targetChannelId) return;

    const logChannel = message.guild.channels.cache.get(targetChannelId);
    if (!logChannel) return;

    // 🔍 MANEJO DE PARCIALES: Si el mensaje es parcial, no tenemos el autor ni el contenido
    if (message.partial) {
        const partialEmbed = new EmbedBuilder()
            .setTitle('🗑️ MUESTRA EL CRIMEN: MENSAJE BORRADO')
            .setColor('#FF0000')
            .setDescription('⚠️ **Mensaje Parcial:** El mensaje era demasiado antiguo y no estaba en la memoria del bot. No se pudo recuperar el contenido ni el autor exacto.')
            .addFields({ name: '📍 Canal', value: `${message.channel}`, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Sistema Anti-Eliminación Malandro 👑' });
        
        return await logChannel.send({ embeds: [partialEmbed] }).catch(() => {});
    }

    // 🕵️ EXTRA: Buscar quién borró el mensaje (Audit Logs)
    let executor = 'Desconocido (o el propio Autor)';
    try {
        const fetchedLogs = await message.guild.fetchAuditLogs({
            limit: 1,
            type: 72, // MESSAGE_DELETE
        });
        const deletionLog = fetchedLogs.entries.first();
        if (deletionLog) {
            const { executor: user, target } = deletionLog;
            if (target.id === message.author.id && (Date.now() - deletionLog.createdAt) < 5000) {
                executor = `${user.username} (ID: ${user.id})`;
            }
        }
    } catch (e) {}

    const embed = new EmbedBuilder()
      .setTitle('🗑️ MUESTRA EL CRIMEN: MENSAJE BORRADO')
      .setColor('#FF0000')
      .setThumbnail(message.author.displayAvatarURL())
      .addFields(
        { name: '👤 Autor del mensaje', value: `${message.author} (${message.author.id})`, inline: true },
        { name: '📍 Canal original', value: `${message.channel}`, inline: true },
        { name: '🕵️ ¿Quién lo borró?', value: `\`${executor}\``, inline: false },
        { name: '📄 Contenido Eliminado', value: message.content || '*[Sin contenido de texto / Solo archivos]*' }
      )
      .setTimestamp()
      .setFooter({ text: 'Sistema Anti-Eliminación Malandro 👑' });

    // 📎 Detectar adjuntos
    if (message.attachments.size > 0) {
      const links = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
      embed.addFields({ name: '📎 Archivos Adjuntos', value: links });
      
      const mainAttachment = message.attachments.first();
      if (mainAttachment.contentType?.startsWith('image/')) {
        embed.setImage(mainAttachment.proxyURL);
      }
    }

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
};
