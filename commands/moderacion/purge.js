const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Purga industrial de hasta 5,000 mensajes con precisión de malandro.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('¿Cuánta basura limpiamos? (1-5000)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5000)
        )
        .addIntegerOption(option =>
            option.setName('segundos')
                .setDescription('Velocidad de ráfaga (En segundos por lote)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(10)
        ),
    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const seconds = interaction.options.getInteger('segundos') || 1;
        const delay = seconds * 1000;
        
        const targetChannel = interaction.channel;
        if (!targetChannel || !interaction.guild) {
            return interaction.reply({ content: '[X] Este comando solo funciona en servidores.', flags: 64 }).catch(() => {});
        }

        await interaction.deferReply({ flags: 64 }).catch(() => {});

        let deletedTotal = 0;
        let remaining = amount;
        let stop = false;

        try {
            while (remaining > 0 && !stop) {
                const batchSize = Math.min(remaining, 100);
                
                const fetched = await targetChannel.messages.fetch({ limit: batchSize }).catch(err => {
                    console.error('Error Fetch Purge:', err.message);
                    return null;
                });

                if (!fetched || fetched.size === 0) break;

                const fresh = fetched.filter(m => (Date.now() - m.createdTimestamp) < 1209600000);
                const old = fetched.filter(m => (Date.now() - m.createdTimestamp) >= 1209600000);

                if (fresh.size > 0) {
                    const del = await targetChannel.bulkDelete(fresh, true).catch(() => null);
                    if (del) deletedTotal += del.size;
                    else {
                        for (const msg of fresh.values()) {
                            await msg.delete().catch(() => {});
                            deletedTotal++;
                        }
                    }
                }

                if (old.size > 0) {
                    for (const msg of old.values()) {
                        await msg.delete().catch(() => {});
                        deletedTotal++;
                        if (deletedTotal >= amount) break;
                    }
                }

                remaining = amount - deletedTotal;
                
                await interaction.editReply({ 
                    content: `[...] Limpieza en curso: ${deletedTotal} / ${amount} mensajes borrados...`,
                    embeds: [] 
                }).catch(() => {});

                if (remaining > 0 && delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                if (fetched.size < batchSize) break;
            }

            return await interaction.editReply({ 
                content: `[OK] Se han purgado ${deletedTotal} mensajes correctamente.`,
                embeds: []
            }).catch(() => {});

        } catch (error) {
            console.error('Error Critico en Purge:', error.message);
            return await interaction.editReply({ content: '[!] ERROR DE OPERACION: Verifica que el bot tenga permisos de Gestionar Mensajes.' }).catch(() => {});
        }
    },
};
