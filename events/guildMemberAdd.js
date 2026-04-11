const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const GuildSettings = require('../models/GuildSettings');
const config = require('../config');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (mongoose.connection.readyState !== 1) return;

    const settings = await GuildSettings.findOne({ guildId: member.guild.id });
    if (!settings?.welcomeChannelId) return;

    const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
    if (!channel) return;

    const welcomeImage = settings.welcomeImageUrl || process.env.WELCOME_IMAGE || member.user.displayAvatarURL({ dynamic: true, size: 1024 });
    const embed = new EmbedBuilder()
      .setTitle('SISTEMA DE SEGURIDAD: NUEVO MIEMBRO')
      .setDescription(`[+] ¡Bienvenido/a, ${member}! Prepárate para la mejor experiencia en ${member.guild.name}.`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setImage(welcomeImage)
      .setColor('#00FF7F')
      .addFields(
        { name: 'Usuario', value: `\`${member.user.tag}\``, inline: true },
        { name: 'Miembros Totales', value: `\`#${member.guild.memberCount}\``, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Sistema CDR - Bienvenida al Servidor`, iconURL: config.ICON_URL });





    await channel.send({ content: `¡Ojo! ${member} acaba de aterrizar. 👋`, embeds: [embed] }).catch((e) => console.error('Error enviando bienvenida:', e));

    // 🛡️ AUTO-ROLES (Asignación de galones automática)
    if (settings.autoRoleIds && settings.autoRoleIds.length > 0) {
      const rolesToAdd = settings.autoRoleIds.filter(id => member.guild.roles.cache.has(id));
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd).catch(err => {
          console.error(`[AutoRole] No se pudieron asignar los roles a ${member.user.tag}:`, err.message);
        });
      }
    }
  }
};

