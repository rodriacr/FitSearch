import { useEffect, useId, useRef, useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import {
  aporte, buscarAlimentos, GRAMOS_MAX, GRAMOS_MIN, leerGramos, MOMENTOS, momentoSegunHora, registrarComida,
} from '../../services/comidas.service.js';

const ESPERA_BUSQUEDA_MS = 250;

// Registrar un alimento del catálogo con sus gramos (FS-HU-09 y FS-HU-10): el cálculo se ve antes de guardar. Después de
// guardar el panel queda abierto, listo para el siguiente alimento de la misma comida.
export default function RegistrarComida({ fecha, momentoInicial, alGuardar, alCerrar }) {
  const id = useId();
  const campoBusqueda = useRef(null);
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState({ texto: '', alimentos: [], error: '' });
  const [alimento, setAlimento] = useState(null);
  const [gramos, setGramos] = useState('100');
  const [momento, setMomento] = useState(momentoInicial ?? momentoSegunHora());
  const [estado, setEstado] = useState({ guardando: false, error: '', exito: '' });
  const consulta = texto.trim();
  const buscando = !alimento && consulta.length >= 2 && busqueda.texto !== consulta;

  // Con el panel abierto, «+» en otro momento del día cambia el momento sin perder lo escrito.
  const [momentoPedido, setMomentoPedido] = useState(momentoInicial);
  if (momentoInicial !== momentoPedido) {
    setMomentoPedido(momentoInicial);
    if (momentoInicial) setMomento(momentoInicial);
  }

  useEffect(() => { campoBusqueda.current?.focus(); }, []);

  useEffect(() => {
    if (alimento || consulta.length < 2) return undefined;
    let activo = true;
    const espera = setTimeout(() => {
      buscarAlimentos(consulta)
        .then(({ alimentos }) => activo && setBusqueda({ texto: consulta, alimentos, error: '' }))
        .catch((error) => activo && setBusqueda({ texto: consulta, alimentos: [], error: error.message }));
    }, ESPERA_BUSQUEDA_MS);
    return () => { activo = false; clearTimeout(espera); };
  }, [consulta, alimento]);

  const gramosValidos = leerGramos(gramos);
  const calculo = alimento && gramosValidos ? aporte(alimento, gramosValidos) : null;

  function elegir(elegido) {
    setAlimento(elegido);
    setEstado({ guardando: false, error: '', exito: '' });
  }

  function cambiarAlimento() {
    setAlimento(null);
    setTexto('');
    setBusqueda({ texto: '', alimentos: [], error: '' });
    setTimeout(() => campoBusqueda.current?.focus());
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (!alimento) {
      setEstado({ guardando: false, error: 'Busca y elige un alimento del catálogo.', exito: '' });
      return;
    }
    if (!gramosValidos) {
      setEstado({ guardando: false, error: `Indica entre ${GRAMOS_MIN} y ${formatearNumero(GRAMOS_MAX)} gramos.`, exito: '' });
      return;
    }
    setEstado({ guardando: true, error: '', exito: '' });
    try {
      const { registro } = await registrarComida({ fecha, momento, alimentoId: alimento.id, gramos: gramosValidos });
      const etiqueta = MOMENTOS.find(({ valor }) => valor === momento).etiqueta.toLowerCase();
      setEstado({ guardando: false, error: '', exito: `Agregaste ${formatearNumero(registro.gramos)} g de ${registro.nombre.toLowerCase()} a tu ${etiqueta}.` });
      setAlimento(null);
      setTexto('');
      setBusqueda({ texto: '', alimentos: [], error: '' });
      setGramos('100');
      alGuardar(registro);
      campoBusqueda.current?.focus();
    } catch (error) {
      setEstado({ guardando: false, error: error.message, exito: '' });
    }
  }

  return (
    <section className="registrar-comida panel-tarjeta" aria-labelledby={`${id}-titulo`}>
      <div className="registrar-comida__encabezado">
        <h2 id={`${id}-titulo`}>Registrar comida</h2>
        <button type="button" className="boton-icono" onClick={alCerrar} aria-label="Cerrar registro de comida"><Icono nombre="cerrar" tamano={20} /></button>
      </div>
      <form onSubmit={guardar} noValidate>
        <div className="registrar-comida__campos">
          <label className="registrar-comida__campo" htmlFor={`${id}-momento`}>
            <span>Momento del día</span>
            <select id={`${id}-momento`} value={momento} onChange={(evento) => setMomento(evento.target.value)}>
              {MOMENTOS.map(({ valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </select>
          </label>
          <div className="registrar-comida__campo registrar-comida__campo--alimento">
            <label htmlFor={`${id}-alimento`}>Alimento</label>
            {alimento ? (
              <p className="registrar-comida__elegido">
                <strong>{alimento.nombre}</strong>
                <button type="button" className="boton-texto" onClick={cambiarAlimento}>Cambiar</button>
              </p>
            ) : (
              <input ref={campoBusqueda} id={`${id}-alimento`} type="search" value={texto} autoComplete="off"
                placeholder="Ej.: pollo, arroz, plátano" maxLength={60} onChange={(evento) => setTexto(evento.target.value)} />
            )}
          </div>
          <label className="registrar-comida__campo registrar-comida__campo--gramos" htmlFor={`${id}-gramos`}>
            <span>Gramos</span>
            <input id={`${id}-gramos`} inputMode="decimal" value={gramos} onChange={(evento) => setGramos(evento.target.value)} />
          </label>
        </div>

        {!alimento && consulta.length >= 2 && (
          <div className="registrar-comida__resultados" aria-live="polite">
            {buscando && <p className="texto-secundario">Buscando…</p>}
            {!buscando && busqueda.error && <Alerta>{busqueda.error}</Alerta>}
            {!buscando && !busqueda.error && busqueda.alimentos.length === 0 && (
              <p className="texto-secundario">No encontramos «{consulta}» en el catálogo. Prueba con otra palabra, por ejemplo «pollo» o «arroz».</p>
            )}
            {!buscando && busqueda.alimentos.length > 0 && (
              <ul aria-label="Alimentos encontrados">
                {busqueda.alimentos.map((opcion) => (
                  <li key={opcion.id}>
                    <button type="button" onClick={() => elegir(opcion)}>
                      <span>{opcion.nombre}</span>
                      <small>{formatearNumero(opcion.calorias)} kcal por 100 g</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {calculo && (
          <p className="registrar-comida__calculo" aria-live="polite">
            {formatearNumero(gramosValidos)} g aportan <strong>{formatearNumero(calculo.calorias)} kcal</strong>
            {' · '}{formatearNumero(calculo.proteinasG)} g de proteínas · {formatearNumero(calculo.carbohidratosG)} g de carbohidratos
            {' · '}{formatearNumero(calculo.grasasG)} g de grasas
          </p>
        )}
        {estado.error && <Alerta>{estado.error}</Alerta>}
        {estado.exito && <Alerta tipo="exito">{estado.exito}</Alerta>}
        <div className="registrar-comida__acciones">
          <button type="submit" className="boton boton--principal boton--compacto" disabled={estado.guardando}>
            {estado.guardando ? 'Guardando…' : 'Agregar a mis comidas'}
          </button>
          <p className="texto-secundario">Valores de referencia aproximados por 100 g; no reemplazan la evaluación de un nutricionista.</p>
        </div>
      </form>
    </section>
  );
}
