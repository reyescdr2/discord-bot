const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra el perfil completo de un usuario del barrio.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('¿A quién investigamos?')
                .setRequired(false)
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: '[X] La informacion de usuarios solo esta disponible dentro de servidores.', flags: 64 });
        }

        const user = interaction.options.getUser('usuario') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({ content: '[X] No se encontro a ese usuario en este servidor.', flags: 64 });
        }

        const roles = member.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => `${r}`)
            .join(', ') || 'Sin roles';

        const embed = new EmbedBuilder()
            .setAuthor({ name: `PERFIL DE USUARIO: ${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`Informacion Detallada`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: 'Nombre/Apodo', value: `\`${user.globalName || user.username}\``, inline: true },
                { name: 'ID de Usuario', value: `\`${user.id}\``, inline: true },
                { name: 'Tipo de Cuenta', value: user.bot ? '`Bot`' : '`Usuario`', inline: true },
                { name: 'Cuenta Creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Unido al Servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: 'Roles', value: roles }
            )
            .setColor('#5865F2')
            .setFooter({ text: 'Sistema CDR - Informacion de Perfil' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
