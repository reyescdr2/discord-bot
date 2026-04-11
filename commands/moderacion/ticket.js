const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, RoleSelectMenuBuilder, ChannelType } = require('discord.js');
const Ticket = require('../../models/Ticket');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('📩 Configura y envía el panel de soporte al canal actual.')
        .addChannelOption(opt => 
            opt.setName('categoria')
            .setDescription('Categoría donde se crearán los canales de tickets')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const category = interaction.options.getChannel('categoria');

        await interaction.deferReply({ flags: 64 });

        let ticketConfig = await Ticket.findOne({ guildId }) || new Ticket({ guildId });
        
        if (!ticketConfig.settings.enabled) {
            return interaction.editReply({ 
                content: '❌ **Error:** El sistema de tickets está desactivado.\nUsa `/setup tickets` para activarlo.', 
                flags: 64 
            });
        }

        // Guardamos la categoría elegida
        ticketConfig.settings.categoryId = category.id;
        await ticketConfig.save();

        const roleMenu = new RoleSelectMenuBuilder()
            .setCustomId('ticket_roles_setup')
            .setPlaceholder('Selecciona los roles que verán los tickets...')
            .setMinValues(1)
            .setMaxValues(10);

        const row = new ActionRowBuilder().addComponents(roleMenu);

        return interaction.editReply({ 
            content: `🎫 **Configurando Panel de Soporte**\nCategoría: **${category.name}**\n\n👇 **Ahora selecciona los roles de staff que podrán ver los tickets:**\n(Al terminar, el panel se enviará automáticamente aquí)`,
            components: [row]
        });
    },
};
