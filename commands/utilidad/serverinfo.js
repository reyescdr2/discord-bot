const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Muestra los datos clave de este servidor.'),
    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: '[X] La informacion del servidor solo esta disponible dentro de servidores.', flags: 64 });
        }

        const guild = interaction.guild;
        const owner = await guild.fetchOwner();
        const channels = guild.channels;
        const emojis = guild.emojis;
        const stickers = guild.stickers;

        const embed = new EmbedBuilder()
            .setTitle(`INFORMACION DEL SERVIDOR: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .setImage(guild.bannerURL({ size: 1024 }) || null)
            .addFields(
                { name: 'Dueño', value: `${owner} (\`${owner.user.id}\`)`, inline: true },
                { name: 'Creado el', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f>`, inline: true },
                { name: 'ID del Servidor', value: `\`${guild.id}\``, inline: true },
                { name: 'Miembros', value: `\`${guild.memberCount}\``, inline: true },
                { name: 'Canales', value: `\`${channels.cache.size}\``, inline: true },
                { name: 'Roles', value: `\`${guild.roles.cache.size}\``, inline: true },
                { name: 'Elementos Visuales', value: `\`${emojis.cache.size + stickers.cache.size}\` (Emojis/Stickers)`, inline: true },
                { name: 'Nivel de Mejora', value: `\`Tier ${guild.premiumTier}\` (${guild.premiumSubscriptionCount} Boosts)`, inline: true }
            )
            .setColor('#5865F2')
            .setFooter({ text: 'Sistema CDR - Informacion del Servidor' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
