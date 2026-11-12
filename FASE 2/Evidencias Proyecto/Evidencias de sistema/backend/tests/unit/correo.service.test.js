// Correo de FitSearch (11-11-2026): plantilla común, envío por SMTP y lectura de la configuración del .env.
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('../../src/config/env', () => ({
  urlFrontend: 'https://fitsearch.example',
  smtp: { host: 'smtp.gmail.com', puerto: 465, usuario: '', contrasena: 'CAMBIAR', remitente: '' },
}));
const fs = require('fs');
const nodemailer = require('nodemailer');
const config = require('../../src/config/env');
const correo = require('../../src/services/correo.service');

const sendMail = jest.fn();
const close = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  nodemailer.createTransport.mockReturnValue({ sendMail, close });
  Object.assign(config.smtp, { usuario: 'fitsearchoficial@gmail.com', contrasena: 'abcdefghijklmnop', remitente: 'FitSearch <fitsearchoficial@gmail.com>' });
  correo.cerrarTransporte();
});

describe('configuración pendiente', () => {
  test('sin cuenta ni contraseña de aplicación dice qué falta y muestra el correo en la consola', async () => {
    Object.assign(config.smtp, { usuario: '', contrasena: 'CAMBIAR' });
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    expect(correo.smtpConfigurado()).toBe(false);
    expect(correo.faltantesSmtp()).toEqual(['SMTP_USUARIO', 'SMTP_CONTRASENA']);
    await correo.enviarAviso({ para: 'camila@ejemplo.cl', nombre: 'Camila', asunto: 'Tu cita fue confirmada', icono: 'confirmada', titulo: 'Tu cita está confirmada', intro: 'Listo.' });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining('Asunto: Tu cita fue confirmada'));
    info.mockRestore();
  });

  test('con la cuenta configurada no falta nada', () => {
    expect(correo.smtpConfigurado()).toBe(true);
    expect(correo.faltantesSmtp()).toEqual([]);
  });
});

describe('envío', () => {
  test('usa Gmail por SSL con tiempos límite y el remitente del proyecto', async () => {
    await correo.enviarAviso({
      para: 'daniela@ejemplo.cl', nombre: 'Daniela', asunto: 'Tienes una solicitud de reserva', icono: 'solicitud',
      titulo: 'Nueva solicitud de reserva', intro: 'Camila pidió una hora.', accion: { texto: 'Abrir mi agenda', ruta: '/profesional/agenda' },
    });
    expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: 'fitsearchoficial@gmail.com', pass: 'abcdefghijklmnop' },
      connectionTimeout: expect.any(Number), socketTimeout: expect.any(Number),
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'FitSearch <fitsearchoficial@gmail.com>', to: 'daniela@ejemplo.cl', subject: 'Tienes una solicitud de reserva',
      attachments: expect.arrayContaining([expect.objectContaining({ cid: 'encabezado@fitsearch' })]),
    }));
  });

  test('reutiliza la conexión entre correos y la cierra al terminar', async () => {
    await correo.enviar({ para: 'a@ejemplo.cl', asunto: 'Uno', texto: '1', html: '<p>1</p>' });
    await correo.enviar({ para: 'b@ejemplo.cl', asunto: 'Dos', texto: '2', html: '<p>2</p>' });
    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    correo.cerrarTransporte();
    expect(close).toHaveBeenCalled();
  });

  test('un error de Gmail llega a quien envía (el aviso lo registra sin detener la operación)', async () => {
    sendMail.mockRejectedValueOnce(Object.assign(new Error('Invalid login'), { code: 'EAUTH' }));
    await expect(correo.enviarRecuperacion({ para: 'a@ejemplo.cl', nombre: 'Ana', enlace: 'https://x/y', minutos: 60 }))
      .rejects.toMatchObject({ code: 'EAUTH' });
  });
});

describe('plantilla', () => {
  const aviso = (cambios = {}) => correo.contenidoAviso({
    nombre: 'Daniela', asunto: 'FitSearch | Nueva solicitud de reserva', icono: 'solicitud', titulo: 'Nueva solicitud de reserva',
    intro: 'Tienes una nueva solicitud de reserva en FitSearch.',
    seccion: { titulo: 'Nueva solicitud de atención', texto: '**Camila Rojas** ha solicitado reservar una hora contigo.' },
    detalles: [
      { icono: 'calendario', etiqueta: 'Fecha', valor: 'Jueves 12 de noviembre' },
      { icono: 'estado', etiqueta: 'Estado', valor: 'Pendiente de confirmación', estado: 'pendiente' },
    ],
    pasos: { titulo: '¿Qué debes hacer?', texto: 'Ingresa a tu agenda.' },
    accion: { texto: 'Revisar solicitud en mi agenda', ruta: '/profesional/agenda', icono: 'calendario' },
    nota: 'Recuerda que la reserva todavía no está confirmada.',
    ...cambios,
  });

  test('sigue la estructura del PO: saludo, panel con el detalle, qué hacer, botón, nota, despedida y aviso automático', () => {
    const { html, texto } = aviso();
    const orden = ['¡Hola, Daniela!', 'Nueva solicitud de atención', 'Jueves 12 de noviembre', '¿Qué debes hacer?',
      'Revisar solicitud en mi agenda', 'Recuerda que la reserva', 'Gracias por formar parte de FitSearch.', 'Este es un mensaje automático'];
    const posiciones = orden.map((parte) => html.indexOf(parte));
    expect(posiciones.every((p) => p > 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
    expect(html).toContain('<strong>Camila Rojas</strong> ha solicitado');
    expect(html).toContain('href="https://fitsearch.example/profesional/agenda"');
    expect(html).toContain('lang="es"');
    // Estado con su color, además del texto.
    expect(html).toMatch(/background:#fff1e6;color:#9a3d06;font-weight:700">Pendiente de confirmación/);
    // Botón naranjo: texto blanco de 19 px en negrita (texto grande) con contraste sobre 3:1.
    expect(html).toContain('background:#e0600b');
    expect(html).toMatch(/font-size:19px;font-weight:700;line-height:1.3;color:#ffffff/);
    expect(texto).toBe([
      '¡Hola, Daniela!',
      'Tienes una nueva solicitud de reserva en FitSearch.',
      'NUEVA SOLICITUD DE ATENCIÓN\nCamila Rojas ha solicitado reservar una hora contigo.\n- Fecha: Jueves 12 de noviembre\n- Estado: Pendiente de confirmación',
      '¿QUÉ DEBES HACER?\nIngresa a tu agenda.',
      'Revisar solicitud en mi agenda: https://fitsearch.example/profesional/agenda',
      'Recuerda que la reserva todavía no está confirmada.',
      'Gracias por formar parte de FitSearch.\nFitSearch\nTu salud y bienestar, en un solo lugar.',
      'Este es un mensaje automático. Por favor, no respondas directamente a este correo.',
    ].join('\n\n'));
  });

  test('cada imagen del HTML va adjunta (cid) y existe en src/recursos/correo', () => {
    for (const { html, adjuntos } of [aviso(), correo.contenidoRecuperacion({ nombre: 'Ana', enlace: 'https://x/y', minutos: 60 })]) {
      const usadas = [...html.matchAll(/src="cid:([\w-]+)@fitsearch"/g)].map(([, nombre]) => nombre);
      expect(new Set(adjuntos.map((a) => a.cid))).toEqual(new Set(usadas.map((nombre) => `${nombre}@fitsearch`)));
      adjuntos.forEach((a) => expect(fs.existsSync(a.path)).toBe(true));
      expect(html).not.toMatch(/src="(data:|https?:)/);
    }
  });

  test('la recuperación trae el vencimiento, el botón y el enlace escrito', () => {
    const { asunto, texto, html, adjuntos } = correo.contenidoRecuperacion({
      nombre: 'Camila', enlace: 'https://fitsearch.example/restablecer-contrasena?token=abc&x=1', minutos: 60,
    });
    expect(asunto).toBe('FitSearch | Restablece tu contraseña');
    expect(texto).toContain('- Vence en: 60 minutos');
    expect(texto).toContain('Crear nueva contraseña: https://fitsearch.example/restablecer-contrasena?token=abc&x=1');
    expect(html.match(/href="https:\/\/fitsearch\.example\/restablecer-contrasena\?token=abc&amp;x=1"/g)).toHaveLength(2);
    expect(html).toContain('Si el botón no funciona');
    expect(adjuntos.map((a) => a.cid)).toEqual(expect.arrayContaining(['icono-candado@fitsearch', 'boton-candado@fitsearch']));
  });

  test('escapa lo que escribió una persona', () => {
    const { html } = aviso({ nombre: '<b>Daniela</b>', intro: 'Camila <script>alert(1)</script> canceló.' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('¡Hola, &lt;b&gt;Daniela&lt;/b&gt;!');
  });

  test('sin acción, sin detalle ni nota no quedan bloques vacíos', () => {
    const { html, texto, adjuntos } = aviso({ accion: undefined, seccion: undefined, detalles: [], nota: undefined });
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('Si el botón no funciona');
    expect(html).not.toContain('class="panel"');
    expect(texto).not.toContain('DETALLE');
    expect(adjuntos.some((a) => a.cid.startsWith('boton-'))).toBe(false);
  });
});

describe('lectura del .env', () => {
  const anteriores = { ...process.env };
  afterEach(() => { process.env = { ...anteriores }; });

  const leer = () => {
    let smtp;
    jest.isolateModules(() => { smtp = jest.requireActual('../../src/config/env').smtp; });
    return smtp;
  };

  test('acepta la contraseña de aplicación con los espacios con que la muestra Google', () => {
    Object.assign(process.env, { SMTP_USUARIO: ' fitsearchoficial@gmail.com ', SMTP_CONTRASENA: 'abcd efgh ijkl mnop', SMTP_REMITENTE: '' });
    const smtp = leer();
    expect(smtp.usuario).toBe('fitsearchoficial@gmail.com');
    expect(smtp.contrasena).toBe('abcdefghijklmnop');
    expect(smtp.remitente).toBe('FitSearch <fitsearchoficial@gmail.com>');
  });

  test('respeta el remitente escrito en el .env', () => {
    Object.assign(process.env, { SMTP_USUARIO: 'fitsearchoficial@gmail.com', SMTP_REMITENTE: 'Equipo FitSearch <fitsearchoficial@gmail.com>' });
    expect(leer().remitente).toBe('Equipo FitSearch <fitsearchoficial@gmail.com>');
  });
});
