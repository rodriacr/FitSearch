// Pruebas de la validación del token de identidad de Google (FS-HU-16). Se simula la librería oficial:
// lo que se comprueba aquí es que solo se acepten tokens de esta aplicación y con el correo verificado.
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

const googleService = require('../../src/services/google.service');

const datosDeGoogle = (sobrescribir = {}) => ({
  sub: '113355779911',
  email: 'Ana@Correo.cl',
  email_verified: true,
  name: 'Ana Pérez',
  ...sobrescribir,
});

const responderConDatos = (datos) => mockVerifyIdToken.mockResolvedValue({ getPayload: () => datos });

describe('google.service: validación del token de identidad', () => {
  beforeEach(() => jest.clearAllMocks());

  test('acepta el token y normaliza el correo a minúsculas', async () => {
    responderConDatos(datosDeGoogle());

    await expect(googleService.verificarCredencial('token')).resolves.toEqual({
      googleId: '113355779911', correo: 'ana@correo.cl', nombre: 'Ana Pérez' });
    // El token solo es válido si fue emitido para el ID de cliente de FitSearch.
    expect(mockVerifyIdToken).toHaveBeenCalledWith({ idToken: 'token', audience: process.env.GOOGLE_CLIENT_ID });
  });

  test('rechaza el token si Google no lo valida (firma inválida, vencido o de otra aplicación)', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

    await expect(googleService.verificarCredencial('token')).rejects.toMatchObject({
      estado: 401, message: googleService.MENSAJE_CREDENCIAL });
  });

  test('rechaza la cuenta si Google no confirma el correo', async () => {
    responderConDatos(datosDeGoogle({ email_verified: false }));

    await expect(googleService.verificarCredencial('token')).rejects.toMatchObject({
      estado: 401, message: googleService.MENSAJE_CORREO });
  });

  test('si Google no entrega el nombre, usa la parte inicial del correo', async () => {
    responderConDatos(datosDeGoogle({ name: '   ' }));

    await expect(googleService.verificarCredencial('token')).resolves.toMatchObject({ nombre: 'Ana' });
  });
});
