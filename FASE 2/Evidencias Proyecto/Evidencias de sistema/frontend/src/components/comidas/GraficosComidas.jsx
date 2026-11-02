import { formatearNumero } from '../../services/formato.js';
import { diaMes, diaSemana } from '../../services/comidas.service.js';

const porcentaje = (valor, objetivo) => (objetivo ? Math.round((valor / objetivo) * 100) : null);

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

// Barra de avance de un nutriente: consumo / objetivo y porcentaje del objetivo.
export function BarraNutriente({ nombre, consumo, objetivo, unidad = 'g', color }) {
  const avance = porcentaje(consumo, objetivo);
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
    </div>
  );
}

// Calorías de cada día de la semana (lunes a domingo) frente al objetivo. Los valores también van en una tabla para
// lectores de pantalla, porque las barras son solo visuales.
export function ProgresoSemanal({ semana, fechaActual }) {
  const maximo = Math.max(semana.objetivoCalorias ?? 0, ...semana.dias.map(({ calorias }) => calorias), 1) * 1.1;
  const alto = (valor) => `${Math.round((valor / maximo) * 100)}%`;
  return (
    <>
      <ol className="progreso-semanal" aria-hidden="true">
        {semana.dias.map(({ fecha, calorias, futuro }) => (
          <li key={fecha} className={`progreso-semanal__dia${fecha === fechaActual ? ' progreso-semanal__dia--actual' : ''}${futuro ? ' progreso-semanal__dia--futuro' : ''}`}>
            <div className="progreso-semanal__barras">
              <span className="progreso-semanal__consumo" style={{ height: alto(calorias) }} />
              {semana.objetivoCalorias && <span className="progreso-semanal__objetivo" style={{ height: alto(semana.objetivoCalorias) }} />}
            </div>
            <span className="progreso-semanal__nombre">{diaSemana(fecha)}</span>
            <span className="progreso-semanal__fecha">{diaMes(fecha)}</span>
          </li>
        ))}
      </ol>
      {/* Una tabla no respeta el recorte de .solo-lector y desbordaba la página: va dentro de un div oculto. */}
      <div className="solo-lector">
        <table>
          <caption>Calorías consumidas cada día de la semana{semana.objetivoCalorias ? `; objetivo diario: ${semana.objetivoCalorias} kcal` : ''}</caption>
          <tbody>
            {semana.dias.map(({ fecha, calorias, futuro }) => (
              <tr key={fecha}><th scope="row">{diaSemana(fecha)} {diaMes(fecha)}</th><td>{futuro ? 'Aún no llega' : `${calorias} kcal`}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
