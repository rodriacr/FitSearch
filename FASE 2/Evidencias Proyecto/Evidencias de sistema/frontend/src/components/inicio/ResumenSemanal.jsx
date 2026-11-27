import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icono from '../Icono.jsx';
import { obtenerAguaSemana } from '../../services/agua.service.js';
import { obtenerEstadisticas } from '../../services/comidas.service.js';
import { formatearNumero } from '../../services/formato.js';
import './ResumenSemanal.css';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// La barra más alta llega al 125 % de la meta: así la línea de la meta queda al 80 % del alto y se ve lo que la pasa.
const TOPE = 1.25;
const MARGEN = 0.1;

const partes = (fecha) => fecha.split('-').map(Number);
function rangoDe(desde, hasta) {
  const [, mesDesde, diaDesde] = partes(desde);
  const [, mesHasta, diaHasta] = partes(hasta);
  return mesDesde === mesHasta
    ? `Del ${diaDesde} al ${diaHasta} de ${MESES[mesHasta - 1]}`
    : `Del ${diaDesde} de ${MESES[mesDesde - 1]} al ${diaHasta} de ${MESES[mesHasta - 1]}`;
}

function tonoDe(calorias, meta) {
  if (!meta) return 'neutro';
  const avance = calorias / meta;
  if (Math.abs(avance - 1) <= MARGEN) return 'meta';
  return avance > 1 ? 'sobre' : 'bajo';
}

function mensajeDe(diasConRegistros) {
  if (diasConRegistros === 0) return 'Aún no registras comidas esta semana. ¡Empieza hoy y mira cómo se llena tu gráfico!';
  if (diasConRegistros >= 5) return `¡Gran semana! Registraste ${diasConRegistros} de 7 días. Así es más fácil ver tu avance.`;
  return `Vas bien: ${diasConRegistros} ${diasConRegistros === 1 ? 'día' : 'días'} con registro. ¡Sigue sumando días esta semana!`;
}

function Anillo({ valor, total }) {
  const radio = 16;
  const largo = 2 * Math.PI * radio;
  return (
    <svg className="semana__anillo" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r={radio} className="semana__anillo-fondo" />
      <circle cx="20" cy="20" r={radio} className="semana__anillo-avance" strokeDasharray={largo} strokeDashoffset={largo * (1 - valor / total)} />
    </svg>
  );
}

function Tendencia({ actual, anterior }) {
  if (!actual || !anterior) return <span className="semana__tendencia">Sin datos de la semana anterior</span>;
  const cambio = Math.round(((actual - anterior) / anterior) * 100);
  if (cambio === 0) return <span className="semana__tendencia">Igual que la semana anterior</span>;
  return (
    <span className="semana__tendencia">
      <span aria-hidden="true">{cambio > 0 ? '▲' : '▼'}</span> {formatearNumero(Math.abs(cambio))} % {cambio > 0 ? 'más' : 'menos'} que la semana anterior
    </span>
  );
}

// Resumen semanal del Inicio (25-11-2026): calorías de cada día de la semana frente a la meta, días con registro, días
// cerca de la meta, promedio comparado con la semana anterior y agua. Usa las estadísticas de Comidas (FS-HU-26) y el
// agua de la semana (FS-HU-33). Es un complemento: si las estadísticas no cargan, la tarjeta no se muestra; si solo
// falla el agua, se muestra sin ella.
export default function ResumenSemanal() {
  const [datos, setDatos] = useState(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([obtenerEstadisticas('semana'), obtenerAguaSemana().catch(() => null)])
      .then(([estadisticas, agua]) => {
        if (!activo) return;
        if (!Array.isArray(estadisticas?.dias) || estadisticas.dias.length !== 7) { setFallo(true); return; }
        setDatos({ estadisticas, agua: Array.isArray(agua?.dias) && agua.dias.length === 7 ? agua : null });
      })
      .catch(() => activo && setFallo(true));
    return () => { activo = false; };
  }, []);

  if (fallo) return null;
  if (!datos) {
    return <section className="resumen-semanal resumen-semanal--cargando" aria-busy="true" aria-label="Tu semana"><p role="status">Cargando tu semana…</p></section>;
  }

  const { estadisticas: e, agua } = datos;
  const meta = e.objetivo?.calorias || null;
  const referencia = meta ? meta * TOPE : Math.max(...e.dias.map((d) => d.calorias), 1);
  const promedio = e.promedio?.calorias ?? null;
  const resumenGrafico = e.dias
    .map((d, i) => `${DIAS[i]} ${d.futuro ? 'aún no llega' : `${formatearNumero(d.calorias)} kcal`}`).join(', ');

  return (
    <section className="resumen-semanal" aria-labelledby="titulo-semana">
      <header className="semana__cabecera">
        <span className="semana__insignia" aria-hidden="true"><Icono nombre="calendario" tamano={22} /></span>
        <div>
          <h2 id="titulo-semana">Tu semana</h2>
          <p className="semana__rango">{rangoDe(e.desde, e.hasta)}</p>
        </div>
        <Link to="/comidas?seccion=estadisticas" className="enlace-panel semana__enlace">Ver estadísticas <Icono nombre="flecha" tamano={16} /></Link>
      </header>

      <div className="semana__cuerpo">
        <figure className="semana__grafico">
          <figcaption className="semana__leyenda">
            <span>Calorías por día</span>
            {meta && <span className="semana__leyenda-meta">Meta {formatearNumero(meta)} kcal</span>}
          </figcaption>
          <div className={`semana__columnas${meta ? ' semana__columnas--con-meta' : ''}`} role="img" aria-label={`Calorías de la semana. ${resumenGrafico}.`}
            style={{ '--meta': 1 / TOPE }}>
            {e.dias.map((dia, i) => {
              const esHoy = dia.fecha === e.hoy;
              const alto = Math.min(dia.calorias / referencia, 1);
              const aguaDia = agua?.dias[i];
              const conMetaAgua = aguaDia && aguaDia.totalMl >= agua.metaMl;
              return (
                <div key={dia.fecha} className={`semana__dia${esHoy ? ' semana__dia--hoy' : ''}${dia.futuro ? ' semana__dia--futuro' : ''}`} aria-hidden="true">
                  <div className="semana__barra-zona">
                    {dia.conRegistros
                      ? <span className={`semana__barra semana__barra--${tonoDe(dia.calorias, meta)}`} style={{ '--alto': alto, '--retraso': `${i * 60}ms` }}
                        title={`${formatearNumero(dia.calorias)} kcal`} />
                      : !dia.futuro && <span className="semana__sin-registro" />}
                  </div>
                  <span className="semana__nombre">{DIAS[i]}</span>
                  <span className="semana__numero">{partes(dia.fecha)[2]}</span>
                  {agua && !dia.futuro && (
                    <span className={`semana__gota${conMetaAgua ? ' semana__gota--meta' : ''}`} title={`${formatearNumero(aguaDia.totalMl)} ml de agua`}>
                      <Icono nombre="gota" tamano={14} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {meta && (
            <ul className="semana__claves" aria-label="Colores del gráfico">
              <li><span className="semana__punto semana__punto--meta" /> Cerca de la meta</li>
              <li><span className="semana__punto semana__punto--bajo" /> Bajo la meta</li>
              <li><span className="semana__punto semana__punto--sobre" /> Sobre la meta</li>
              {agua && <li><span className="semana__punto semana__punto--agua" /> Meta de agua</li>}
            </ul>
          )}
        </figure>

        <ul className="semana__indicadores">
          <li className="semana__indicador">
            <Anillo valor={e.diasConRegistros} total={7} />
            <div>
              <span className="semana__etiqueta">Días con registro</span>
              <span className="semana__valor"><strong>{e.diasConRegistros}</strong><small> / 7</small></span>
            </div>
          </li>
          <li className="semana__indicador">
            <span className="semana__icono semana__icono--meta" aria-hidden="true"><Icono nombre="diana" tamano={20} /></span>
            <div>
              <span className="semana__etiqueta">Cerca de tu meta</span>
              <span className="semana__valor">{meta
                ? <><strong>{e.diasCerca ?? 0}</strong><small> {e.diasCerca === 1 ? 'día' : 'días'}</small></>
                : <Link to="/perfil" className="semana__perfil">Completa tu perfil</Link>}</span>
              {meta && <span className="semana__detalle">Cuenta los días que ya terminaron</span>}
            </div>
          </li>
          <li className="semana__indicador">
            <span className="semana__icono semana__icono--calorias" aria-hidden="true"><Icono nombre="fuego" tamano={20} /></span>
            <div>
              <span className="semana__etiqueta">Promedio diario</span>
              <span className="semana__valor">{promedio === null ? <strong>—</strong> : <><strong>{formatearNumero(promedio)}</strong><small> kcal</small></>}</span>
              <Tendencia actual={promedio} anterior={e.anterior?.promedio?.calorias ?? null} />
            </div>
          </li>
          {agua && (
            <li className="semana__indicador">
              <span className="semana__icono semana__icono--agua" aria-hidden="true"><Icono nombre="gota" tamano={20} /></span>
              <div>
                <span className="semana__etiqueta">Agua de la semana</span>
                <span className="semana__valor"><strong>{formatearNumero(Math.round(agua.totalMl / 100) / 10)}</strong><small> L</small></span>
                <span className="semana__detalle">{agua.diasConMeta} {agua.diasConMeta === 1 ? 'día' : 'días'} con la meta de agua</span>
              </div>
            </li>
          )}
        </ul>
      </div>

      <p className="semana__mensaje"><Icono nombre="chispa" tamano={18} /> {mensajeDe(e.diasConRegistros)}</p>
    </section>
  );
}
