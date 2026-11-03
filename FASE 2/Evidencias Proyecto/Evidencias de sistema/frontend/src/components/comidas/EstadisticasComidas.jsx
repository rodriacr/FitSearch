import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../Alerta.jsx';
import EstadoVacio from '../EstadoVacio.jsx';
import Icono from '../Icono.jsx';
import { BarraNutriente } from './GraficosComidas.jsx';
import { formatearNumero } from '../../services/formato.js';
import { diaMes, diaSemana, nombrePeriodo, obtenerEstadisticas, sumarDias } from '../../services/comidas.service.js';

const PERIODOS = [{ clave: 'semana', nombre: 'Semana' }, { clave: 'mes', nombre: 'Mes' }];
const NUTRIENTES = [
  { clave: 'proteinasG', nombre: 'Proteínas', color: '#2a7de1' },
  { clave: 'carbohidratosG', nombre: 'Carbohidratos', color: '#1fa37a' },
  { clave: 'grasasG', nombre: 'Grasas', color: '#f7931e' },
];

// En el mes solo se rotulan el día 1 y los múltiplos de 5, para que los números no se monten en el celular.
const conRotulo = (fecha, mensual) => !mensual || Number(fecha.slice(8, 10)) === 1 || Number(fecha.slice(8, 10)) % 5 === 0;

// Barras de un valor de cada día frente a la línea del objetivo diario. Los valores también van en una tabla para
// lectores de pantalla, porque las barras son solo visuales.
function BarrasPorDia({ dias, clave, objetivo, unidad, color, descripcion, mensual }) {
  const maximo = Math.max(objetivo ?? 0, ...dias.map((dia) => dia[clave]), 1) * 1.1;
  const alto = (valor) => `${Math.round((valor / maximo) * 100)}%`;
  return (
    <>
      <div className={`estadisticas-barras${mensual ? ' estadisticas-barras--mes' : ''}`} style={{ '--color-barra': color }} aria-hidden="true">
        <div className="estadisticas-barras__area">
          {objetivo && <span className="estadisticas-barras__objetivo" style={{ bottom: alto(objetivo) }} />}
          <ol style={{ '--dias': dias.length }}>
            {dias.map((dia) => (
              <li key={dia.fecha} className={dia.futuro ? 'estadisticas-barras__dia--futuro' : undefined}>
                <span className="estadisticas-barras__barra" style={{ height: dia.conRegistros ? alto(dia[clave]) : 0 }} />
              </li>
            ))}
          </ol>
        </div>
        <ol className="estadisticas-barras__rotulos" style={{ '--dias': dias.length }}>
          {dias.map(({ fecha }) => (
            <li key={fecha}>{conRotulo(fecha, mensual) && (mensual ? Number(fecha.slice(8, 10)) : <>{diaSemana(fecha)}<br />{diaMes(fecha)}</>)}</li>
          ))}
        </ol>
      </div>
      {/* Una tabla no respeta el recorte de .solo-lector y desbordaba la página: va dentro de un div oculto. */}
      <div className="solo-lector">
        <table>
          <caption>{descripcion}{objetivo ? `; objetivo diario: ${formatearNumero(objetivo)} ${unidad}` : ''}</caption>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia.fecha}>
                <th scope="row">{diaSemana(dia.fecha)} {diaMes(dia.fecha)}</th>
                <td>{dia.futuro ? 'Aún no llega' : dia.conRegistros ? `${formatearNumero(dia[clave])} ${unidad}` : 'Sin registros'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Estadísticas de Comidas (FS-HU-26): calorías y macronutrientes de cada día de una semana o un mes frente al objetivo
// diario, y el promedio de los días con registros. Parte del período del día elegido en Comidas.
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
    const { objetivo, promedio, dias } = datos;
    const transcurridos = dias.filter(({ futuro }) => !futuro).length;
    contenido = (
      <div className="estadisticas__graficos" aria-busy={cargando}>
        <section className="panel-tarjeta" aria-labelledby="titulo-estadisticas-calorias">
          <div className="estadisticas__encabezado-tarjeta">
            <h2 id="titulo-estadisticas-calorias" className="panel-tarjeta__titulo">Calorías por día</h2>
            <p className="estadisticas__leyenda" aria-hidden="true"><span className="estadisticas__leyenda-consumo">Consumidas</span>{objetivo.calorias && <span className="estadisticas__leyenda-objetivo">Objetivo</span>}</p>
          </div>
          <BarrasPorDia dias={dias} clave="calorias" objetivo={objetivo.calorias} unidad="kcal" color="#1c74c9" mensual={mensual}
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
          <BarrasPorDia dias={dias} clave={nutriente} objetivo={objetivo[nutriente]} unidad="g" color={elegido.color} mensual={mensual}
            descripcion={`${elegido.nombre} consumidas cada día ${mensual ? 'del mes' : 'de la semana'}, en gramos`} />
        </section>

        <section className="panel-tarjeta estadisticas__promedio" aria-labelledby="titulo-estadisticas-promedio">
          <h2 id="titulo-estadisticas-promedio" className="panel-tarjeta__titulo">Promedio diario</h2>
          <p className="texto-secundario">
            {datos.diasConRegistros === 1 ? 'Calculado con 1 día con registros' : `Calculado con ${datos.diasConRegistros} días con registros`} de {transcurridos} {transcurridos === 1 ? 'día transcurrido' : 'días transcurridos'}.
          </p>
          <BarraNutriente nombre="Calorías" consumo={promedio.calorias} objetivo={objetivo.calorias} unidad="kcal" color="#1c74c9" />
          {NUTRIENTES.map(({ clave: valor, nombre, color }) => (
            <BarraNutriente key={valor} nombre={nombre} consumo={promedio[valor]} objetivo={objetivo[valor]} color={color} />
          ))}
          {!objetivo.calorias && <p className="texto-secundario">Completa tu perfil para comparar tu promedio con tu objetivo diario. <Link to="/perfil">Ir a mi perfil</Link></p>}
        </section>
      </div>
    );
  }

  const siguiente = datos && sumarDias(datos.hasta, 1);
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
            <button type="button" className="boton-icono" onClick={() => setReferencia(sumarDias(datos.desde, -1))} aria-label={mensual ? 'Mes anterior' : 'Semana anterior'}>
              <Icono nombre="chevron" tamano={20} className="comidas__anterior" />
            </button>
            <p aria-live="polite"><strong>{nombrePeriodo(datos.periodo, datos.desde, datos.hasta)}</strong></p>
            <button type="button" className="boton-icono" onClick={() => setReferencia(siguiente)} disabled={siguiente > datos.hoy}
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
