import { useEffect, useState } from 'react';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import Medalla from '../components/logros/Medalla.jsx';
import MedallaNueva from '../components/logros/MedallaNueva.jsx';
import { formatearNumero } from '../services/formato.js';
import { marcarLogrosVistos, obtenerLogros } from '../services/logros.service.js';
import './Logros.css';

const NIVELES = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro', platino: 'Platino' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const fechaCorta = (iso) => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'America/Santiago' }).format(new Date(iso));
const diaMes = (fecha) => { const [, mes, dia] = fecha.split('-').map(Number); return `${dia} ${MESES[mes - 1]}`; };
const porcentaje = (valor, meta) => `${Math.round(Math.min(valor / meta, 1) * 100)}%`;

function Anillo({ progreso, numero }) {
  const largo = 2 * Math.PI * 47;
  return (
    <div className="logros-anillo">
      <svg viewBox="0 0 112 112" aria-hidden="true">
        <defs><linearGradient id="logros-anillo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd27a" /><stop offset="1" stopColor="#f47b20" /></linearGradient></defs>
        <circle cx="56" cy="56" r="47" className="logros-anillo__fondo" />
        <circle cx="56" cy="56" r="47" className="logros-anillo__avance" stroke="url(#logros-anillo)" strokeDasharray={largo} strokeDashoffset={largo * (1 - progreso)} />
      </svg>
      <span><strong>{numero}</strong><small>Nivel</small></span>
    </div>
  );
}

function Vitrina({ nivel, totales, racha, destacadas }) {
  const centro = destacadas[0];
  const lados = destacadas.slice(1, 4);
  return (
    <section className="logros-vitrina" aria-labelledby="titulo-nivel">
      <div className="logros-vitrina__nivel">
        <h2 id="titulo-nivel">Tu nivel de bienestar</h2>
        <div className="logros-vitrina__fila">
          <Anillo progreso={nivel.progreso} numero={nivel.numero} />
          <div className="logros-vitrina__texto">
            <p className="logros-vitrina__nombre">{nivel.nombre}</p>
            <p>{nivel.siguiente ? <>Al nivel {nivel.siguiente.numero} llegas a <b>«{nivel.siguiente.nombre}»</b>.</> : 'Llegaste al nivel más alto. ¡Felicitaciones!'}</p>
            <div className="logros-barra" role="progressbar" aria-label="Avance al siguiente nivel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(nivel.progreso * 100)}>
              <i style={{ width: `${Math.round(nivel.progreso * 100)}%` }} />
            </div>
            <div className="logros-vitrina__meta">
              <span>{formatearNumero(nivel.puntos)} puntos</span>
              {nivel.siguiente && <span>Faltan {formatearNumero(nivel.siguiente.desde - nivel.puntos)}</span>}
            </div>
          </div>
        </div>
        <ul className="logros-chips">
          <li>🏅 {totales.obtenidas} de {totales.total} medallas</li>
          <li>⚡ Racha de {racha.actual} {racha.actual === 1 ? 'día' : 'días'}</li>
          <li>🛡️ {racha.descansoDisponible ? '1 descanso disponible esta semana' : 'Descanso de la semana usado'}</li>
        </ul>
      </div>
      <div className="logros-estante">
        {centro ? (
          <>
            {lados.slice(0, 1).map((m) => <Pieza key={`${m.clave}-${m.nivel}`} medalla={m} />)}
            <Pieza medalla={centro} destacada />
            {lados.slice(1).map((m) => <Pieza key={`${m.clave}-${m.nivel}`} medalla={m} />)}
          </>
        ) : (
          <p className="logros-estante__vacio">Tu vitrina está esperando su primera medalla. Registra tus comidas o tu agua de hoy para empezar.</p>
        )}
      </div>
    </section>
  );
}

function Pieza({ medalla, destacada = false }) {
  return (
    <figure className={`logros-pieza${destacada ? ' logros-pieza--destacada' : ''}`}>
      <Medalla nivel={medalla.nivel} icono={medalla.icono} color={medalla.color ?? '#1565a0'} tamano={destacada ? 116 : 78} />
      <figcaption><b>{medalla.nombre}</b><small>{destacada ? 'La más reciente' : fechaCorta(medalla.fecha)}</small></figcaption>
    </figure>
  );
}

function Coleccion({ coleccion }) {
  const siguiente = coleccion.niveles.find((n) => !n.obtenida);
  return (
    <li className="logros-coleccion" style={{ '--color-coleccion': coleccion.color }}>
      <div className="logros-coleccion__cab">
        <div><h3>{coleccion.nombre}</h3><p>{coleccion.descripcion}</p></div>
        <span className="logros-coleccion__cuenta">{coleccion.obtenidas}/4</span>
      </div>
      <ol className="logros-coleccion__niveles">
        {coleccion.niveles.map((n) => (
          <li key={n.nivel}>
            <Medalla nivel={n.nivel} icono={coleccion.icono} color={coleccion.color} tamano={50} bloqueada={!n.obtenida}
              titulo={`${coleccion.nombre} ${NIVELES[n.nivel]}: ${n.obtenida ? 'obtenida' : 'pendiente'}`} />
            <strong>{NIVELES[n.nivel]}</strong>
            <span>{n.etiqueta}</span>
          </li>
        ))}
      </ol>
      <p className="logros-coleccion__pie">
        {siguiente ? `${NIVELES[siguiente.nivel]}: ${formatearNumero(siguiente.valor)} de ${formatearNumero(siguiente.meta)}` : <b>¡Colección completa!</b>}
      </p>
    </li>
  );
}

// Mis logros (25-11-2026): nivel de bienestar, vitrina con las medallas más recientes, las que están cerca, seis
// colecciones con cuatro niveles, retos de temporada, medallas secretas e historial. Las reglas viven en la API.
export default function Logros() {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [nuevas, setNuevas] = useState([]);
  const cargando = resultado?.intento !== intento;

  useEffect(() => {
    let activo = true;
    obtenerLogros()
      .then((datos) => { if (activo) { setResultado({ intento, datos }); setNuevas(datos.nuevas ?? []); } })
      .catch((error) => activo && setResultado({ intento, error: error.message }));
    return () => { activo = false; };
  }, [intento]);

  const cerrarNuevas = () => {
    setNuevas([]);
    marcarLogrosVistos().catch(() => {});
  };

  let contenido;
  if (cargando) {
    contenido = <p className="logros__estado" role="status">Cargando tus logros…</p>;
  } else if (resultado.error) {
    contenido = (
      <div className="logros__estado">
        <Alerta>{resultado.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setIntento(intento + 1)}>Reintentar</button>
      </div>
    );
  } else {
    const d = resultado.datos;
    contenido = (
      <>
        <Vitrina nivel={d.nivel} totales={d.totales} racha={d.racha} destacadas={d.destacadas} />

        <div className="logros-dos">
          <section className="logros-panel" aria-labelledby="titulo-cerca">
            <h2 id="titulo-cerca">Estás cerca de…</h2>
            <p className="logros-panel__sub">Las medallas que puedes ganar pronto.</p>
            {d.cerca.length ? (
              <ul className="logros-cerca">
                {d.cerca.map((c) => (
                  <li key={c.clave}>
                    <Medalla nivel={c.nivel} icono={c.icono} color={c.color} tamano={44} />
                    <div>
                      <b>{c.nombre}</b><small>{c.etiqueta}</small>
                      <div className="logros-mini" role="progressbar" aria-label={`Avance de ${c.nombre}`} aria-valuemin={0} aria-valuemax={c.meta} aria-valuenow={c.valor}>
                        <i style={{ width: porcentaje(c.valor, c.meta) }} />
                      </div>
                    </div>
                    <span className="logros-cerca__falta">Faltan {formatearNumero(c.faltan)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="logros-panel__vacio">Registra tus comidas y tu agua para ver aquí tus próximas medallas.</p>}
          </section>

          <section className="logros-panel" aria-labelledby="titulo-historia">
            <h2 id="titulo-historia">Tu historia</h2>
            <p className="logros-panel__sub">Cada logro, en orden.</p>
            {d.historial.length ? (
              <ol className="logros-historia">
                {d.historial.map((m) => (
                  <li key={`${m.clave}-${m.nivel}-${m.periodo}`} style={{ '--color-hito': m.color ?? '#1565a0' }}>
                    <Medalla nivel={m.nivel} icono={m.icono} color={m.color ?? '#1565a0'} tamano={36} />
                    <div><b>{m.nombre}</b><small>{fechaCorta(m.fecha)} · +{formatearNumero(m.puntos)} puntos</small></div>
                  </li>
                ))}
              </ol>
            ) : <p className="logros-panel__vacio">Aquí aparecerá cada medalla que ganes, con su fecha.</p>}
          </section>
        </div>

        <section className="logros-panel" aria-labelledby="titulo-colecciones">
          <h2 id="titulo-colecciones">Colecciones</h2>
          <p className="logros-panel__sub">Cuatro niveles por colección: Bronce, Plata, Oro y Platino.</p>
          <ul className="logros-colecciones">
            {d.colecciones.map((c) => <Coleccion key={c.clave} coleccion={c} />)}
          </ul>
          {d.sinMeta && <p className="logros-aviso"><Icono nombre="info" tamano={18} /> Completa tu perfil para calcular tu meta de calorías y sumar días a «Equilibrio».</p>}
          <p className="logros-cuida">
            <Icono nombre="escudo" tamano={18} />
            <span><b>Medallas que cuidan.</b> «Equilibrio» premia los días cerca de tu meta (±10 %), no los días bajo ella. No hay medallas por bajar de peso ni por saltarse comidas, y un día de descanso a la semana no corta tu racha.</span>
          </p>
        </section>

        <div className="logros-dos">
          <section className="logros-panel" aria-labelledby="titulo-temporada">
            <h2 id="titulo-temporada">Retos de temporada</h2>
            <p className="logros-panel__sub">Ediciones limitadas: si no la ganas en su fecha, no vuelve.</p>
            <ul className="logros-temporada">
              {d.temporada.map((t) => (
                <li key={t.clave} className={`logros-reto logros-reto--${t.icono}`}>
                  <span className="logros-reto__etiqueta">{t.obtenida ? '¡Ganada!' : t.activa ? `Hasta el ${diaMes(t.termino)}` : `Empieza el ${diaMes(t.inicio)}`}</span>
                  <h3>{t.nombre}</h3>
                  <p>{t.descripcion}</p>
                  <Medalla nivel="temporada" icono={t.icono} color="#ffffff" tamano={64} bloqueada={!t.obtenida && !t.activa} />
                  {t.activa && (
                    <>
                      <div className="logros-reto__barra" role="progressbar" aria-label={`Avance de ${t.nombre}`} aria-valuemin={0} aria-valuemax={t.meta} aria-valuenow={t.valor}><i style={{ width: porcentaje(t.valor, t.meta) }} /></div>
                      <small>{t.valor} de {t.meta} días</small>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="logros-panel" aria-labelledby="titulo-secretas">
            <h2 id="titulo-secretas">Secretas</h2>
            <p className="logros-panel__sub">Se revelan al ganarlas. ¿Adivinas cuáles son?</p>
            <ul className="logros-secretas">
              {d.secretas.map((s) => (
                <li key={s.clave}>
                  <Medalla nivel="secreta" icono={s.obtenida ? s.icono : 'pregunta'} color="#8b5cf6" tamano={58} bloqueada={!s.obtenida} />
                  <strong>{s.obtenida ? s.nombre : '???'}</strong>
                  <small>{s.obtenida ? s.descripcion : `Pista: ${s.pista}`}</small>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </>
    );
  }

  return (
    <section className="logros" aria-labelledby="titulo-logros">
      <header className="logros__cabecera">
        <div>
          <h1 id="titulo-logros">Mis logros</h1>
          <p>Medallas por hábitos que te hacen bien. Nunca por comer menos.</p>
        </div>
        <p className="logros__privado"><Icono nombre="candado" tamano={16} /> Solo tú ves tus logros</p>
      </header>
      {contenido}
      {nuevas.length > 0 && <MedallaNueva medallas={nuevas} onCerrar={cerrarNuevas} />}
    </section>
  );
}
