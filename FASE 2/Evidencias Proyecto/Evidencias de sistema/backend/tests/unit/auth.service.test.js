jest.mock('../../src/models/usuario.model');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../../src/models/usuario.model');
const authService = require('../../src/services/auth.service');
const { PASSWORD, usuarioDePrueba } = require('../ayudantes');

describe('auth.service', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('registrar', () => {
    test('crea el usuario con la contraseña hasheada y devuelve un token con el rol', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(null);
      usuarioModel.crearConPerfil.mockImplementation(async (datos) => usuarioDePrueba({ passwordHash: datos.passwordHash }));

      const resultado = await authService.registrar({ nombre: 'Ana Pérez', correo: 'ana@correo.cl', password: PASSWORD });

      const datosCreacion = usuarioModel.crearConPerfil.mock.calls[0][0];
      expect(datosCreacion.passwordHash).not.toBe(PASSWORD);
      expect(await bcrypt.compare(PASSWORD, datosCreacion.passwordHash)).toBe(true);
      expect(datosCreacion.rolNombre).toBe('usuario');
      expect(resultado.usuario).toEqual({ id: 1, nombre: 'Ana Pérez', correo: 'ana@correo.cl', rol: 'usuario' });
      expect(resultado.usuario).not.toHaveProperty('passwordHash');
      const token = jwt.verify(resultado.token, process.env.JWT_SECRET);
      expect(token.sub).toBe('1');
      expect(token.rol).toBe('usuario');
    });

    test('rechaza un correo ya registrado con código 409', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());

      await expect(authService.registrar({ nombre: 'Ana', correo: 'ana@correo.cl', password: PASSWORD }))
        .rejects.toMatchObject({ estado: 409 });
      expect(usuarioModel.crearConPerfil).not.toHaveBeenCalled();
    });

    test('traduce la violación de unicidad de la base de datos (P2002) a 409', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(null);
      usuarioModel.crearConPerfil.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

      await expect(authService.registrar({ nombre: 'Ana', correo: 'ana@correo.cl', password: PASSWORD }))
        .rejects.toMatchObject({ estado: 409 });
    });
  });

  describe('iniciarSesion', () => {
    test('devuelve token y usuario con credenciales correctas', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());

      const resultado = await authService.iniciarSesion({ correo: 'ana@correo.cl', password: PASSWORD });

      expect(resultado.usuario.correo).toBe('ana@correo.cl');
      expect(authService.verificarToken(resultado.token)).toEqual({ id: 1, rol: 'usuario', vencimiento: expect.any(Number) });
    });

    test('con contraseña incorrecta responde 401 con mensaje genérico', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(usuarioDePrueba());

      await expect(authService.iniciarSesion({ correo: 'ana@correo.cl', password: 'otraClave999' }))
        .rejects.toMatchObject({ estado: 401, message: authService.MENSAJE_CREDENCIALES });
    });

    test('con correo inexistente responde el mismo mensaje, sin revelar cuál dato falló', async () => {
      usuarioModel.buscarPorCorreo.mockResolvedValue(null);

      await expect(authService.iniciarSesion({ correo: 'nadie@correo.cl', password: PASSWORD }))
        .rejects.toMatchObject({ estado: 401, message: authService.MENSAJE_CREDENCIALES });
    });
  });

  test('verificarToken rechaza un token firmado con otro secreto', () => {
    const tokenFalso = jwt.sign({ rol: 'administrador' }, 'otro-secreto', { subject: '1' });
    expect(() => authService.verificarToken(tokenFalso)).toThrow();
  });
});
