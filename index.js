require('dotenv').config();
const { logToFile } = require('./utils/logger.js');

// 🛡️ PROTECCIÓN ANTI-CRASH GLOBAL
process.on('unhandledRejection', (reason, promise) => {
    logToFile(`[CRITICAL] Unhandled Rejection: ${reason} | Promise: ${promise}`, 'ERROR');
    console.error('--- UNHANDLED REJECTION ---');
    console.error(reason);
});

process.on('uncaughtException', (err, origin) => {
    logToFile(`[CRITICAL] Uncaught Exception: ${err} | Origin: ${origin}`, 'ERROR');
    console.error('--- UNCAUGHT EXCEPTION ---');
    console.error(err);
});

const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    REST, 
    Routes, 
    ActivityType, 
    EmbedBuilder,
    PermissionFlagsBits,
    Partials
} = require('discord.js');
const GuildSettings = require('./models/GuildSettings');
// Eliminamos dependencias viejas de musica (Lavalink las maneja ahora)

const mongoose = require('mongoose');
const express = require('express');
const fs = require('fs');
const path = require('path');



// Motores de Audio (Cargando ffmpeg-static)
const ffmpegStatic = require('ffmpeg-static');

if (ffmpegStatic) {
    const ffmpegDir = path.dirname(ffmpegStatic);
    logToFile('Motores: Audio Streamer listo', 'BOOT');
    process.env.PATH = `${ffmpegDir}${path.delimiter}${process.env.PATH}`;
}
// Motores
const state = require('./state.js');
const persona = require('./commands/lib/persona.js');
const music = require('./commands/lib/music.js');
// Lavalink eliminado

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    rest: { timeout: 30000 } // Mayor resiliencia ante lags de internet
});

process.on('unhandledRejection', (reason, promise) => {
    logToFile(`[Error Critico Rejection]: ${reason}`, 'CRITICAL');
});
process.on('uncaughtException', (err, origin) => {
    logToFile(`[Error Critico Exception]: ${err} | Origin: ${origin}`, 'CRITICAL');
});


client.commands = new Collection();

// 1. Cargar Comandos (Filtro Recursivo)
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}

if (fs.existsSync(commandsPath)) {
    loadCommands(commandsPath);
}


// 1.1 Cargar Eventos Dinámicamente
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// 2. Conexión MongoDB
mongoose.set('bufferCommands', false); // No esperar si la DB está caída

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI || process.env.MONGO_URI.length < 5) {
            return logToFile('ADVERTENCIA: MONGO_URI no encontrada o inválida.', 'WARN');
        }

        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Fallar en 5s si no hay respuesta
        });
    } catch (err) {
        logToFile(`Error conexión Mongo: ${err.message}`, 'ERROR');
    }
};

mongoose.connection.on('connected', () => logToFile('Base de Datos Conectada', 'DB'));
mongoose.connection.on('error', (err) => logToFile(`Error de Red DB: ${err.message}`, 'ERROR'));
mongoose.connection.on('disconnected', () => logToFile('Base de Datos Desconectada (Intentando reconectar...)', 'WARN'));

connectDB();

// 3. KeepAlive Server (Malandro Resiliente)
app.get('/', (req, res) => res.send('Bot CDR en linea'));

const startServer = (port) => {
    app.listen(port, () => console.log(`Servidor KeepAlive en puerto ${port}`))
    .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Puerto ${port} ocupado. Saltando KeepAlive... (El bot seguira funcionando)`);
        } else {
            console.error('Error de Servidor:', err);
        }
    });
};

const PORT = process.env.PORT || 3000;

// --- LÓGICA DE AUTO-DESPLIEGUE DE COMANDOS (MODO RAILWAY) ---
if (process.env.DEPLOY_COMMANDS === 'true') {
    (async () => {
        try {
            console.log('📡 [Railway] Iniciando auto-despliegue de comandos...');
            const { execSync } = require('child_process');
            execSync('node deploy-commands.js', { stdio: 'inherit' });
            console.log('✅ [Railway] Comandos desplegados correctamente.');
        } catch (err) {
            console.error('❌ [Railway] Error en el auto-despliegue:', err.message);
        }
    })();
}

startServer(PORT);


client.once('clientReady', () => {
    logToFile(`BOT LISTO: ${client.user.tag}`, 'BOOT');
    
    client.user.setPresence({
        activities: [{ name: 'Tirando Factos', type: ActivityType.Custom }],
        status: 'dnd',
    });

    // initLavalink(client); (Lavalink removido)
});
// 5. Gestión de Voz (Auto-Leave cuando todos se van)
client.on('voiceStateUpdate', (oldState, newState) => {
    const { getVoiceConnection } = require('@discordjs/voice');
    const connection = getVoiceConnection(oldState.guild.id);
    if (!connection) return;

    // Verificar si somos el único bot en el canal
    const channel = oldState.guild.channels.cache.get(connection.joinConfig.channelId);
    if (channel && channel.members.filter(m => !m.user.bot).size === 0) {
        logToFile(`AutoLeave: Canal vacio en ${oldState.guild.name}`, 'MUSIC');
        connection.destroy();
        
        // Limpiar la cola si existe
        const music = require('./commands/lib/music.js');
        if (music.queues && music.queues.has(oldState.guild.id)) {
            music.queues.delete(oldState.guild.id);
        }
    }
});

// 6. Autostart y Login
client.login(process.env.DISCORD_TOKEN);
