import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import EstadoVacio from '../EstadoVacio.jsx';
import Icono from '../Icono.jsx';
import { Barras, Cifra } from '../graficos/Graficos.jsx';
import { AyudaPanel, BarrasFrenteAMeta, ComparacionPeriodos, LeyendaMeta, RepartoFrentePlan } from './GraficosComidas.jsx';
import { MARGEN_PCT, porcentajeDe, repartoDeCalorias } from './metaDiaria.js';
import { formatearNumero } from '../../services/formato.js';
import { nombrePeriodo, obtenerEstadisticas, sumarDias } from '../../services/comidas.service.js';

const PERIODOS = [{ clave: 'semana', nombre: 'Semana' }, { clave: 'mes', nombre: 'Mes' }];
const NUTRIENTES = [
  { clave: 'proteinasG', reparto: 'proteinas', nombre: 'Proteínas', color: '#2a7de1' },
  { clave: 'carbohidratosG', reparto: 'carbohidratos', nombre: 'Carbohidratos', color: '#1fa37a' },
  { clave: 'grasasG', reparto: 'grasas', nombre: 'Grasas', color: '#f7931e' },
];

// Con qué días se calcula: los completos (hoy aún no termina), salvo que hoy sea el único día con registros.
function textoBase({ diasCompletos, diasConRegistros }) {
  if (!diasCompletos) return 'Por ahora solo hay registros de hoy: el promedio usa lo que llevas del día.';
  const dias = diasCompletos === 1 ? '1 día completo' : `${diasCompletos} días completos`;
  return `Calculado con ${dias} con registros${diasConRegistros > diasCompletos ? '; hoy se suma al terminar el día' : ''}.`;
}

// Cifras del período: promedio, días cerca de la meta, diferencia con la meta y días con registro, comparados con el
// período anterior del mismo largo.
function CifrasPeriodo({ datos, mensual, transcurridos }) {
  const { objetivo, promedio, anterior } = datos;
  const meta = objetivo.calorias;
  const contra = mensual ? 'vs. mes anterior' : 'vs. semana anterior';
  const igual = mensual ? 'Igual que el mes anterior' : 'Igual que la semana anterior';
  const hayAnterior = anterior.diasConRegistros > 0;
  // Los conteos de días solo se comparan con un período terminado: a mitad de semana siempre serían menos que la anterior.
  const terminado = datos.hasta < datos.hoy;
  const diferencia = meta ? promedio.calorias - meta : null;
  return (
    <dl className="cifras">
      <Cifra etiqueta="Promedio diario" valor={`${formatearNumero(promedio.calorias)} kcal`}
        delta={hayAnterior ? promedio.calorias - anterior.promedio.calorias : undefined} comparacion={`kcal ${contra}`} igual={igual}
        // Acercarse a la meta es lo bueno: si antes estabas bajo ella, subir mejora; si estabas sobre ella, bajar.
        subirEsBueno={!meta || !hayAnterior || anterior.promedio.calorias < meta}
        detalle={meta ? `${porcentajeDe(promedio.calorias, meta)} % de tu meta diaria` : 'Completa tu perfil para ver tu meta'} />
      <Cifra etiqueta="Días cerca de la meta" valor={meta && datos.diasCompletos ? `${datos.diasCerca} de ${datos.diasCompletos}` : '—'}
        delta={meta && terminado && hayAnterior && anterior.diasCerca !== null ? datos.diasCerca - anterior.diasCerca : undefined} comparacion={contra}
        igual={igual}
        detalle={`Días completos con su consumo entre ${100 - MARGEN_PCT} % y ${100 + MARGEN_PCT} % de tu meta`} />
      <Cifra etiqueta="Diferencia con tu meta" valor={diferencia === null ? '—' : `${diferencia > 0 ? '+' : diferencia < 0 ? '−' : ''}${formatearNumero(Math.abs(diferencia))} kcal`}
        detalle={diferencia === null ? 'Sin meta diaria' : diferencia < 0 ? `En promedio te faltaron ${formatearNumero(-diferencia)} kcal al día`
          : diferencia > 0 ? `En promedio te pasaste por ${formatearNumero(diferencia)} kcal al día` : 'En promedio llegaste justo a tu meta'} />
      <Cifra etiqueta="Días con registro" valor={`${datos.diasConRegistros} de ${transcurridos}`}
        delta={terminado && hayAnterior ? datos.diasConRegistros - anterior.diasConRegistros : undefined} comparacion={contra}
        igual={igual}
        detalle="Mientras más días registres, más fiel es tu promedio" />
    </dl>
  );
}

// Estadísticas de Comidas (FS-HU-26), ampliadas el 11-11-2026 a pedido del PO: cifras del período comparadas con el
// anterior, cada día frente a la meta (con la franja «cerca de la meta»), los macronutrientes por día, el promedio frente
// al período anterior, el reparto de calorías frente al plan y las calorías de cada comida del día. Cada panel explica
// en una línea qué muestra. Parte del período del día elegido en Comidas.
export default function EstadisticasComidas({ fecha, version, alRegistrar }) {
  const [periodo, setPeriodo] = useState('semana');
  const [referencia, setReferencia] = useState(fecha);
  const [nutriente, setNutriente] = useState('proteinasG');
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState(null);
  const clave = `${periodo}-${referencia}-${version}-${intento}`;

  useEffect(() => {
    let activo = true;
    obtenerEstadisticas(periodo, referencia)
      .then((datos) => activo && setEstado({ clave, datos }))
      .catch((error) => activo && setEstado({ clave, error: error.message }));
    return () => { activo = false; };
  }, [clave, periodo, referencia]);

  const cargando = estado?.clave !== clave;
  const datos = estado?.datos;
  const mensual = periodo === 'mes';
  const elegido = NUTRIENTES.find(({ clave: valor }) => valor === nutriente);
  const este = mensual ? 'Este mes' : 'Esta semana';
  const previo = mensual ? 'Mes anterior' : 'Semana anterior';

  let contenido;
  if (cargando && !datos) {
    contenido = <p className="comidas__estado" role="status">Cargando tus estadísticas…</p>;
  } else if (estado.error) {
    contenido = (
      <div className="comidas__estado">
        <Alerta>{estado.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento((valor) => valor + 1)}>Reintentar</button>
      </div>
    );
  } else if (datos.diasConRegistros === 0) {
    contenido = (
      <EstadoVacio icono="grafico" nivel={2} titulo={`Aún no hay comidas registradas ${mensual ? 'este mes' : 'esta semana'}`}
        accion={<button type="button" className="boton boton--principal boton--compacto" onClick={alRegistrar}><Icono nombre="mas" tamano={18} /> Registrar comida</button>}>
        Cuando registres lo que comes, aquí verás tus calorías y macronutrientes de cada día frente a tu objetivo.
      </EstadoVacio>
    );
  } else {
    const { objetivo, promedio, anterior, dias } = datos;
    const transcurridos = dias.filter(({ futuro }) => !futuro).length;
    const reparto = repartoDeCalorias(promedio);
    const momentos = datos.momentos.map(({ etiqueta, calorias, porcentaje }) => ({ etiqueta, valor: calorias, detalle: `kcal · ${porcentaje} %` }));
    contenido = (
      <div className="estadisticas__graficos" aria-busy={cargando}>
        <section className="panel-tarjeta estadisticas__cifras" aria-labelledby="titulo-estadisticas-resumen">
          <h2 id="titulo-estadisticas-resumen" className="panel-tarjeta__titulo">{mensual ? 'Tu mes en cifras' : 'Tu semana en cifras'}</h2>
          <AyudaPanel>
            Cuánto comiste en promedio y qué tan seguido te acercaste a tu meta de calorías. Las flechas comparan con {mensual ? 'el mes anterior' : 'la semana anterior'}.
            {' '}{textoBase(datos)}
          </AyudaPanel>
          <CifrasPeriodo datos={datos} mensual={mensual} transcurridos={transcurridos} />
          {!objetivo.calorias && <p className="texto-secundario">Completa tu perfil para comparar con tu objetivo diario. <Link to="/perfil">Ir a mi perfil</Link></p>}
        </section>

        <section className="panel-tarjeta estadisticas__ancho" aria-labelledby="titulo-estadisticas-calorias">
          <h2 id="titulo-estadisticas-calorias" className="panel-tarjeta__titulo">Calorías por día</h2>
          <AyudaPanel>
            Cada barra es lo que comiste ese día. La línea punteada es tu meta y la franja, el margen de ±{MARGEN_PCT} % en que el día cuenta como cerca de ella.
            {mensual ? ' Pasa el mouse sobre una barra para ver su detalle.' : ' Sobre cada barra ves qué porcentaje de tu meta alcanzaste.'}
          </AyudaPanel>
          <LeyendaMeta meta={objetivo.calorias} unidad="kcal" />
          <BarrasFrenteAMeta dias={dias} clave="calorias" meta={objetivo.calorias} unidad="kcal" color="#1c74c9" mensual={mensual} fechaActual={datos.hoy}
            descripcion={`Calorías consumidas cada día ${mensual ? 'del mes' : 'de la semana'}`} />
        </section>

        <section className="panel-tarjeta" aria-labelledby="titulo-estadisticas-macros">
          <div className="estadisticas__encabezado-tarjeta">
            <h2 id="titulo-estadisticas-macros" className="panel-tarjeta__titulo">Macronutrientes por día</h2>
            <div className="estadisticas__opciones" role="group" aria-label="Macronutriente del gráfico">
              {NUTRIENTES.map(({ clave: valor, nombre }) => (
                <button key={valor} type="button" className="estadisticas__opcion" aria-pressed={nutriente === valor} onClick={() => setNutriente(valor)}>{nombre}</button>
              ))}
            </div>
          </div>
          <AyudaPanel>Los gramos de {elegido.nombre.toLowerCase()} de cada día frente a la meta de tu plan. Elige otro macronutriente con los botones.</AyudaPanel>
          <LeyendaMeta meta={objetivo[nutriente]} unidad="g" color={elegido.color} />
          <BarrasFrenteAMeta dias={dias} clave={nutriente} meta={objetivo[nutriente]} unidad="g" color={elegido.color} mensual={mensual} fechaActual={datos.hoy}
            descripcion={`${elegido.nombre} consumidas cada día ${mensual ? 'del mes' : 'de la semana'}, en gramos`} />
        </section>

        <section className="panel-tarjeta" aria-labelledby="titulo-estadisticas-comparacion">
          <h2 id="titulo-estadisticas-comparacion" className="panel-tarjeta__titulo">Comparado con {mensual ? 'el mes anterior' : 'la semana anterior'}</h2>
          <AyudaPanel>
            Tu promedio diario de {mensual ? 'este mes' : 'esta semana'} frente al {mensual ? 'del mes anterior' : 'de la semana anterior'}; la marca vertical es tu meta. El porcentaje indica cuánto cambió.
          </AyudaPanel>
          {anterior.promedio ? (
            <ComparacionPeriodos nombreActual={este} nombreAnterior={previo} filas={[
              { clave: 'calorias', nombre: 'Calorías', actual: promedio.calorias, anterior: anterior.promedio.calorias, meta: objetivo.calorias, unidad: 'kcal' },
              ...NUTRIENTES.map(({ clave: valor, nombre }) => ({ clave: valor, nombre, actual: promedio[valor], anterior: anterior.promedio[valor], meta: objetivo[valor], unidad: 'g' })),
            ]} />
          ) : (
            <p className="estadisticas__sin-datos">{mensual ? 'El mes anterior' : 'La semana anterior'} no tiene comidas registradas, así que aún no hay con qué comparar.</p>
          )}
        </section>

        <section className="panel-tarjeta" aria-labelledby="titulo-estadisticas-reparto">
          <h2 id="titulo-estadisticas-reparto" className="panel-tarjeta__titulo">Tu reparto frente a tu plan</h2>
          <AyudaPanel>De dónde vienen tus calorías: qué parte aportan las proteínas, los carbohidratos y las grasas en tu promedio, comparado con el reparto de tu plan de alimentación.</AyudaPanel>
          {objetivo.porcentajes && reparto ? (
            <RepartoFrentePlan nutrientes={NUTRIENTES.map(({ reparto: valor, nombre, color }) => ({ clave: valor, nombre, color }))}
              plan={objetivo.porcentajes} real={reparto} />
          ) : (
            <p className="estadisticas__sin-datos">Completa tu perfil para tener un plan con el que comparar tu reparto. <Link to="/perfil">Ir a mi perfil</Link></p>
          )}
        </section>

        <section className="panel-tarjeta estadisticas__momentos" aria-labelledby="titulo-estadisticas-momentos">
          <h2 id="titulo-estadisticas-momentos" className="panel-tarjeta__titulo">Calorías por comida del día</h2>
          <AyudaPanel>En qué momento del día comes más: el promedio de calorías de cada comida en los días con registros y su parte del total.</AyudaPanel>
          <Barras filas={momentos} etiquetaLector={`Promedio de calorías de cada comida del día ${mensual ? 'en el mes' : 'en la semana'}`} />
        </section>
      </div>
    );
  }

  const siguiente = datos && sumarDias(datos.hasta, 1);
  // Mientras llega otro período, datos todavía es el anterior (por ejemplo, la semana al cambiar a «Mes»): las flechas
  // esperan, para no calcular el mes anterior desde las fechas de la semana (revisión del PR #41).
  return (
    <div className="estadisticas">
      <div className="estadisticas__controles">
        <div className="estadisticas__opciones" role="group" aria-label="Período">
          {PERIODOS.map(({ clave: valor, nombre }) => (
            <button key={valor} type="button" className="estadisticas__opcion" aria-pressed={periodo === valor} onClick={() => setPeriodo(valor)}>{nombre}</button>
          ))}
        </div>
        {datos && (
          <nav className="comidas__dia estadisticas__navegacion" aria-label={mensual ? 'Mes' : 'Semana'}>
            <button type="button" className="boton-icono" onClick={() => setReferencia(sumarDias(datos.desde, -1))} disabled={cargando}
              aria-label={mensual ? 'Mes anterior' : 'Semana anterior'}>
              <Icono nombre="chevron" tamano={20} className="comidas__anterior" />
            </button>
            <p aria-live="polite"><strong>{nombrePeriodo(datos.periodo, datos.desde, datos.hasta)}</strong></p>
            <button type="button" className="boton-icono" onClick={() => setReferencia(siguiente)} disabled={cargando || siguiente > datos.hoy}
              aria-label={mensual ? 'Mes siguiente' : 'Semana siguiente'}>
              <Icono nombre="chevron" tamano={20} className="comidas__siguiente" />
            </button>
          </nav>
        )}
      </div>
      {contenido}
    </div>
  );
}
