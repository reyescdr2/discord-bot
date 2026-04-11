const { Schema, model } = require('mongoose');

// Este esquema maneja tanto la configuración del gremio como el rastreo de tickets individuales
const ticketSchema = new Schema({
    guildId: { type: String, required: true },
    
    // Configuración del Gremio
    settings: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },   // Canal del PANEL
        categoryId: { type: String, default: null },  // Categoría donde se crean los tickets
        staffRoleIds: { type: [String], default: [] }, // Roles que pueden ver los tickets (Soporte multirrol)
        lastTicketCount: { type: Number, default: 0 } // Para nombrar tickets incrementalmente
    },

    // Rastreo de Tickets Activos (Opcional, pero útil para evitar duplicados)
    activeTickets: [{
        userId: String,
        channelId: String,
        openedAt: { type: Date, default: Date.now }
    }]
});

module.exports = model('Ticket', ticketSchema);
