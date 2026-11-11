import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import './Graficos.css';

// Piezas de gráficos del dashboard y los reportes del administrador (11-11-2026); los reportes del profesional usan su
// propia versión (PR #50). Marcas finas, 2 px de aire entre partes apiladas, el texto en los colores de texto y, para
// los lectores de pantalla, una tabla con los mismos datos. Los colores de las series se validaron con el verificador de
// paletas; los que no llegan a 3:1 con el fondo van siempre con leyenda, detalle al pasar el mouse y tabla.

// Tope "redondo" del eje: 4, 5, 10, 20, 25, 50… para que las marcas sean números limpios.
function topeLimpio(maximo) {
  if (maximo <= 4) return 4;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const paso = [1, 2, 2.5, 5, 10].find((p) => p * potencia >= maximo / 4) * potencia;
  return Math.ceil(maximo / paso) * paso;
}

// Cifra con su comparación contra el período anterior (del mismo largo).
export function Cifra({ etiqueta, valor, detalle, delta, subirEsBueno = true, comparacion = 'vs. período anterior', igual = 'Igual que el período anterior' }) {
  const signo = delta > 0 ? '+' : '';
  const tono = !delta ? '' : (delta > 0) === subirEsBueno ? ' cifra-reporte__delta--buena' : ' cifra-reporte__delta--mala';
  return (
    <div className="cifra-reporte">
      <dt>{etiqueta}</dt>
      <dd>
        <strong className="cifra">{valor}</strong>
        {delta !== undefined && delta !== null && (
          <span className={`cifra-reporte__delta${tono}`}>
            {delta !== 0 && <Icono nombre="flecha" tamano={14} className={delta > 0 ? 'cifra-reporte__sube' : 'cifra-reporte__baja'} />}
            {delta === 0 ? igual : `${signo}${formatearNumero(delta)} ${comparacion}`}
          </span>
        )}
        {detalle && <span className="cifra-reporte__detalle">{detalle}</span>}
      </dd>
    </div>
  );
}

// Columnas apiladas: una por grupo (día, semana o mes), con sus series de abajo hacia arriba.
// series: [{ clave, nombre, color }]; grupos: [{ clave, actual?, [serie]: número }].
export function ColumnasApiladas({ grupos, series, etiqueta, titulo, tituloTabla, filaTabla, unidad = ['registro', 'registros'] }) {
  const totales = grupos.map((grupo) => series.reduce((suma, { clave }) => suma + grupo[clave], 0));
  const tope = topeLimpio(Math.max(...totales, 1));
  const marcas = [0, tope / 2, tope];
  return (
    <figure className={`columnas${grupos.length > 8 ? ' columnas--densas' : ''}`} style={{ '--columnas': grupos.length }}>
      <div className="columnas__plano">
        <div className="columnas__eje" aria-hidden="true">
          {marcas.map((m) => <span key={m} style={{ bottom: `${(m / tope) * 100}%` }}>{formatearNumero(m)}</span>)}
        </div>
        <div className="columnas__area">
          {marcas.map((m) => <i key={m} className="columnas__guia" style={{ bottom: `${(m / tope) * 100}%` }} aria-hidden="true" />)}
          {grupos.map((grupo, indice) => {
            const total = totales[indice];
            const resumen = series.map(({ clave, nombre }) => `${grupo[clave]} ${nombre.toLowerCase()}`).join(', ');
            return (
              <div key={grupo.clave} className={`columna${grupo.actual ? ' columna--actual' : ''}`} tabIndex={0}
                aria-label={`${titulo(grupo)}: ${total} ${total === 1 ? unidad[0] : unidad[1]} (${resumen})`}>
                <div className="columna__pila" style={{ height: `${(total / tope) * 100}%` }} aria-hidden="true">
                  {series.filter(({ clave }) => grupo[clave] > 0).map(({ clave, color }) => (
                    <i key={clave} className={`columna__parte columna__parte--${clave}`} style={{ flexGrow: grupo[clave], '--color-serie': color }} />
                  ))}
                </div>
                <span className="columna__etiqueta" aria-hidden="true">{etiqueta(grupo)}</span>
                <span className="columna__ayuda" role="tooltip" aria-hidden="true">
                  <strong>{titulo(grupo)}{grupo.actual ? ' (en curso)' : ''}</strong>
                  {series.map(({ clave, nombre, color }) => (
                    <span key={clave}><i className={`muestra-serie muestra-serie--${clave}`} style={{ '--color-serie': color }} />{nombre}<b className="cifra">{grupo[clave]}</b></span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <figcaption className="leyenda-series">
        {series.map(({ clave, nombre, color }) => (
          <span key={clave}><i className={`muestra-serie muestra-serie--${clave}`} style={{ '--color-serie': color }} aria-hidden="true" />{nombre}</span>
        ))}
      </figcaption>
      {/* La tabla va dentro de un contenedor oculto: una tabla no respeta el ancho de 1 px y desbordaba la página. */}
      <div className="solo-lector">
      <table>
        <caption>{tituloTabla}</caption>
        <thead><tr><th scope="col">{filaTabla.encabezado}</th>{series.map((s) => <th key={s.clave} scope="col">{s.nombre}</th>)}</tr></thead>
        <tbody>
          {grupos.map((grupo) => (
            <tr key={grupo.clave}><th scope="row">{filaTabla.texto(grupo)}</th>{series.map(({ clave }) => <td key={clave}>{grupo[clave]}</td>)}</tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

// Barras horizontales de una sola serie (sin leyenda: el título dice qué se mide), con el valor en la punta.
// formato: cómo se escribe el valor (por defecto, el número); detalle: texto opcional junto al valor.
export function Barras({ filas, etiquetaLector, formato = formatearNumero }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 1);
  return (
    <ul className="barras" aria-label={etiquetaLector}>
      {filas.map((f) => (
        <li key={f.etiqueta} className="barras__fila">
          <span className="barras__etiqueta" title={f.etiqueta}>{f.etiqueta}</span>
          <span className="barras__pista" aria-hidden="true">
            <i className="barras__barra" style={{ width: `${(f.valor / maximo) * 100}%`, ...(f.color && { '--color-serie': f.color }) }} />
          </span>
          <span className="barras__valor cifra">{formato(f.valor)}{f.detalle && <small> {f.detalle}</small>}</span>
        </li>
      ))}
    </ul>
  );
}
