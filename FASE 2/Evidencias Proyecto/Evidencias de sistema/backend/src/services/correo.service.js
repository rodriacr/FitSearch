// Envío de correos por SMTP con Nodemailer (DAS, D14). La cuenta del proyecto es fitsearchoficial@gmail.com, con una
// contraseña de aplicación de Gmail en backend/.env (11-11-2026).
// Si las credenciales no están configuradas, el contenido se muestra en la consola para poder probar el flujo en desarrollo.
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config/env');

function smtpConfigurado() {
  const { usuario, contrasena } = config.smtp;
  return Boolean(usuario && contrasena && contrasena !== 'CAMBIAR');
}

// Qué falta para que los correos salgan de verdad (11-11-2026). server.js lo avisa al arrancar: antes, sin SMTP_USUARIO o
// con la contraseña de ejemplo, ningún correo salía y no había ninguna señal fuera de la consola de cada envío.
function faltantesSmtp() {
  const { usuario, contrasena } = config.smtp;
  return [!usuario && 'SMTP_USUARIO', (!contrasena || contrasena === 'CAMBIAR') && 'SMTP_CONTRASENA'].filter(Boolean);
}

let transporte;
function obtenerTransporte() {
  if (!transporte) {
    const { host, puerto, usuario, contrasena } = config.smtp;
    transporte = nodemailer.createTransport({
      host,
      port: puerto,
      secure: puerto === 465,
      auth: { user: usuario, pass: contrasena },
      // Si Gmail no responde, el envío falla en segundos en vez de quedar esperando.
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }
  return transporte;
}

function cerrarTransporte() {
  transporte?.close();
  transporte = undefined;
}

// ---------- Plantilla (11-11-2026) ----------
// Diseño pedido por el PO: encabezado con el logo y el lema, ícono grande según el aviso, saludo, panel con el detalle,
// «¿Qué debes hacer?», botón naranjo, nota, despedida y aviso de mensaje automático. Hecho con tablas y estilos en
// línea para que se vea igual en Gmail, Outlook y el celular. Las imágenes van adjuntas dentro del correo (cid): la app
// corre en un servidor sin dirección pública y Gmail no muestra imágenes en data URI.
const CARPETA_IMAGENES = path.join(__dirname, '..', 'recursos', 'correo');
const AZUL = '#0b4f80';
const TEXTO = '#1c2b39';
const TEXTO_SUAVE = '#5f6f80';
const FONDO = '#eaf3fa';
const PANEL = '#f3f8fc';
const BORDE = '#dde8f1';
// Naranjo del botón: con texto blanco de 19 px en negrita (texto grande) el contraste es 3,6:1, sobre el mínimo de 3:1.
const NARANJO_BOTON = '#e0600b';
const FUENTE = "Poppins, 'Segoe UI', Arial, Helvetica, sans-serif";
const ESTADOS = {
  pendiente: { fondo: '#fff1e6', texto: '#9a3d06' },
  confirmada: { fondo: '#e4f4ec', texto: '#17663f' },
  cancelada: { fondo: '#fdeaea', texto: '#a3201a' },
};

const escapar = (texto) => String(texto).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
// Texto con **negrita**: en HTML se marca con <strong> y en la versión de texto se quitan los asteriscos.
const enHtml = (texto) => escapar(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const enTexto = (texto) => String(texto).replace(/\*\*(.+?)\*\*/g, '$1');

function plantilla({ asunto, icono, titulo, nombre, intro, seccion, detalles = [], pasos, boton, nota }) {
  const imagenes = new Set(['encabezado', 'firma', `icono-${icono}`]);
  const img = (nombreImagen, ancho, alto, alt = '', estilo = '') => {
    imagenes.add(nombreImagen);
    return `<img src="cid:${nombreImagen}@fitsearch" width="${ancho}" height="${alto}" alt="${escapar(alt)}" style="display:block;border:0;outline:none;${estilo}">`;
  };
  const parrafo = (texto, estilo = '') => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;${estilo}">${enHtml(texto)}</p>`;
  const subtitulo = (texto) => `<h2 style="margin:0 0 8px;font-size:17px;line-height:1.4;font-weight:700;color:${AZUL}">${escapar(texto)}</h2>`;

  const filas = detalles.map((d, i) => {
    const estado = d.estado && ESTADOS[d.estado];
    const valor = estado
      ? `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:${estado.fondo};color:${estado.texto};font-weight:700">${escapar(d.valor)}</span>`
      : escapar(d.valor);
    const borde = i ? `border-top:1px solid ${BORDE};` : '';
    return `<tr>
              <td width="34" valign="middle" style="${borde}padding:11px 0;width:34px">${img(`detalle-${d.icono}`, 22, 22)}</td>
              <td class="etiqueta" valign="middle" style="${borde}padding:11px 12px 11px 0;width:40%;font-size:14px;line-height:1.4;color:${TEXTO_SUAVE}">${escapar(d.etiqueta)}</td>
              <td valign="middle" style="${borde}padding:11px 0;font-size:15px;line-height:1.4;font-weight:700;color:${TEXTO}">${valor}</td>
            </tr>`;
  }).join('\n            ');

  const panel = seccion || detalles.length
    ? `<tr><td class="panel" style="padding:22px 24px;background:${PANEL};border:1px solid ${BORDE};border-radius:16px;text-align:left">
          ${seccion ? subtitulo(seccion.titulo) : ''}
          ${seccion?.texto ? parrafo(seccion.texto, `font-size:15px;${detalles.length ? '' : 'margin:0;'}`) : ''}
          ${detalles.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${filas}
          </table>` : ''}
        </td></tr>
        <tr><td style="height:24px;line-height:24px;font-size:0">&nbsp;</td></tr>`
    : '';

  const accion = boton
    ? `<tr><td align="center" style="padding:6px 0 0">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
            <td bgcolor="${NARANJO_BOTON}" style="border-radius:12px;background:${NARANJO_BOTON}">
              <a href="${escapar(boton.enlace)}" target="_blank" style="display:inline-block;padding:14px 30px;border-radius:12px;font-family:${FUENTE};font-size:19px;font-weight:700;line-height:1.3;color:#ffffff;text-decoration:none">${boton.icono ? `${img(`boton-${boton.icono}`, 20, 20, '', 'display:inline-block;vertical-align:-3px;margin-right:10px')}` : ''}${escapar(boton.texto)}</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="padding:16px 0 0;font-size:13px;line-height:1.5;color:${TEXTO_SUAVE}">
          Si el botón no funciona, copia este enlace en tu navegador:<br>
          <a href="${escapar(boton.enlace)}" target="_blank" style="display:inline-block;margin-top:8px;padding:6px 14px;border-radius:999px;background:${PANEL};border:1px solid ${BORDE};color:${AZUL};word-break:break-all">${escapar(boton.enlace)}</a>
        </td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapar(asunto)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&amp;display=swap" rel="stylesheet">
<style>
  @media screen and (max-width: 520px) {
    .tarjeta { padding: 4px 18px 28px !important; }
    .titulo { font-size: 23px !important; }
    .panel { padding: 18px 16px !important; }
    .etiqueta { width: 38% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${FONDO};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${FONDO}">${escapar(enTexto(intro))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${FONDO}" style="background:${FONDO}">
  <tr><td align="center" style="padding:24px 12px 32px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
      <tr><td style="font-size:0;line-height:0">${img('encabezado', 600, 110, 'FitSearch. Tu salud y bienestar, en un solo lugar', 'width:100%;max-width:600px;height:auto')}</td></tr>
      <tr><td class="tarjeta" bgcolor="#ffffff" style="background:#ffffff;border-radius:0 0 20px 20px;padding:4px 40px 32px;font-family:${FUENTE};color:${TEXTO};text-align:center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center" style="padding:0 0 12px">${img(`icono-${icono}`, 120, 120, '', 'margin:0 auto')}</td></tr>
          <tr><td align="center">
            <h1 class="titulo" style="margin:0 0 16px;font-size:27px;line-height:1.25;font-weight:700;color:${AZUL}">${escapar(titulo)}</h1>
            <p style="margin:0 0 8px;font-size:18px;line-height:1.5;font-weight:600;color:${TEXTO}">¡Hola, ${escapar(nombre)}!</p>
            ${parrafo(intro, 'margin:0 0 24px')}
          </td></tr>
          ${panel}
          ${pasos ? `<tr><td style="text-align:left;padding:0 4px 8px">
            ${subtitulo(pasos.titulo)}
            ${parrafo(pasos.texto, 'font-size:15px;margin:0 0 18px')}
          </td></tr>` : ''}
          ${accion}
          ${nota ? `<tr><td style="padding:24px 0 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding:14px 18px;background:#fff6ef;border-left:4px solid #f47b20;border-radius:10px;text-align:left;font-size:14px;line-height:1.55;color:${TEXTO}">${enHtml(nota)}</td>
            </tr></table>
          </td></tr>` : ''}
          <tr><td style="padding:28px 0 0"><div style="height:1px;line-height:1px;font-size:0;background:${BORDE}">&nbsp;</div></td></tr>
          <tr><td align="center" style="padding:22px 0 0">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.5;font-weight:700;color:${AZUL}">Gracias por formar parte de FitSearch.</p>
            ${img('firma', 210, 48, 'FitSearch', 'margin:0 auto')}
            <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:${TEXTO_SUAVE}">Tu salud y bienestar, en un solo lugar.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:20px 16px 0;font-family:${FUENTE};font-size:12px;line-height:1.6;color:${TEXTO_SUAVE}">
        Este es un mensaje automático. Por favor, no respondas directamente a este correo.<br>
        Recibes este correo porque tienes una cuenta en FitSearch.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const bloque = (titulo, ...lineas) => [titulo.toUpperCase(), ...lineas].join('\n');
  const texto = [
    `¡Hola, ${nombre}!`,
    enTexto(intro),
    (seccion || detalles.length) && bloque(
      seccion?.titulo || 'Detalle',
      ...(seccion?.texto ? [enTexto(seccion.texto)] : []),
      ...detalles.map((d) => `- ${d.etiqueta}: ${d.valor}`),
    ),
    pasos && bloque(pasos.titulo, enTexto(pasos.texto)),
    boton && `${boton.texto}: ${boton.enlace}`,
    nota && enTexto(nota),
    'Gracias por formar parte de FitSearch.\nFitSearch\nTu salud y bienestar, en un solo lugar.',
    'Este es un mensaje automático. Por favor, no respondas directamente a este correo.',
  ].filter(Boolean).join('\n\n');

  const adjuntos = [...imagenes].map((nombreImagen) => ({
    filename: `${nombreImagen}.png`,
    path: path.join(CARPETA_IMAGENES, `${nombreImagen}.png`),
    cid: `${nombreImagen}@fitsearch`,
  }));
  return { asunto, texto, html, adjuntos };
}

function contenidoRecuperacion({ nombre, enlace, minutos }) {
  return plantilla({
    asunto: 'FitSearch | Restablece tu contraseña',
    icono: 'candado',
    titulo: 'Restablece tu contraseña',
    nombre,
    intro: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de FitSearch.',
    seccion: { titulo: 'Sobre este enlace' },
    detalles: [
      { icono: 'reloj', etiqueta: 'Vence en', valor: `${minutos} minutos` },
      { icono: 'llave', etiqueta: 'Uso', valor: 'Una sola vez' },
    ],
    pasos: {
      titulo: '¿Qué debes hacer?',
      texto: 'Crea tu nueva contraseña con el botón. Al guardarla, se cerrarán las sesiones abiertas de tu cuenta.',
    },
    boton: { texto: 'Crear nueva contraseña', enlace, icono: 'candado' },
    nota: 'Si no fuiste tú, ignora este correo: **tu contraseña no cambiará**.',
  });
}

// Avisos de la agenda: aviso.service arma el contenido y aquí se le pone la plantilla. El botón abre la pantalla de
// FitSearch donde se resuelve el aviso.
function contenidoAviso({ accion, ...contenido }) {
  return plantilla({
    ...contenido,
    boton: accion && { texto: accion.texto, enlace: `${config.urlFrontend}${accion.ruta}`, icono: accion.icono },
  });
}

async function enviar({ para, asunto, texto, html, adjuntos = [] }) {
  if (!smtpConfigurado()) {
    console.info(`[correo sin SMTP configurado] Para: ${para}\nAsunto: ${asunto}\n${texto}`);
    return;
  }
  await obtenerTransporte().sendMail({
    from: config.smtp.remitente, to: para, subject: asunto, text: texto, html, attachments: adjuntos,
  });
}

const enviarRecuperacion = async (datos) => enviar({ para: datos.para, ...contenidoRecuperacion(datos) });
const enviarAviso = async (datos) => enviar({ para: datos.para, ...contenidoAviso(datos) });

module.exports = {
  enviarRecuperacion, enviarAviso, enviar, contenidoRecuperacion, contenidoAviso, smtpConfigurado, faltantesSmtp, cerrarTransporte,
};
