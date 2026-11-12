import { formatearNumero } from '../../services/formato.js';
import { diaMes, diaSemana } from '../../services/comidas.service.js';
import { MARGEN, MARGEN_PCT, cercaDeLaMeta, frenteALaMeta, porcentajeDe } from './metaDiaria.js';

// Anillo de las calorías del día frente al objetivo (mockup del PO, 26-10-2026). Sin objetivo, solo muestra el consumo.
export function AnilloCalorias({ consumo, objetivo }) {
  const radio = 52;
  const perimetro = 2 * Math.PI * radio;
  const avance = objetivo ? Math.min(consumo / objetivo, 1) : 0;
  return (
    <div className="anillo-calorias">
      <svg viewBox="0 0 128 128" aria-hidden="true">
        <defs>
          <linearGradient id="anillo-calorias-color" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1fa37a" />
            <stop offset="100%" stopColor="#1c74c9" />
          </linearGradient>
        </defs>
        <circle className="anillo-calorias__fondo" cx="64" cy="64" r={radio} />
        <circle className="anillo-calorias__avance" cx="64" cy="64" r={radio} stroke="url(#anillo-calorias-color)"
          strokeDasharray={perimetro} strokeDashoffset={perimetro * (1 - avance)} />
      </svg>
      <p className="anillo-calorias__texto">
        <strong>{formatearNumero(consumo)}</strong>
        <span>kcal</span>
        {objetivo ? <small>de {formatearNumero(objetivo)} kcal</small> : <small>sin objetivo</small>}
      </p>
    </div>
  );
}

// Barra de avance de un nutriente: consumo / objetivo, porcentaje y cuánto falta (11-11-2026).
export function BarraNutriente({ nombre, consumo, objetivo, unidad = 'g', color }) {
  const avance = porcentajeDe(consumo, objetivo);
  const falta = frenteALaMeta(consumo, objetivo, unidad, { corto: true });
  return (
    <div className="barra-nutriente" style={{ '--color-nutriente': color }}>
      <p className="barra-nutriente__titulo">
        <span>{nombre}</span>
        <span><strong>{formatearNumero(consumo)}</strong>{objetivo ? ` / ${formatearNumero(objetivo)}` : ''} {unidad}</span>
      </p>
      <div className="barra-nutriente__pista" role="progressbar" aria-label={nombre} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={avance === null ? undefined : Math.min(avance, 100)} aria-valuetext={avance === null ? 'Sin objetivo' : `${avance} % del objetivo`}>
        <span style={{ width: `${Math.min(avance ?? 0, 100)}%` }} />
      </div>
      {avance !== null && <small>{avance} %</small>}
      {falta && <small className={`barra-nutriente__falta barra-nutriente__falta--${falta.estado}`}>{falta.texto}</small>}
    </div>
  );
}

// Explicación breve de qué muestra cada panel (pedido del PO del 11-11-2026).
export function AyudaPanel({ children }) {
  return <p className="panel-ayuda">{children}</p>;
}

// Leyenda de los gráficos por día: consumo, línea de la meta y franja «cerca de la meta».
export function LeyendaMeta({ meta, unidad, color = '#1c74c9' }) {
  return (
    <p className="leyenda-meta" aria-hidden="true">
      <span className="leyenda-meta__consumo" style={{ '--color-barra': color }}>Consumido</span>
      {meta && <span className="leyenda-meta__linea">Meta ({formatearNumero(meta)} {unidad})</span>}
      {meta && <span className="leyenda-meta__banda">Cerca de la meta (±{MARGEN_PCT} %)</span>}
    </p>
  );
}

// Columnas de cada día frente a la meta diaria (11-11-2026; reemplaza al progreso semanal y a las barras de las
// estadísticas): la línea punteada es la meta y la franja, el margen de ±10 % en que el día cuenta como «cerca». En la
// semana, cada día con registros muestra qué porcentaje de la meta alcanzó; al pasar el mouse se ve el detalle. Los
// mismos datos van en una tabla para lectores de pantalla.
export function BarrasFrenteAMeta({ dias, clave = 'calorias', meta, unidad = 'kcal', color = '#1c74c9', mensual = false, fechaActual, descripcion }) {
  const maximo = Math.max(meta ? meta * (1 + MARGEN) : 0, ...dias.map((dia) => dia[clave]), 1) * 1.08;
  const posicion = (valor) => `${(valor / maximo) * 100}%`;
  const detalle = (dia) => {
    if (dia.futuro) return 'Aún no llega';
    if (!dia.conRegistros) return 'Sin registros';
    const texto = `${formatearNumero(dia[clave])} ${unidad}`;
    if (!meta) return texto;
    const diferencia = Math.round((dia[clave] - meta) * 10) / 10;
    const cuanto = diferencia === 0 ? 'justo en la meta' : `${formatearNumero(Math.abs(diferencia))} ${unidad} ${diferencia < 0 ? 'bajo' : 'sobre'} la meta`;
    return `${texto}, ${porcentajeDe(dia[clave], meta)} % de la meta (${cuanto})`;
  };
  return (
    <>
      <div className={`frente-meta${mensual ? ' frente-meta--mes' : ''}`} style={{ '--color-barra': color }} aria-hidden="true">
        <div className="frente-meta__area">
          <div className="frente-meta__plano">
            {meta && <span className="frente-meta__banda" style={{ bottom: posicion(meta * (1 - MARGEN)), height: posicion(meta * 2 * MARGEN) }} />}
            {meta && <span className="frente-meta__linea" style={{ bottom: posicion(meta) }} />}
            <ol style={{ '--dias': dias.length }}>
              {dias.map((dia) => {
                const visible = dia.conRegistros && !dia.futuro;
                const cerca = visible && cercaDeLaMeta(dia[clave], meta);
                return (
                  <li key={dia.fecha} className={`frente-meta__dia${dia.fecha === fechaActual ? ' frente-meta__dia--actual' : ''}${cerca ? ' frente-meta__dia--cerca' : ''}`}>
                    {visible && meta && !mensual && (
                      <span className="frente-meta__pct" style={{ bottom: posicion(dia[clave]) }}>{porcentajeDe(dia[clave], meta)} %</span>
                    )}
                    <span className="frente-meta__barra" style={{ height: visible ? posicion(dia[clave]) : 0 }} />
                    <span className="frente-meta__ayuda"><strong>{diaSemana(dia.fecha)} {diaMes(dia.fecha)}</strong>{detalle(dia)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        <ol className="frente-meta__rotulos" style={{ '--dias': dias.length }}>
          {dias.map(({ fecha }) => {
            const numero = Number(fecha.slice(8, 10));
            // En el mes solo se rotulan el día 1 y los múltiplos de 5, para que los números no se monten en el celular.
            return (
              <li key={fecha} className={fecha === fechaActual ? 'frente-meta__rotulo--actual' : undefined}>
                {mensual ? ((numero === 1 || numero % 5 === 0) && numero) : <>{diaSemana(fecha)}<br />{diaMes(fecha)}</>}
              </li>
            );
          })}
        </ol>
      </div>
      {/* Una tabla no respeta el recorte de .solo-lector y desbordaba la página: va dentro de un div oculto. */}
      <div className="solo-lector">
        <table>
          <caption>{descripcion}{meta ? `; objetivo diario: ${formatearNumero(meta)} ${unidad}` : ''}</caption>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia.fecha}><th scope="row">{diaSemana(dia.fecha)} {diaMes(dia.fecha)}</th><td>{detalle(dia)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Promedio diario de este período frente al anterior, con la marca de la meta (11-11-2026). Una fila por nutriente.
export function ComparacionPeriodos({ filas, nombreActual, nombreAnterior }) {
  return (
    <>
      <p className="leyenda-meta" aria-hidden="true">
        <span className="leyenda-meta__actual">{nombreActual}</span>
        <span className="leyenda-meta__anterior">{nombreAnterior}</span>
        <span className="leyenda-meta__marca">Meta diaria</span>
      </p>
      <ul className="comparacion">
        {filas.map(({ clave, nombre, actual, anterior, meta, unidad }) => {
          const maximo = Math.max(actual ?? 0, anterior ?? 0, meta ?? 0, 1) * 1.1;
          const ancho = (valor) => `${((valor ?? 0) / maximo) * 100}%`;
          const cambio = anterior ? Math.round(((actual - anterior) / anterior) * 100) : null;
          return (
            <li key={clave} className="comparacion__fila">
              <p className="comparacion__titulo">
                <span>{nombre}</span>
                {cambio !== null && (
                  <span className="comparacion__cambio">{cambio === 0 ? 'Sin cambio' : `${cambio > 0 ? '+' : '−'}${Math.abs(cambio)} %`}</span>
                )}
              </p>
              <div className="comparacion__barras" aria-hidden="true">
                {meta && <span className="comparacion__meta" style={{ left: ancho(meta) }} />}
                <span className="comparacion__pista"><i className="comparacion__barra comparacion__barra--actual" style={{ width: ancho(actual) }} /></span>
                <span className="comparacion__pista"><i className="comparacion__barra comparacion__barra--anterior" style={{ width: ancho(anterior) }} /></span>
              </div>
              <p className="comparacion__valores">
                <span><strong>{formatearNumero(actual)} {unidad}</strong> {nombreActual.toLowerCase()}</span>
                <span>{anterior === null ? 'sin registros' : `${formatearNumero(anterior)} ${unidad}`} {nombreAnterior.toLowerCase()}</span>
                {meta && <span>meta {formatearNumero(meta)} {unidad}</span>}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

// Reparto de las calorías entre macronutrientes: el de tu plan frente al de lo que comiste (11-11-2026). Cada barra suma
// 100 %; el porcentaje va escrito dentro de cada parte y la diferencia, debajo.
function BarraReparto({ titulo, valores, nutrientes }) {
  return (
    <div className="reparto-plan__fila">
      <p className="reparto-plan__titulo">{titulo}</p>
      <div className="reparto-plan__barra" role="img" aria-label={`${titulo}: ${nutrientes.map(({ nombre, clave }) => `${nombre} ${valores[clave]} %`).join(', ')}`}>
        {nutrientes.map(({ clave, nombre, color }) => (
          <span key={clave} style={{ width: `${valores[clave]}%`, '--color-nutriente': color }} title={`${nombre}: ${valores[clave]} %`}>
            {valores[clave] >= 12 && `${valores[clave]} %`}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RepartoFrentePlan({ plan, real, nutrientes }) {
  return (
    <>
      <p className="leyenda-meta" aria-hidden="true">
        {nutrientes.map(({ clave, nombre, color }) => <span key={clave} className="leyenda-meta__nutriente" style={{ '--color-nutriente': color }}>{nombre}</span>)}
      </p>
      <BarraReparto titulo="Tu plan" valores={plan} nutrientes={nutrientes} />
      <BarraReparto titulo="Lo que comiste" valores={real} nutrientes={nutrientes} />
      <ul className="reparto-plan__diferencias">
        {nutrientes.map(({ clave, nombre }) => {
          const diferencia = real[clave] - plan[clave];
          return (
            <li key={clave}>
              <strong>{nombre}:</strong>{' '}
              {Math.abs(diferencia) <= 3 ? 'como en tu plan' : `${Math.abs(diferencia)} puntos ${diferencia > 0 ? 'más' : 'menos'} que tu plan`}
            </li>
          );
        })}
      </ul>
    </>
  );
}
