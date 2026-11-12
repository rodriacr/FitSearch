import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import {
  actualizarPersonalizado, crearPersonalizado, elegirPlan, eliminarPersonalizado, guardarMetaPeso, obtenerPlan, quitarMetaPeso,
} from '../../services/comidas.service.js';
import MetaPeso from './MetaPeso.jsx';
import PlanesPersonalizados from './PlanesPersonalizados.jsx';
import { Reparto } from './RepartoMacros.jsx';
import { decimal } from './planComun.js';
import './PlanAlimentacion.css';

const { planes } = reglas.comidas;
const diaYMes = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const FUENTES = [
  ['Institute of Medicine: rangos aceptables de macronutrientes', 'https://www.nationalacademies.org/read/10490/chapter/4'],
  ['OMS: alimentación sana', 'https://www.who.int/es/news-room/fact-sheets/detail/healthy-diet'],
  ['ISSN (2017): proteína y ejercicio', 'https://pubmed.ncbi.nlm.nih.gov/28642676/'],
  ['Morton y otros (2018): proteína y entrenamiento de fuerza', 'https://pubmed.ncbi.nlm.nih.gov/28698222/'],
  ['Revisión de 2015: proteína al bajar de peso', 'https://pubmed.ncbi.nlm.nih.gov/25550460/'],
  ['Iraki y otros (2019): nutrición para ganar masa muscular', 'https://www.mdpi.com/2075-4663/7/7/154'],
  ['Declaración conjunta de 2016 sobre nutrición y rendimiento deportivo', 'https://pubmed.ncbi.nlm.nih.gov/26920240/'],
  ['Guía AHA/ACC/TOS (2013) para bajar de peso', 'https://www.ncbi.nlm.nih.gov/books/NBK278952/'],
  ['Hall y otros (2011): cómo cambia el peso con el balance de energía', 'https://pubmed.ncbi.nlm.nih.gov/21872751/'],
  ['OMS: clasificación del índice de masa corporal', 'https://www.who.int/es/news-room/fact-sheets/detail/obesity-and-overweight'],
];

// Por qué el plan de cada meta reparte así (los números salen de shared/reglas.json).
function porQue(meta, ritmo) {
  const datos = planes.metas[meta] ?? planes.metas.otro;
  const proteina = `${decimal(datos.proteinaGKg)} g de proteína por kilo`;
  const ajuste = Math.round(Math.abs(datos.ajusteCalorias) * 100);
  switch (meta) {
    case 'bajar_peso':
      return `${ritmo ? `Comes lo necesario para bajar ${decimal(ritmo)} kg por semana` : `Comes un ${ajuste} % menos de lo que gastas para bajar de forma gradual`}, con más proteína (${proteina}) para cuidar tu masa muscular.`;
    case 'aumentar_masa':
      return `${ritmo ? `Comes lo necesario para subir ${decimal(ritmo)} kg por semana` : `Comes un ${ajuste} % más de lo que gastas`} para construir músculo, con ${proteina}.`;
    case 'mejorar_rendimiento': return `Más carbohidratos (${decimal(datos.carbohidratosGKg)} g por kilo) para tener energía al entrenar, con ${proteina}.`;
    case 'mantener_peso': return `Comes lo que gastas, con ${proteina} y un ${datos.grasasPct} % de grasas.`;
    case 'otro': return `Un reparto equilibrado: ${proteina}, un ${datos.grasasPct} % de grasas y el resto en carbohidratos.`;
    default: return `Aún no eliges una meta, así que usamos un reparto equilibrado: ${proteina}, un ${datos.grasasPct} % de grasas y el resto en carbohidratos.`;
  }
}

function textoCalorias(kcal, kcalBase, { ajusteCalorias, ajusteKcal, ritmoSemanalKg, valor }) {
  if (!kcal) return 'Con tu perfil completo calculamos las calorías y los gramos de cada macronutriente.';
  if (!ajusteKcal) {
    return ajusteCalorias || ritmoSemanalKg ? 'Tu gasto estimado ya es bajo, así que no se resta nada para no quedar bajo el mínimo seguro.' : 'Igual a tu gasto diario estimado.';
  }
  const base = formatearNumero(kcalBase);
  const signo = ajusteKcal < 0 ? 'menos' : 'más';
  if (ritmoSemanalKg) {
    const previsto = Math.round((ritmoSemanalKg * planes.metaPeso.kcalPorKg) / 7);
    if (Math.abs(ajusteKcal) < previsto) {
      return `Tu gasto estimado es de ${base} kcal; restar ${formatearNumero(previsto)} kcal te dejaría bajo el mínimo seguro, así que se usa el mínimo.`;
    }
    return `Tu gasto diario estimado (${base} kcal) ${signo} ${formatearNumero(Math.abs(ajusteKcal))} kcal, para ${valor === 'bajar_peso' ? 'bajar' : 'subir'} ${decimal(ritmoSemanalKg)} kg por semana.`;
  }
  const porcentaje = Math.round(Math.abs(ajusteCalorias) * 100);
  if (ajusteCalorias < 0 && ajusteKcal > Math.round(kcalBase * ajusteCalorias)) {
    return `Tu gasto estimado es de ${base} kcal; restar un ${porcentaje} % te dejaría bajo el mínimo seguro, así que se usa el mínimo.`;
  }
  return `Tu gasto diario estimado (${base} kcal) ${signo} un ${porcentaje} %.`;
}

// Plan de alimentación de Comidas (11-11-2026; pedido del PO): por defecto, el de la meta del perfil; o uno de la lista
// de planes personalizados. Incluye la meta de peso, que ajusta las calorías. Al cambiar algo se avisa a la página para
// que el resumen del día use el plan nuevo.
export default function PlanAlimentacion({ alGuardar }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [intento, setIntento] = useState(0);
  const [modo, setModo] = useState('meta');
  const [editor, setEditor] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerPlan()
      .then((datos) => {
        if (!activo) return;
        setEstado({ datos });
        setModo(datos.plan.tipo);
      })
      .catch((error) => activo && setEstado({ error: error.message }));
    return () => { activo = false; };
  }, [intento]);

  if (estado.cargando) return <p className="comidas__estado" role="status">Cargando tu plan de alimentación…</p>;
  if (estado.error) {
    return (
      <div className="comidas__estado">
        <Alerta>{estado.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => { setEstado({ cargando: true }); setIntento((valor) => valor + 1); }}>Reintentar</button>
      </div>
    );
  }

  const { datos } = estado;
  const { plan, meta, recomendado, perfil } = datos;

  // Cada acción responde el plan completo; el mensaje aparece en la tarjeta que corresponde (plan o meta de peso).
  const ejecutar = (zona, llamada, texto) => {
    setGuardando(true);
    setMensaje(null);
    return llamada()
      .then((nuevo) => {
        setEstado({ datos: nuevo });
        setMensaje({ zona, tipo: 'exito', texto });
        alGuardar?.();
        return true;
      })
      .catch((error) => {
        setMensaje({ zona, tipo: 'error', texto: error.message });
        return false;
      })
      .finally(() => setGuardando(false));
  };
  const acciones = {
    usar: (propio) => ejecutar('plan', () => elegirPlan({ tipo: 'personalizado', personalizadoId: propio.id }), `Listo: desde hoy usas «${propio.nombre}».`),
    crear: ({ usar, ...valores }) => ejecutar('plan', () => crearPersonalizado({ ...valores, usar }),
      usar ? `Listo: guardaste «${valores.nombre}» y lo usas desde hoy.` : `«${valores.nombre}» quedó en tu lista.`).then((listo) => listo && setEditor(null)),
    actualizar: (id, valores) => ejecutar('plan', () => actualizarPersonalizado(id, valores), `Guardaste los cambios de «${valores.nombre}».`)
      .then((listo) => listo && setEditor(null)),
    eliminar: (propio) => ejecutar('plan', () => eliminarPersonalizado(propio.id),
      `Eliminaste «${propio.nombre}».${propio.enUso ? ' Desde hoy usas el plan según tu meta.' : ''}`),
    guardarMetaPeso: (valores) => ejecutar('peso', () => guardarMetaPeso(valores), 'Guardaste tu meta de peso; tus calorías ya siguen el ritmo que elegiste.'),
    quitarMetaPeso: () => ejecutar('peso', quitarMetaPeso, 'Quitaste tu meta de peso.'),
  };
  const elegirModo = (valor) => {
    setModo(valor);
    setEditor(null);
    setMensaje(null);
  };
  const mensajeDe = (zona) => (mensaje?.zona === zona ? <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta> : null);
  const vigente = plan.tipo === 'personalizado'
    ? `Usas ${plan.nombre ? `«${plan.nombre}»` : 'un plan personalizado'} desde el ${diaYMes.format(new Date(`${plan.desde}T00:00:00Z`))}.`
    : 'Usas el plan según tu meta.';

  return (
    <div className="plan">
      <div className="plan__columna">
        <section className="panel-tarjeta plan__principal" aria-labelledby="titulo-plan">
          <div className="plan__encabezado">
            <h2 id="titulo-plan" className="panel-tarjeta__titulo">Tu plan de alimentación</h2>
            <p className="texto-secundario">{vigente}</p>
          </div>

          <div className="plan__modos" role="group" aria-label="Tipo de plan">
            <button type="button" className="plan__modo" aria-pressed={modo === 'meta'} onClick={() => elegirModo('meta')}>Según tu meta</button>
            <button type="button" className="plan__modo" aria-pressed={modo === 'personalizado'} onClick={() => elegirModo('personalizado')}>Personalizados</button>
          </div>

          {!perfil.completo && (
            <Alerta tipo="info">
              Completa tu peso, altura, edad, sexo y actividad física para calcular tus calorías y gramos. <Link to="/perfil">Ir a mi perfil</Link>
            </Alerta>
          )}

          <div className="plan__calorias">
            <p className="plan__kcal"><strong>{plan.kcal ? formatearNumero(plan.kcal) : '—'}</strong> kcal al día</p>
            <p className="texto-secundario">{textoCalorias(plan.kcal, perfil.kcalBase, meta)}</p>
          </div>

          {modo === 'meta' ? (
            <>
              <div className="plan__meta">
                <p className="plan__meta-nombre">Meta: <strong>{meta.etiqueta ?? 'Sin meta definida'}</strong></p>
                <Link to="/perfil" className="enlace-panel">{meta.etiqueta ? 'Cambiar meta' : 'Elegir meta'}</Link>
                <p className="texto-secundario plan__por-que">{porQue(meta.valor, meta.ritmoSemanalKg)}</p>
              </div>
              <Reparto porcentajes={recomendado.porcentajes} kcal={recomendado.kcal} />
              {plan.tipo === 'personalizado' && (
                <div className="plan__acciones">
                  <button type="button" className="boton boton--principal boton--compacto" disabled={guardando}
                    onClick={() => ejecutar('plan', () => elegirPlan({ tipo: 'meta' }), 'Listo: desde hoy usas el plan según tu meta.')}>
                    {guardando ? 'Guardando…' : 'Usar el plan de mi meta'}
                  </button>
                  <p className="texto-secundario">Deja de usar «{plan.nombre ?? 'tu plan personalizado'}» desde hoy.</p>
                </div>
              )}
            </>
          ) : (
            <PlanesPersonalizados datos={datos} guardando={guardando} editor={editor} setEditor={setEditor} acciones={acciones} />
          )}
          {mensajeDe('plan')}
        </section>

        <MetaPeso datos={datos} guardando={guardando} acciones={acciones} mensaje={mensajeDe('peso')} />
      </div>

      <aside className="plan__lateral">
        <section className="panel-tarjeta plan-calculo" aria-labelledby="titulo-calculo">
          <h2 id="titulo-calculo" className="panel-tarjeta__titulo">Cómo se calcula</h2>
          <ol className="plan-calculo__pasos">
            <li>
              <strong>Calorías:</strong> tu gasto diario estimado con tu perfil (fórmula de Mifflin-St Jeor y tu actividad física), ajustado según tu meta.
              Con una meta de peso, el ajuste sale del ritmo: cerca de {formatearNumero(planes.metaPeso.kcalPorKg)} kcal por kilo, repartidas en la semana.
              Para bajar de peso no baja de {formatearNumero(planes.caloriasMinimas.femenino)} kcal en mujeres ni de {formatearNumero(planes.caloriasMinimas.masculino)} kcal en hombres.
            </li>
            <li><strong>Proteína:</strong> gramos por kilo de peso según tu meta, hasta un {planes.proteinaMaxPct} % de las calorías.</li>
            <li><strong>Grasas:</strong> entre un {planes.grasasPct.min} % y un {planes.grasasPct.max} % de las calorías.</li>
            <li><strong>Carbohidratos:</strong> el resto de las calorías.</li>
          </ol>
          <p className="plan-calculo__nota texto-secundario">La fecha de tu meta de peso es una estimación: el cuerpo se adapta y el avance suele hacerse más lento con el tiempo.</p>
          <details className="plan-calculo__fuentes">
            <summary>Fuentes <Icono nombre="chevron" tamano={16} /></summary>
            <ul>
              {FUENTES.map(([nombre, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{nombre}</a></li>)}
            </ul>
          </details>
        </section>
        <section className="plan-aviso" aria-labelledby="titulo-aviso-plan">
          <h2 id="titulo-aviso-plan">Una orientación general</h2>
          <p>Está pensada para adultos sanos. No aplica en embarazo, lactancia, menores de edad ni enfermedades que requieran una dieta especial; para eso, consulta a un nutricionista.</p>
          <Link to="/profesionales?especialidad=Nutrici%C3%B3n" className="boton boton--secundario boton--compacto">Buscar nutricionistas</Link>
        </section>
      </aside>
    </div>
  );
}
