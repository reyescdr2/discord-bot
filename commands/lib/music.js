const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection, entersState } = require('@discordjs/voice');
const play = require('play-dl');
const { logToFile } = require('../../utils/logger');

const queues = new Map();

function getRows(isPaused = false) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('music_previous').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_pause').setEmoji(isPaused ? '▶️' : '⏸️').setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music_replay').setEmoji('🔄').setStyle(ButtonStyle.Primary)
    )];
}

function generateNowPlayingEmbed(track) {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🎶 Reproduciendo Ahora')
        .setDescription(`[**${track.title}**](${track.url})`)
        .setThumbnail(track.thumbnail || null)
        .addFields({ name: 'Pedida por', value: `${track.requester}`, inline: true })
        .setTimestamp();
}

async function playNext(guildId, textChannel) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.tracks.length === 0) {
        logToFile(`[Music] Cola vacía en ${guildId}.`, 'MUSIC');
        queue.playing = null;
        queue.isPreparing = false;
        if (textChannel) await textChannel.send('🎶 **La cola de reproducción ha terminado.**').catch(() => {});
        return;
    }

    queue.isPreparing = true;

    // Guardar el actual en history si no es nulo y no acaba de ser reiniciado/regresado
    if (queue.playing && !queue.isPlayingPrevious) {
        queue.history.push(queue.playing);
        if(queue.history.length > 20) queue.history.shift(); // Maximo 20 en historial
    }
    queue.isPlayingPrevious = false;

    const track = queue.tracks.shift();
    queue.playing = track;

    try {
        logToFile(`[Play] Obteniendo stream con yt-dlp para: ${track.url}`, 'MUSIC');
        
        const ytDlp = require('yt-dlp-exec');
        const rawUrl = await ytDlp(track.url, {
            getUrl: true,
            format: 'bestaudio'
        });
        
        const directUrl = rawUrl.trim();
        const resource = createAudioResource(directUrl);

        queue.player.play(resource);
        queue.isPreparing = false;

        if (textChannel) {
            const embed = generateNowPlayingEmbed(track);
            const components = getRows(false);
            
            // Delete old message to avoid spam
            if (queue.lastMessage) {
                await queue.lastMessage.delete().catch(() => {});
            }
            queue.lastMessage = await textChannel.send({ embeds: [embed], components }).catch(() => {});
        }
    } catch (error) {
        logToFile(`[Play] Error al intentar reproducir ${track.url}: ${error.message}`, 'ERROR');
        queue.isPreparing = false;
        if (textChannel) await textChannel.send(`❌ Ocurrió un error al reproducir **${track.title}**. Saltando a la siguiente...`).catch(() => {});
        playNext(guildId, textChannel);
    }
}

async function startPlayback(query, interaction) {
    logToFile(`[Play] Iniciando búsqueda local: "${query}" | Guild: ${interaction.guildId}`, 'MUSIC');

    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return interaction.editReply('❌ Debes estar en un canal de voz.');
    }

    try {
        let resultUrl = '';
        let resultTitle = '';
        let resultThumb = '';
        const isUrl = query.startsWith('http://') || query.startsWith('https://');

        if (isUrl) {
            const videoInfo = await play.video_info(query);
            resultUrl = videoInfo.video_details.url;
            resultTitle = videoInfo.video_details.title;
            resultThumb = videoInfo.video_details.thumbnails[0]?.url || '';
        } else {
            const searchResults = await play.search(query, { limit: 1 });
            if (!searchResults || searchResults.length === 0) {
                return interaction.editReply(`❌ No se encontró nada para: **${query}**`);
            }
            resultUrl = searchResults[0].url;
            resultTitle = searchResults[0].title;
            resultThumb = searchResults[0].thumbnails[0]?.url || '';
        }

        const track = {
            title: resultTitle,
            url: resultUrl,
            thumbnail: resultThumb,
            requester: interaction.user
        };

        let queue = queues.get(interaction.guildId);

        if (!queue) {
            const player = createAudioPlayer();
            
            queue = {
                textChannel: interaction.channel,
                voiceChannel: voiceChannel,
                connection: null,
                player: player,
                tracks: [],
                history: [],
                playing: null,
                lastMessage: null,
                isPlayingPrevious: false,
                isPreparing: false
            };
            
            queues.set(interaction.guildId, queue);

            player.on(AudioPlayerStatus.Idle, () => {
                logToFile(`[Music] Canción terminada en ${interaction.guildId}`, 'MUSIC');
                playNext(interaction.guildId, queue.textChannel);
            });

            player.on('error', error => {
                logToFile(`[Music Player Error] ${error.message}`, 'ERROR');
                playNext(interaction.guildId, queue.textChannel);
            });
        }

        let connection = getVoiceConnection(interaction.guildId);
        if (!connection) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });
            queue.connection = connection;
            connection.subscribe(queue.player);

            connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
                    ]);
                } catch (error) {
                    logToFile(`[Music] Desconectado de ${interaction.guildId}, destruyendo conexión.`, 'MUSIC');
                    connection.destroy();
                    queues.delete(interaction.guildId);
                }
            });
        }

        queue.tracks.push(track);

        if (queue.player.state.status === AudioPlayerStatus.Idle && !queue.isPreparing) {
            queue.isPreparing = true;
            await interaction.editReply(`🔎 Buscando y extrayendo MP3 localmente...`);
            playNext(interaction.guildId, interaction.channel);
        } else {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setAuthor({ name: 'Añadida a la cola' })
                .setDescription(`[**${track.title}**](${track.url})`)
                .setThumbnail(track.thumbnail || null);
            await interaction.editReply({ embeds: [embed], content: null });
        }

    } catch (error) {
        logToFile(`[Play] Error en startPlayback: ${error.message}`, 'ERROR');
        await interaction.editReply('❌ **Error de audio:** No se pudo encontrar o reproducir el contenido con el motor local.').catch(() => {});
    }
}

async function replayTrack(guildId) {
    const queue = queues.get(guildId);
    if (!queue || !queue.playing) return false;
    
    try {
        const ytDlp = require('yt-dlp-exec');
        const rawUrl = await ytDlp(queue.playing.url, { getUrl: true, format: 'bestaudio' });
        const directUrl = rawUrl.trim();
        const resource = createAudioResource(directUrl);
        queue.player.play(resource);
        return true;
    } catch(e) {
        return false;
    }
}

async function previousTrack(guildId) {
    const queue = queues.get(guildId);
    if (!queue || !queue.history || queue.history.length === 0) return false;
    
    if (queue.playing) {
        queue.tracks.unshift(queue.playing); // Lo ponemos al frente de la cola de reproduccion
    }
    
    const prevTrack = queue.history.pop();
    queue.tracks.unshift(prevTrack); // El previo es ahora el inmediato
    
    queue.isPlayingPrevious = true; // Para no reguardar en historia
    queue.player.stop(); // Dispara Idle -> playNext corre el track previo
    return true;
}

async function searchTracks(query) {
    try {
        const searchResults = await play.search(query, { limit: 10 });
        return searchResults.map(v => ({
            title: v.title,
            url: v.url,
            duration: v.durationRaw || '0:00',
            author: v.channel?.name || 'YouTube'
        }));
    } catch (e) {
        return [];
    }
}

function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours > 0 ? hours + ':' : ''}${minutes < 10 && hours > 0 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

module.exports = {
    startPlayback,
    getRows,
    formatDuration,
    searchTracks,
    queues,
    replayTrack,
    previousTrack,
    generateNowPlayingEmbed
};
