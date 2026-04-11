const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, RoleSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addroleuser')
        .setDescription('👑 Da múltiples roles a un usuario mediante un menú desplegable.')
        .addUserOption(opt => opt.setName('usuario').setDescription('El usuario al que quieres dar roles').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario');
        
        // Verificamos permisos básicos
        if (targetUser.bot) {
            return interaction.reply({ content: '❌ No puedes dar roles a un bot mediante este sistema.', flags: 64 });
        }

        const roleMenu = new RoleSelectMenuBuilder()
            .setCustomId(`role_add_user_${targetUser.id}`)
            .setPlaceholder('Elige todos los roles que quieras darle...')
            .setMinValues(1)
            .setMaxValues(15);

        const row = new ActionRowBuilder().addComponents(roleMenu);

        return interaction.reply({ 
            content: `🎭 **Gestor de Roles CDR**\nSelecciona los roles que quieres aplicar a <@${targetUser.id}>:`,
            components: [row],
            flags: 64
        });
    },
};
