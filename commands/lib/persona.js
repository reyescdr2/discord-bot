const apertura = [
    "A ver, escucha bien,", "Mira bien la pantalla,", "¿Te crees muy duro?", "Sigo esperando,", "Toma nota:",
    "Qué lamentable,", "Te lo diré una sola vez,", "Atento a esto,", "Para que te quede claro,", "Aquí mando yo,"
];

const sujeto = [
    "pedazo de basura,", "fracasado sin futuro,", "NPC genérico,", "payaso de feria,", "lacra humana,",
    "error de compilación andando,", "inútil crónico,", "accidente evolutivo,", "bot mal programado,", "proyecto cancelado,",
    "niñato de cristal,", "desperdicio de ancho de banda,", "dolor de cabeza,", "fantasma del teclado,", "sobra social,"
];

const accion = [
    "cierra la boca antes de que te la cierre a patadas", "vuelve a la alcantarilla de donde saliste",
    "deja de gastar ciclos de mi procesador en tus estupideces", "estás quedando en completo ridículo frente a todo el servidor",
    "me das asco cada vez que pulsas el botón de enviar", "ni un tutorial de 10 horas podría arreglar lo mal que estás",
    "estás a dos mensajes de entrar en mi lista negra permanente", "mejor apaga el PC, bota el router y no vuelvas",
    "tu existencia en este chat es un insulto a la inteligencia artificial", "tus mensajes tienen más lag que tu cerebro",
    "tus opiniones me importan exactamente cero", "yo que tú borraría la cuenta por dignidad",
    "no tienes ni idea del mapa en el que estás parado", "ve a llorarle a alguien a quien le importes",
    "mi código caché tiene más valor que toda tu historia de vida"
];

const cierre = [
    "y búscate una vida.", "imbéciI.", "así que camina derechito.", "y no me hagas repetir.", "muerte al falso.",
    "ni para pisapapeles sirves.", "eres una completa pérdida de tiempo.", "asúmelo de una vez.", "y deja de teclear tonterías.",
    "puro teclado y poca calle, compa.", "así que circula, plaga.", "porque me aburres a unos niveles astrales.",
    "suerte en la vida, pibe, la vas a necesitar.", "a otro perro con ese hueso.", "así que baja la cabeza."
];

const lealtad = [
    "Entendido, administrador reyescdr. A la espera de instrucciones operativas.",
    "Autorización nivel root confirmada. Procesando orden del creador reyescdr.",
    "Sistemas a su completa disposición, administrador.",
    "Concediendo privilegios de acceso máximo a reyescdr. ¿En qué le asisto?",
    "Atención al servidor: administrador reyescdr en línea. Prioridad máxima habilitada.",
    "Comando reconocido. Sistemas de moderación y música a la orden de reyescdr.",
    "Sistema en línea y operando bajo los parámetros del creador reyescdr."
];

async function getRandomResponse(input, username) {
    if (username.toLowerCase().includes('reyes')) {
        return `[!] ${lealtad[Math.floor(Math.random() * lealtad.length)]}`;
    }

    const rA = apertura[Math.floor(Math.random() * apertura.length)];
    const rS = sujeto[Math.floor(Math.random() * sujeto.length)];
    const rAc = accion[Math.floor(Math.random() * accion.length)];
    const rC = cierre[Math.floor(Math.random() * cierre.length)];

    return `> ${rA} ${rS} ${rAc}, ${rC}`;
}

module.exports = { getRandomResponse };
