const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder,
    ComponentType
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📋 Centro de Ayuda: Todo lo que necesitas saber sobre el bot CDR.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('CENTRAL DE COMANDOS CDR')
      .setDescription('Bienvenido al centro de ayuda. Selecciona una categoria en el menu de abajo para ver que puedo hacer por ti.')
      .addFields(
          { name: 'Estado', value: `\`Operativo\``, inline: true },
          { name: 'Comandos Totales', value: `\`${interaction.client.commands.size}\``, inline: true }
      )
      .setColor('#5865F2')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: 'Sistema CDR - Soporte tecnico' });

    const select = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('Selecciona una categoria...')
        .addOptions(
            new StringSelectMenuOptionBuilder().setLabel('Inicio').setValue('home').setDescription('Volver al menu principal.'),
            new StringSelectMenuOptionBuilder().setLabel('Moderacion').setValue('moderacion').setDescription('Limpieza y orden del servidor.'),
            new StringSelectMenuOptionBuilder().setLabel('Musica').setValue('musica').setDescription('Reproductor de audio.'),
            new StringSelectMenuOptionBuilder().setLabel('Configuracion').setValue('config').setDescription('Ajustes del bot.'),
            new StringSelectMenuOptionBuilder().setLabel('Utilidad').setValue('utilidad').setDescription('Informacion y herramientas.'),
            new StringSelectMenuOptionBuilder().setLabel('Diversion').setValue('diversion').setDescription('Contenido variado.')
        );

    const row = new ActionRowBuilder().addComponents(select);

    const response = await interaction.reply({ embeds: [embed], components: [row] });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: '[X] Este menu no es para ti.', flags: 64 });

        const category = i.values[0];
        let categoryName = '';
        let commandsList = '';

        if (category === 'home') {
            return i.update({ embeds: [embed], components: [row] });
        }

        categoryName = category.charAt(0).toUpperCase() + category.slice(1);
        
        const categoryMap = {
            'moderacion': ['ban', 'kick', 'mute', 'unban', 'unmute', 'purge', 'anuncio', 'test'],
            'musica': ['play', 'skip', 'stop', 'pause', 'resume', 'queue'],
            'config': ['setup', 'autorole'],
            'utilidad': ['userinfo', 'serverinfo', 'botinfo', 'roleinfo', 'ping', 'help'],
            'diversion': ['rule34', 'waifus']
        };

        const cmds = categoryMap[category] || [];
        commandsList = cmds.map(name => {
            const cmd = interaction.client.commands.get(name);
            return cmd ? `**/${cmd.data.name}**\n${cmd.data.description}` : '';
        }).filter(line => line !== '').join('\n\n');

        const categoryEmbed = new EmbedBuilder()
            .setTitle(`LISTA DE COMANDOS: ${categoryName.toUpperCase()}`)
            .setDescription(commandsList || 'No hay comandos registrados aqui todavia.')
            .setColor('#5865F2')
            .setFooter({ text: 'Sistema CDR - Gestion de Comandos' });

        await i.update({ embeds: [categoryEmbed], components: [row] });
    });

    collector.on('end', () => {
        response.edit({ components: [] }).catch(() => {});
    });
  }
};
