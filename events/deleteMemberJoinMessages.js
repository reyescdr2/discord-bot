const { MessageType } = require('discord.js');

// 🗑️ Elimina los mensajes de sistema de Discord tipo "X acaba de llegar!"
// Estos son mensajes automáticos con MessageType.GuildMemberJoin (tipo 7)

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Solo actuar en servidores y si el mensaje es de tipo "miembro unido"
    if (!message.guild) return;
    if (message.type !== MessageType.GuildMemberJoin) return;

    try {
      if (message.deletable) {
        await message.delete();
        console.log(`[CDR] 🗑️ Mensaje de bienvenida de sistema eliminado en #${message.channel.name} (${message.guild.name})`);
      }
    } catch (err) {
      // Ignorar errores silenciosamente (permisos, ya eliminado, etc.)
      if (err.code !== 10008) { // 10008 = Unknown Message (ya fue borrado)
        console.error('[CDR] Error al eliminar mensaje de sistema:', err.message);
      }
    }
  }
};
