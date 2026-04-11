const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    RoleSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('Crea un anuncio elegante con un menú de roles interactivo.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // 1. Titulo
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('Título del anuncio')
                .setRequired(true)
        )

        // 2. Texto
        .addStringOption(option =>
            option.setName('texto')
                .setDescription('Contenido del mensaje (usa \\n para saltos)')
                .setRequired(true)
        )

        // 3. Canal
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal donde se enviará el anuncio')
                .setRequired(true)
        )

        // 4. Imagen/Video (Archivo)
        .addAttachmentOption(option =>
            option.setName('archivo')
                .setDescription('Adjunta una imagen o video para el anuncio')
                .setRequired(false)
        )

        // 5. Imagen (URL)
        .addStringOption(option =>
            option.setName('imagen_url')
                .setDescription('Enlace directo a una imagen (opcional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({
                content: '[X] Los anuncios solo se pueden enviar dentro de un servidor.',
                flags: 64
            });
        }

        const titulo    = interaction.options.getString('titulo');
        const texto     = interaction.options.getString('texto');
        const target    = interaction.options.getChannel('canal');
        const archivo   = interaction.options.getAttachment('archivo');
        const imgUrl    = interaction.options.getString('imagen_url');

        // Construir Embed de Vista Previa
        const previewEmbed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(texto.replace(/\\n/g, '\n'))
            .setColor('#5865F2')
            .setFooter({ 
                text: `Sistema CDR - Preparado por ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        if (interaction.guild.iconURL()) {
            previewEmbed.setThumbnail(interaction.guild.iconURL({ dynamic: true }));
        }

        let extraContent = null;
        
        // Manejo de imagen o video
        if (archivo) {
            const isImage = archivo.contentType?.startsWith('image/');
            const isVideo = archivo.contentType?.startsWith('video/');
            if (isImage) previewEmbed.setImage(archivo.url);
            else if (isVideo) extraContent = archivo.url;
        } else if (imgUrl) {
            previewEmbed.setImage(imgUrl);
        }

        // Fila 1: Menú de Selección de Roles
        const roleSelect = new RoleSelectMenuBuilder()
            .setCustomId('anuncio_roles')
            .setPlaceholder('Selecciona los roles a etiquetar (opcional)')
            .setMinValues(0)
            .setMaxValues(10); // Límite razonable

        const rowRoles = new ActionRowBuilder().addComponents(roleSelect);

        // Fila 2: Botones de Acción
        const btnEnviar = new ButtonBuilder()
            .setCustomId('anuncio_send')
            .setLabel('Enviar Anuncio')
            .setStyle(ButtonStyle.Success);

        const btnCancelar = new ButtonBuilder()
            .setCustomId('anuncio_cancel')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger);

        const rowButtons = new ActionRowBuilder().addComponents(btnEnviar, btnCancelar);

        const response = await interaction.reply({
            content: `**[ VISTA PREVIA ]**\nEsto se enviará en ${target}. Selecciona los roles que quieras mencionar y pulsa "Enviar".`,
            embeds: [previewEmbed],
            components: [rowRoles, rowButtons],
            flags: 64 // Epímero para que solo lo vea el admin
        });

        // Colector para manejar la interacción
        const collector = response.createMessageComponentCollector({
            idle: 60000 // 1 minuto de inactividad
        });

        let selectedRoles = [];

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'No te metas en lo que no te importa.', flags: 64 });
            }

            if (i.customId === 'anuncio_roles') {
                selectedRoles = i.values;
                await i.update({
                    content: `**[ VISTA PREVIA ]**\nRoles seleccionados: ${selectedRoles.length > 0 ? selectedRoles.map(r => `<@&${r}>`).join(' ') : 'Ninguno'}\nSe enviará en ${target}.`,
                    components: [rowRoles, rowButtons]
                });
            }

            if (i.customId === 'anuncio_send') {
                await i.deferUpdate();
                
                const mentionString = selectedRoles.length > 0 
                    ? selectedRoles.map(id => `<@&${id}>`).join(' ') 
                    : null;

                try {
                    // Enviar anuncio final
                    await target.send({
                        content: mentionString || undefined,
                        embeds: [previewEmbed]
                    });

                    // Si hay un video/archivo extra
                    if (extraContent) {
                        await target.send({ content: extraContent });
                    }

                    await interaction.editReply({
                        content: `[OK] Anuncio enviado correctamente en ${target}.`,
                        embeds: [],
                        components: []
                    });
                    
                    collector.stop('sent');
                } catch (err) {
                    console.error('[Anuncio] Error al enviar:', err);
                    await interaction.editReply({
                        content: '[!] ERROR: No se pudo enviar el mensaje. Revisa los permisos del bot en ese canal.',
                        components: []
                    });
                    collector.stop('error');
                }
            }

            if (i.customId === 'anuncio_cancel') {
                await interaction.editReply({
                    content: '[X] Envío cancelado por el administrador.',
                    embeds: [],
                    components: []
                });
                collector.stop('canceled');
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'idle') {
                interaction.editReply({
                    content: '[!] Tiempo agotado. Vuelve a ejecutar el comando si necesitas enviar el anuncio.',
                    embeds: [],
                    components: []
                }).catch(() => {});
            }
        });
    },
};
