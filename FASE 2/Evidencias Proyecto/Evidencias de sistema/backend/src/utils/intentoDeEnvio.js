// Marca de «envío en curso» para los avisos por correo (recordatorios y lista de espera; revisión del PR #49). Antes de
// enviar, el proceso toma la fila guardando la hora del intento: si dos procesos coinciden, solo uno la gana y nadie
// recibe dos correos. Si el correo falla, la marca se suelta para reintentar; si el proceso se cae a medio camino, la
// marca vence después de PLAZO_MINUTOS y un ciclo posterior lo vuelve a intentar.
const PLAZO_MINUTOS = 15;

// Las columnas son DATETIME(0): la marca va sin milisegundos para poder compararla después.
const marcaDe = (ahora) => new Date(Math.floor(ahora.getTime() / 1000) * 1000);

// Filas sin un intento en curso, o con uno que ya venció.
const libre = (campo, ahora) => ({
  OR: [{ [campo]: null }, { [campo]: { lt: new Date(ahora.getTime() - PLAZO_MINUTOS * 60000) } }],
});

module.exports = { PLAZO_MINUTOS, marcaDe, libre };
