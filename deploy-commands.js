const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function getCommands(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getCommands(filePath);
    } else if (file.endsWith('.js')) {
      delete require.cache[require.resolve(filePath)];
      let command;
      try {
        command = require(filePath);
      } catch (error) {
        console.error(`❌ ERROR en el archivo: ${filePath} -> ${error.message}`);
        continue;
      }
      
      if ('data' in command && 'execute' in command) {
        const cmdData = command.data.toJSON();
        if (commands.some(c => c.name === cmdData.name)) continue;
        console.log(`📡 Cargado: /${cmdData.name}`);
        commands.push(cmdData);
      }
    }
  }
}

if (fs.existsSync(commandsPath)) {
  getCommands(commandsPath);
}

(async () => {
    const isGuild = !!process.env.GUILD_ID;
    const appId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;
    const token = process.env.DISCORD_TOKEN;

    if (!appId || !token) {
        console.error('❌ Faltan CONFIG_ID o DISCORD_TOKEN en .env');
        process.exit(1);
    }

    const baseUrl = `https://discord.com/api/v10/applications/${appId}`;
    
    // Si queremos despliegue GLOBAL, no usamos el guildId en la URL.
    // El usuario pidió GLOBAL para todos los servidores.
    const isGlobal = process.env.FORCE_GUILD !== 'true'; 
    const url = isGlobal ? `${baseUrl}/commands` : `${baseUrl}/guilds/${guildId}/commands`;

    console.log(`⏳ Iniciando despliegue de ${commands.length} comandos (${isGlobal ? 'MODO GLOBAL' : 'MODO SERVIDOR'})...`);
    if (isGlobal) console.log('💡 Recuerda: Los comandos GLOBALES pueden tardar hasta 1 hora en aparecer.');

    try {
        const response = await axios.put(url, commands, {
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        console.log(`✅ ¡ÉXITO! Se han desplegado ${response.data.length} comandos correctamente.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR AL DESPLEGAR:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            if (error.response.status === 400) {
                fs.writeFileSync('error_discord.json', JSON.stringify(error.response.data, null, 2));
                console.error('⚠️ Detalle del error guardado en error_discord.json');
            }
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
})();
