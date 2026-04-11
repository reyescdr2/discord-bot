const GuildSettings = require('../models/GuildSettings');
const persona = require('../commands/lib/persona');

const userMessages = new Map();
const linkRegex = /(https?:\/\/[^\s]+)/g;

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const settings = await GuildSettings.findOne({ guildId: message.guild.id });
    if (!settings?.automodEnabled) return;

    // Anti-Link
    if (settings.antiLink && linkRegex.test(message.content)) {
      try {
        await message.delete();
        await message.channel.send({
          content: `[X] Los enlaces no estan permitidos aqui, <@${message.author.id}>.`,
        });
      } catch (err) {
        console.error('Error deleting link message:', err);
      }
    }

    // Anti-Spam
    if (settings.antiSpam) {
      const now = Date.now();
      const key = `${message.guild.id}-${message.author.id}`;
      if (!userMessages.has(key)) userMessages.set(key, []);
      const timestamps = userMessages.get(key);

      timestamps.push(now);
      const recent = timestamps.filter(ts => now - ts < 5000);
      userMessages.set(key, recent);

      if (recent.length >= 5) {
        try {
          await message.delete();
          await message.channel.send({
            content: `[!] Deten el spam, <@${message.author.id}>.`,
          });
        } catch (err) {
          console.error('Error deleting spam message:', err);
        }
      }
    }

    // --- LÓGICA IA PERSONA (CHATBOT) ---
    if (settings.chatbotEnabled && settings.chatbotChannelId === message.channel.id) {
      const isMentioned = message.mentions.has(message.client.user);
      if (isMentioned || Math.random() < 0.1) {
        try {
          const response = await persona.getRandomResponse(message.content, message.author.username);
          if (response) {
            await message.channel.sendTyping();
            setTimeout(() => message.reply(response).catch(() => {}), 1500);
          }
        } catch (err) {
          console.error('Error IA Chatbot:', err);
        }
      }
      return; // Evitamos procesar más si es IA
    }

    // --- LÓGICA CANAL DE MÚSICA DEDICADO ---
    if (settings.musicChannelId && settings.musicChannelId === message.channel.id) {
      const query = message.content.trim();
      if (!query) return;

      try {
        // Borramos el mensaje del usuario para limpiar el chat
        await message.delete().catch(() => {});

        const music = require('../commands/lib/music');
        // Usamos una simulación de interacción para reutilizar la lógica de playback
        const fakeInteraction = {
            guild: message.guild,
            member: message.member,
            channel: message.channel,
            user: message.author,
            deferReply: async () => {},
            editReply: async (content) => message.channel.send(content),
            followUp: async (content) => message.channel.send(content)
        };

        await music.startPlayback(query, fakeInteraction);
      } catch (err) {
        console.error('Error en Canal de Musica:', err);
      }
    }
  }
};
