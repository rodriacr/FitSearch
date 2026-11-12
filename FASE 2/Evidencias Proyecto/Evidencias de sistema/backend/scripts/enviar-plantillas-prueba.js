// Muestra de cada correo que envía FitSearch (11-11-2026), armada con el mismo código de la aplicación y datos de ejemplo:
// recuperación de contraseña y los avisos de la agenda. No usa la base de datos ni enlaces reales de recuperación.
//
//   npm run smtp:plantillas -- --guardar <carpeta>                     escribe cada correo como .html (sin enviar nada)
//   npm run smtp:plantillas -- --destinatario <correo> --enviar        los envía todos a ese buzón, con «[Muestra]» en el asunto
const fs = require('fs');
const path = require('path');
const config = require('../src/config/env');
const correo = require('../src/services/correo.service');
const modelo = require('../src/models/aviso.model');
const avisos = require('../src/services/aviso.service');

const argumento = (nombre) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

// Personas y cita de ejemplo: todas escriben al buzón indicado (o a una dirección de ejemplo si solo se guardan).
function ejemplo(para) {
  const persona = (nombre) => ({ id: 1, nombre, correo: para, activo: true });
  const manana = new Date();
  manana.setUTCDate(manana.getUTCDate() + 1);
  const disponibilidad = {
    fecha: new Date(`${manana.toISOString().slice(0, 10)}T00:00:00Z`),
    horaInicio: new Date('1970-01-01T09:00:00Z'),
    horaFin: new Date('1970-01-01T10:00:00Z'),
    profesional: { id: 1, avisosCorreo: true, recordatorios: true, especialidad: 'Nutrición', usuario: persona('Daniela Soto') },
  };
  const reserva = (cambios) => ({
    id: 1, estado: 'pendiente', modalidad: 'presencial', primeraVisita: true, canceladaPor: null,
    usuario: persona('Camila Rojas'), disponibilidad, ...cambios,
  });
  return { persona, disponibilidad, reserva };
}

// Arma los correos en orden con las funciones reales; en vez de enviarlos, los junta.
async function armar(para) {
  const { persona, disponibilidad, reserva } = ejemplo(para);
  const correos = [];
  const aviso = correo.enviarAviso;
  const recuperacion = correo.enviarRecuperacion;
  const consultas = { ...modelo };
  correo.enviarAviso = async (datos) => { correos.push({ para: datos.para, ...correo.contenidoAviso(datos) }); };
  correo.enviarRecuperacion = async (datos) => { correos.push({ para: datos.para, ...correo.contenidoRecuperacion(datos) }); };
  try {
    await correo.enviarRecuperacion({
      para, nombre: 'Camila', minutos: config.recuperacionMinutos,
      enlace: `${config.urlFrontend}/restablecer-contrasena?token=enlace-de-muestra-sin-validez`,
    });
    for (const cambios of [
      { estado: 'pendiente' },
      { estado: 'confirmada' },
    ]) {
      modelo.datosReserva = async () => reserva(cambios);
      await avisos.reservaCreada(1);
    }
    for (const cambios of [
      { estado: 'confirmada' },
      { estado: 'cancelada', canceladaPor: 'profesional' },
      { estado: 'cancelada', canceladaPor: 'usuario' },
    ]) {
      modelo.datosReserva = async () => reserva(cambios);
      await avisos.reservaCambiada(1);
    }
    modelo.listaEspera = async () => ({ filas: [{ id: 1, usuario: persona('Camila Rojas') }], profesional: disponibilidad.profesional });
    modelo.tomarDeLaLista = async () => true;
    modelo.sacarDeLaLista = async () => {};
    modelo.soltarDeLaLista = async () => {};
    await avisos.horaLiberada(1);
    await avisos.recordatorio(reserva({ estado: 'confirmada' }));
  } finally {
    correo.enviarAviso = aviso;
    correo.enviarRecuperacion = recuperacion;
    Object.assign(modelo, consultas);
  }
  return correos;
}

async function principal() {
  const carpeta = argumento('--guardar');
  const para = argumento('--destinatario');
  const enviar = process.argv.includes('--enviar');

  if (carpeta) {
    const correos = await armar('persona@ejemplo.cl');
    fs.mkdirSync(carpeta, { recursive: true });
    correos.forEach((c, i) => {
      const nombre = c.asunto.replace(/^FitSearch \| /, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      // Las imágenes van adjuntas (cid) en el correo; en la vista guardada se copian al lado del HTML.
      c.adjuntos.forEach((a) => fs.copyFileSync(a.path, path.join(carpeta, a.filename)));
      fs.writeFileSync(path.join(carpeta, `${String(i + 1).padStart(2, '0')}-${nombre}.html`), c.html.replace(/cid:([\w-]+)@fitsearch/g, '$1.png'));
    });
    console.log(`${correos.length} correos guardados en ${carpeta}.`);
    return;
  }

  if (!para || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para) || !enviar) {
    throw Object.assign(new Error('Uso: --guardar <carpeta>, o --destinatario <correo> --enviar para enviar las muestras.'), { deUso: true });
  }
  if (!correo.smtpConfigurado()) {
    throw Object.assign(new Error(`SMTP pendiente: falta ${correo.faltantesSmtp().join(' y ')} en backend/.env. No se envió ningún correo.`), { deUso: true });
  }
  const correos = await armar(para);
  try {
    for (const c of correos) {
      await correo.enviar({ ...c, para, asunto: `[Muestra] ${c.asunto}` });
      console.log(`Enviado: ${c.asunto}`);
    }
    console.log(`${correos.length} correos de muestra enviados. Revisa el buzón (y la carpeta de spam).`);
  } finally {
    correo.cerrarTransporte();
  }
}

if (require.main === module) {
  principal().catch((error) => {
    process.exitCode = 1;
    if (error.deUso) {
      console.error(error.message);
      return;
    }
    console.error(`Error SMTP: ${error.code || 'sin código'}${error.responseCode ? ` (${error.responseCode})` : ''}. No se terminaron de enviar las muestras.`);
  });
}

module.exports = { armar };
