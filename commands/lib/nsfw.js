const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const GuildSettings = require('../../models/GuildSettings');
const { logToFile } = require('../../utils/logger');

// 🧠 CACHÉ DE DEDUPLICACIÓN: evita repetir posts en el mismo canal/búsqueda
// Clave: `${channelId}:${query}` → { ids: Set<string>, expiresAt: timestamp }
const seenCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // Aumentado a 1 hora
const CACHE_MAX_IDS = 2000;         // El bot recordará muchísimas más imágenes para no repetir

// 🌈 POOL DE VARIEDAD: Categorías para cuando la búsqueda es aleatoria
const VARIETY_POOL = [
    'hentai', 'solo', 'yuri', 'milf', 'paizuri', 'oppai', 'thighhighs', 
    'stockings', 'swimsuit', 'bikini', 'pantsu', 'skirt', 'school_uniform',
    'maid', 'nurse', 'office_lady', 'ponytail', 'long_hair', 'blush', 
    'ahoge', 'smile', 'laughing', 'blue_eyes', 'red_eyes', 'green_eyes', 
    'tall_girl', 'short_girl'
];

function getSeenSet(channelId, query) {
    const key = `${channelId}:${query}`;
    const now = Date.now();
    let entry = seenCache.get(key);
    if (!entry || entry.expiresAt < now) {
        entry = { ids: new Set(), expiresAt: now + CACHE_TTL };
        seenCache.set(key, entry);
    }
    return entry.ids;
}

function markSeen(channelId, query, postId) {
    const ids = getSeenSet(channelId, query);
    ids.add(String(postId));
    // Evitar que el Set crezca infinitamente (borrar el más viejo aproximado)
    if (ids.size > CACHE_MAX_IDS) {
        ids.delete(ids.values().next().value);
    }
}

async function getFileSize(url) {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0';
    try {
        // Intento 1: HEAD request (el más limpio, no descarga nada)
        const headRes = await axios.head(url, {
            headers: { 'User-Agent': userAgent },
            timeout: 4000
        });
        const cl = parseInt(headRes.headers['content-length'] || 0);
        if (cl > 0) return cl;
    } catch (e) { /* HEAD no soportado, continuar */ }

    try {
        // Intento 2: GET con Range header (solo 256 bytes)
        const res = await axios.get(url, {
            headers: { 'User-Agent': userAgent, 'Range': 'bytes=0-255' },
            timeout: 4000,
            maxContentLength: 50 * 1024, // 50KB suficiente para cualquier JSON de API
            maxBodyLength: 50 * 1024
        });
        const contentRange = res.headers['content-range'];
        if (contentRange) {
            return parseInt(contentRange.split('/')[1] || 0);
        }
        return parseInt(res.headers['content-length'] || 0);
    } catch (e) {
        // 413 = Request Entity Too Large (Axios lo lanza si se pasa de maxContentLength)
        if (e.message?.includes('413') || e.message?.includes('too large')) {
             if (e.response?.headers?.['content-length']) {
                return parseInt(e.response.headers['content-length']);
            }
        }
        return 0; // No se pudo determinar el tamaño
    }
}

async function sendRule34(query, interaction, options = {}) {
    const { isUpdate = false, isGif = false } = options;
    
    // ⚡ RESPUESTA INMEDIATA: Diferir antes de cualquier operación asíncrona (DB/API)
    // Esto evita el error "Unknown Interaction" si la base de datos o la API tardan más de 3s.
    if (!interaction.deferred && !interaction.replied) {
        try {
            if (interaction.isButton()) await interaction.deferUpdate();
            else await interaction.deferReply();
        } catch (e) {
            // Silencio total para errores de interacción esperados (ya respondida o expirada)
            if (e.code !== 10062 && e.code !== 40060) {
                logToFile(`[DeferError] Error crítico al diferir: ${e.message}`, 'WARN');
            }
        }
    }

    const settings = await GuildSettings.findOne({ guildId: interaction.guildId });
    if (!settings?.nsfwEnabled) {
        const msg = { content: '❌ Los comandos NSFW están desactivados en este servidor.', flags: 64 };
        return await interaction.editReply(msg);
    }

    if (!interaction.channel?.nsfw) {
        const msg = { content: '🔞 Este comando solo puede usarse en canales NSFW.', flags: 64 };
        return await interaction.editReply(msg);
    }

    try {
        const isRandom = !query || query.trim().toLowerCase() === 'hentai';
        let bestTag = '';
        let totalCount = 1000;

        if (isRandom) {
            // Si es random, elegimos una categoría del pool para dar variedad real
            bestTag = VARIETY_POOL[Math.floor(Math.random() * VARIETY_POOL.length)];
            logToFile(`[NSFW] Búsqueda aleatoria elegida: ${bestTag}`, 'DEBUG');
        } else {
            const originalQuery = query.trim();
            const cleanQuery = originalQuery.replace(/\s+/g, '_').replace(/-/g, '_');
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0';
            
            // 🛡️ SMART DISCOVERY (Solo si el usuario pidió algo específico)
            const tagLookupUrl = `https://gelbooru.com/index.php?page=dapi&s=tag&q=index&json=1&name_pattern=%${encodeURIComponent(cleanQuery)}%`;
            const gelAuth = (process.env.GELBOORU_API_KEY && process.env.GELBOORU_USER_ID) ? `&api_key=${process.env.GELBOORU_API_KEY}&user_id=${process.env.GELBOORU_USER_ID}` : '';
            
            const tagResp = await axios.get(tagLookupUrl + gelAuth, { headers: { 'User-Agent': userAgent }, timeout: 4000 }).catch(() => null);
            
            bestTag = cleanQuery;
            if (tagResp && tagResp.data) {
                const tags = tagResp.data.tag || tagResp.data;
                if (Array.isArray(tags) && tags.length > 0) {
                    const match = tags.sort((a,b) => parseInt(b.count || 0) - parseInt(a.count || 0))[0];
                    if (match) {
                        bestTag = match.name;
                        totalCount = parseInt(match.count) || 1000;
                    }
                }
            }
        }

        const originalQuery = query || bestTag;
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0';

        // 🛡️ MALANDRO SHIELD: Bloqueo de Realismo (3D/Cosplay) y Furry (Animales)
        const bypassTags = ' -futanari -dickgirl -shemale -gay -male_only -trap -crossdressing -scat -gore -3d -cosplay -photo -real -realistic -furry -anthro -animal -feral -bestiality -beast';
        const qualityTags = ' score:>10'; // Solo contenido con buena valoración por la comunidad
        const typeTag = isGif ? ' animated' : ' -animated';

        // 2. MOTOR TRIPLE (Ahora con filtros de calidad y enorme rango)
        const engines = [
            { 
                name: 'Rule34',
                url: (pid) => `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&pid=${pid}&tags=${encodeURIComponent(bestTag + bypassTags + typeTag + qualityTags)}${(process.env.RULE34_API_KEY && process.env.RULE34_USER_ID) ? `&api_key=${process.env.RULE34_API_KEY}&user_id=${process.env.RULE34_USER_ID}` : ''}`
            },
            { 
                name: 'Gelbooru',
                url: (pid) => `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&pid=${pid}&tags=${encodeURIComponent(bestTag + bypassTags + typeTag + qualityTags)}${(process.env.GELBOORU_API_KEY && process.env.GELBOORU_USER_ID) ? `&api_key=${process.env.GELBOORU_API_KEY}&user_id=${process.env.GELBOORU_USER_ID}` : ''}`
            },
            {
                name: 'Danbooru',
                url: (pid) => `https://danbooru.donmai.us/posts.json?page=${pid + 1}&tags=${encodeURIComponent(bestTag + bypassTags + typeTag + ' score:>10')}${(process.env.DANBOORU_API_KEY && process.env.DANBOORU_USER) ? `&login=${process.env.DANBOORU_USER}&api_key=${process.env.DANBOORU_API_KEY}` : ''}`
            }
        ];

        // Mezclar y elegir orden
        const pool = [...engines].sort(() => Math.random() - 0.5);

        async function fetchPost(engine) {
            // Expandimos el rango de búsqueda para que recorra miles de imágenes posibles
            const limit = isGif ? 100 : 2000; 
            const maxPid = Math.min(Math.floor(totalCount / (engine.name === 'Danbooru' ? 20 : 100)), limit);
            const randomPid = Math.floor(Math.random() * (maxPid + 1));
            
            async function tryFetch(pid) {
                const response = await axios.get(engine.url(pid), { headers: { 'User-Agent': userAgent }, timeout: 8500 });
                let posts = [];
                if (Array.isArray(response.data)) posts = response.data;
                else if (response.data && response.data.post) posts = Array.isArray(response.data.post) ? response.data.post : [response.data.post];
                return posts.filter(p => p.file_url || p.large_file_url || p.media_asset?.variants?.[0]?.url);
            }

            // Intento 1: Página aleatoria
            let posts = await tryFetch(randomPid).catch(() => []);
            
            // Intento 2: Página 0 (Fallback crítico si la aleatoria está vacía)
            if (posts.length === 0 && randomPid !== 0) {
                posts = await tryFetch(0).catch(() => []);
            }

            return posts.length > 0 ? { posts, engineName: engine.name, pid: posts === 0 ? 0 : randomPid } : null;
        }

        let result = null;
        for (const engine of pool) {
            result = await fetchPost(engine).catch(() => null);
            if (result) break;
        }

        // 3. SELECCIÓN DE POST (con deduplicación para evitar repetidos)
        if (!result || !result.posts || result.posts.length === 0) {
            throw new Error("No hubo resultados. Posible bloqueo de la nube (Railway) o motores caidos.");
        }

        const channelId = interaction.channelId;
        const cacheKey = `${isGif ? 'gif' : 'img'}:${bestTag}`;
        const seenIds = getSeenSet(channelId, cacheKey);

        // Preferir posts no vistos; si todos ya se vieron, resetear el cache del canal
        let freshPosts = result.posts.filter(p => !seenIds.has(String(p.id)));
        if (freshPosts.length === 0) {
            logToFile(`[Dedup] Todos los posts de esta página ya fueron vistos. Reseteando caché para: ${cacheKey}`, 'DEBUG');
            seenIds.clear();
            freshPosts = result.posts;
        }

        const post = freshPosts[Math.floor(Math.random() * freshPosts.length)];
        markSeen(channelId, cacheKey, post.id);
        
        // Normalización de URL para los 3 motores
        let originalUrl = post.file_url || post.large_file_url || post.sample_url || post.preview_url;
        
        // Soporte específico para el nuevo formato de Danbooru
        if (!originalUrl && post.media_asset?.variants) {
            const variant = post.media_asset.variants.find(v => v.type === '720p' || v.type === 'original') || post.media_asset.variants[0];
            originalUrl = variant?.url;
        }

        if (!originalUrl) throw new Error("No se pudo obtener la URL del archivo.");
        if (originalUrl.startsWith('//')) originalUrl = `https:${originalUrl}`;
        originalUrl = originalUrl.replace(/\\\//g, '/').replace('http:', 'https:');

        const isVideo = originalUrl.endsWith('.mp4') || originalUrl.endsWith('.webm');
        let proxyUrl = originalUrl;
        
        // 🚀 FILTRADO POR TAMAÑO Y MEJORA (BOOST)
        const tier = interaction.guild?.premiumTier || 0;
        const uploadLimit = (tier === 3 ? 100 : (tier === 2 ? 50 : 25)) * 1024 * 1024; // MB a Bytes
        
        const fileSize = await getFileSize(originalUrl);
        let useStaticFallback = false;
        let warningText = isUpdate ? '' : null;

        // Si es un GIF y no pudimos medir el tamaño, ser cautelosos (los GIFs populares pesan 50-200MB)
        const sizeUnknown = fileSize === 0;
        const isGifFile = originalUrl.endsWith('.gif');

        if (fileSize > uploadLimit || (sizeUnknown && isGif && isGifFile)) {
            const reason = sizeUnknown ? 'tamaño desconocido (GIF cauteloso)' : `${(fileSize / 1024 / 1024).toFixed(2)}MB > ${(uploadLimit / 1024 / 1024).toFixed(2)}MB`;
            logToFile(`[SizeCheck] Fallback estático activado: ${reason}`, 'WARN');
            useStaticFallback = true;
            warningText = `⚠️ **Este contenido es bastante pesado.** Usa el botón inferior para verlo completo.`;
            
            // Usar sample_url o preview_url para el fallback estático
            proxyUrl = post.sample_url || post.preview_url || originalUrl;
            if (proxyUrl.startsWith('//')) proxyUrl = `https:${proxyUrl}`;
            proxyUrl = proxyUrl.replace('http:', 'https:');
            
            // Si es Gelbooru, aplicar weserv al fallback también
            if (result.engineName === 'Gelbooru') {
                proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(proxyUrl)}`;
            }
        } else if (result.engineName === 'Gelbooru' && !isVideo) {
            proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}`;
        }

        // 🔍 DEBUG: Log del enlace final para verificación
        logToFile(`[Media] Motor: ${result.engineName} | URL: ${proxyUrl}`, 'DEBUG');

        const embed = new EmbedBuilder()
            .setTitle(`${isGif ? '🎬 GIF/Video' : '🔞 Imagen'}: ${originalQuery}`)
            .setColor(result.engineName === 'Rule34' ? '#CC00FF' : (result.engineName === 'Gelbooru' ? '#11CCFF' : '#FFCC00'))
            .setFooter({ text: `Página: ${result.pid} • Fuente: ${result.engineName} • ID: ${post.id}` })
            .setTimestamp();

        const nextId = isGif ? `r34gif_next:${bestTag.slice(0, 50)}` : `r34_next:${bestTag.slice(0, 50)}`;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('🔄 Siguiente').setCustomId(nextId).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('🔗 Original').setURL(originalUrl).setStyle(ButtonStyle.Link)
        );

        let files = [];
        if (!useStaticFallback) {
            try {
                const downloadHeaders = { 
                    'User-Agent': userAgent,
                    'Referer': originalUrl.includes('gelbooru.com') ? 'https://gelbooru.com/' : 
                               (originalUrl.includes('rule34.xxx') ? 'https://rule34.xxx/' : 'https://danbooru.donmai.us/')
                };

                // Límite duro de descarga: 24MB (nunca más, sin importar el tier)
                const MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024;
                const mediaResp = await axios.get(originalUrl, { 
                    responseType: 'arraybuffer',
                    headers: downloadHeaders,
                    timeout: 15000,
                    maxContentLength: MAX_DOWNLOAD_BYTES,
                    maxBodyLength: MAX_DOWNLOAD_BYTES
                });

                if (mediaResp.data) {
                    const ext = originalUrl.split('.').pop().split('?')[0] || (isVideo ? 'mp4' : 'jpg');
                    const attachment = new AttachmentBuilder(Buffer.from(mediaResp.data), { name: `media_${post.id}.${ext}` });
                    files = [attachment];
                    
                    if (!isVideo) {
                        embed.setImage(`attachment://${attachment.name}`);
                    }
                }
            } catch (err) {
                logToFile(`[DownloadError] No se pudo adjuntar el archivo: ${err.message}. Usando link directo de fallback.`, 'WARN');
                if (!isVideo) embed.setImage(proxyUrl);
                // Si el adjunto falla, podrías decidir mostrar el link o no. 
                // El usuario pidió "link no dejes", así que confiaremos en el botón Original.
            }
        } else {
            embed.setImage(proxyUrl);
        }

        return await interaction.editReply({ 
            content: warningText, // Solo texto si es pesado. Si no, queda limpio.
            embeds: [embed], 
            files: files,
            components: [row] 
        });

    } catch (e) {
        // No loguear como ERROR si es solo un tema de Discord (10062 o 40060)
        if (e.code !== 10062 && e.code !== 40060) {
            logToFile(`Unified Search Error: ${e.message} | Query: ${query}`, 'ERROR');
        }
        
        // Intentar responder al usuario solo si no se ha respondido aún
        try {
            const errorMsg = '❌ **Error del Sistema:** Los servidores externos de búsqueda nos han bloqueado temporalmente o están saturados. ¡Intenta de nuevo en unos momentos o con otras palabras!';
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: errorMsg, flags: 64 });
            } else if (interaction.deferred) {
                await interaction.editReply(errorMsg);
            }
        } catch (err) { /* Ignorar si falla el reply final */ }
    }
}

module.exports = { sendRule34 };
