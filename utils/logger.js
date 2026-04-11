const fs = require('fs');
const path = require('path');

const logStream = fs.createWriteStream(path.join(process.cwd(), 'bot.log'), { flags: 'a' });

function logToFile(msg, type = 'INFO') {
    const timestamp = new Date().toLocaleString();
    const cleanMsg = msg.replace(/\n/g, ' ');
    const logEntry = `[${timestamp}] [${type}] ${cleanMsg}\n`;
    
    // Solo mostrar en consola si no es un log muy cargado
    if (type !== 'DEBUG') {
        console.log(`[${type}] ${msg}`);
    }
    
    logStream.write(logEntry);
}

module.exports = { logToFile };
