// Mejora del asistente de IA (SC-47): qué atención pidió la persona, el texto de «¿Cómo voy hoy?» y el resumen del
// perfil que se envía al proveedor solo con su permiso.
jest.mock('../../src/models/asistente.model');
const modelo = require('../../src/models/asistente.model');
const comidas = require('../../src/services/comida.service');
const agua = require('../../src/services/agua.service');
const { atencionPedida } = require('../../src/utils/atencionPedida');
const { resumenDelDia, textoResumen } = require('../../src/services/resumenDia.service');
const perfilAsistente = require('../../src/services/perfilAsistente.service');

afterEach(() => jest.restoreAllMocks());

describe('atención pedida', () => {
  test.each([
    [['Busco un kinesiólogo cerca de mi casa'], { modalidad: 'presencial', criterio: 'cercania' }],
    [['Quiero atenderme por videollamada con alguien bien evaluado'], { modalidad: 'online', criterio: 'calificacion' }],
    [['Que sea presencial y verificado'], { modalidad: 'presencial', criterio: 'verificados' }],
    [['El que tenga más estrellas'], { modalidad: null, criterio: 'calificacion' }],
    [['Me duele la rodilla'], { modalidad: null, criterio: null }],
    // El mensaje más reciente manda; si no dice nada, se mira lo anterior.
    [['Mejor online', 'Lo quiero presencial'], { modalidad: 'online', criterio: null }],
    [['Me duele la espalda', 'Prefiero en persona'], { modalidad: 'presencial', criterio: null }],
    [['Una nutricionista online que quede cerca'], { modalidad: 'online', criterio: null }],
  ])('%j → %j', (textos, esperado) => {
    expect(atencionPedida(textos)).toEqual(esperado);
  });
});

describe('¿Cómo voy hoy?', () => {
  const base = {
    fecha: '2026-11-26', calorias: { consumo: 1500, meta: 1900 }, proteinasG: { consumo: 95, meta: 110 },
    carbohidratosG: { consumo: 180, meta: 210 }, grasasG: { consumo: 50, meta: 60 }, aguaMl: { consumo: 1500, meta: 2000 },
  };

  test('arma el resumen con el consumo y el agua de hoy frente al plan', async () => {
    jest.spyOn(comidas, 'delDia').mockResolvedValue({
      objetivo: { calorias: 1900, proteinasG: 110, carbohidratosG: 210, grasasG: 60 },
      consumo: { calorias: 1500.4, proteinasG: 95.2, carbohidratosG: 180, grasasG: 49.6 },
    });
    jest.spyOn(agua, 'delDia').mockResolvedValue({ totalMl: 1500, metaMl: 2000 });
    const ahora = new Date('2026-11-26T15:00:00Z');
    expect(await resumenDelDia(7, ahora)).toEqual(base);
    expect(comidas.delDia).toHaveBeenCalledWith(7, '2026-11-26', ahora);
  });

  test('cuando va bien lo dice; cuando falta proteína o agua, da el consejo', () => {
    expect(textoResumen(base)).toBe('Así vas hoy: llevas 1.500 de 1.900 kcal (79 %) y 1.500 de 2.000 ml (75 %) de agua.\n\n¡Vas bien! Sigue así.');
    const falta = textoResumen({ ...base, proteinasG: { consumo: 40, meta: 110 }, aguaMl: { consumo: 500, meta: 2000 } });
    expect(falta).toContain('Te faltan unos 70 g de proteína');
    expect(falta).toContain('Te faltan 1.500 ml de agua: unos 6 vasos.');
  });

  test('sin registros invita a anotar comidas; pasada la meta lo advierte; sin plan pide completar el perfil', () => {
    expect(textoResumen({ ...base, calorias: { consumo: 0, meta: 1900 } })).toContain('Todavía no registras comidas hoy');
    expect(textoResumen({ ...base, calorias: { consumo: 2300, meta: 1900 } })).toContain('Ya pasaste tu meta de calorías de hoy');
    const sinPlan = textoResumen({ ...base, calorias: { consumo: 800, meta: null }, proteinasG: { consumo: 30, meta: null } });
    expect(sinPlan).toContain('Así vas hoy: llevas 800 kcal y 1.500 de 2.000 ml (75 %) de agua.');
    expect(sinPlan).toContain('Completa tu perfil');
  });
});

describe('perfil para el asistente', () => {
  test('sin permiso o sin responder no lee el perfil', async () => {
    for (const permiso of [null, 'no']) {
      modelo.permisoPerfil.mockResolvedValueOnce({ permisoPerfilIa: permiso });
      expect(await perfilAsistente.contextoPermitido(3)).toBeNull();
    }
    expect(modelo.datosDelPerfil).not.toHaveBeenCalled();
  });

  test('con permiso pero sin perfil completo lo dice; el plan se omite si no se puede calcular', async () => {
    modelo.permisoPerfil.mockResolvedValue({ permisoPerfilIa: 'perfil_salud' });
    modelo.datosDelPerfil.mockResolvedValue({ perfil: null, informacionSalud: null });
    jest.spyOn(comidas, 'objetivoDiario').mockRejectedValue(new Error('sin perfil'));
    expect(await perfilAsistente.contextoPermitido(3)).toBe('- Información de salud: todavía no la completa');
    modelo.permisoPerfil.mockResolvedValue({ permisoPerfilIa: 'perfil' });
    expect(await perfilAsistente.contextoPermitido(3)).toBe('- Autorizó usar su perfil, pero todavía no lo completa');
  });

  test('guarda y devuelve la decisión con su fecha', async () => {
    const cuando = new Date('2026-11-26T12:00:00Z');
    modelo.guardarPermisoPerfil.mockResolvedValue({ permisoPerfilIa: 'perfil', permisoPerfilIaFecha: cuando });
    expect(await perfilAsistente.guardarPermiso(3, 'perfil', cuando)).toEqual({ valor: 'perfil', fecha: cuando });
    expect(modelo.guardarPermisoPerfil).toHaveBeenCalledWith(3, 'perfil', cuando);
  });
});
