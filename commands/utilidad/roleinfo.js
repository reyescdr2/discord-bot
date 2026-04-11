const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Muestra información sobre un rol específico del servidor.')
        .addRoleOption(option =>
            option.setName('rol')
                .setDescription('El rol que deseas investigar')
                .setRequired(true)
        ),
    async execute(interaction) {
        const role = interaction.options.getRole('rol');

        const embed = new EmbedBuilder()
            .setTitle(`INFORMACION DEL ROL: ${role.name}`)
            .setColor(role.hexColor === '#000000' ? '#5865F2' : role.hexColor)
            .addFields(
                { name: 'ID del Rol', value: `\`${role.id}\``, inline: true },
                { name: 'Color Hex', value: `\`${role.hexColor}\``, inline: true },
                { name: 'Fecha de Creacion', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Miembros con el rol', value: `\`${role.members?.size || 0}\``, inline: true },
                { name: 'Posicion en la lista', value: `\`${role.position}\``, inline: true },
                { name: 'Es Mencionable', value: role.mentionable ? '`Si`' : '`No`', inline: true },
                { name: 'Separado en lista', value: role.hoist ? '`Si`' : '`No`', inline: true },
                { name: 'Sistema Externo', value: role.managed ? '`Si`' : '`No`', inline: true }
            )
            .setFooter({ text: `Sistema CDR - Informacion de Roles`, iconURL: config.ICON_URL })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
