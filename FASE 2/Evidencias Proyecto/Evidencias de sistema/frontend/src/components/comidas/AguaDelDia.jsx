import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BarraNutriente } from './GraficosComidas.jsx';
import { deshacerAgua, obtenerAguaDelDia } from '../../services/agua.service.js';
import { formatearNumero } from '../../services/formato.js';
import './AguaDelDia.css';

// Agua del día en el Resumen nutricional de Comidas (FS-HU-33), con la misma barra que los macronutrientes. Es el mismo
// registro que «Agua hoy» del Inicio. version cambia cuando la página recarga el día (por ejemplo, al sumar agua desde
// «Registrar comida»), y entonces se vuelve a pedir. Revisión del PR #48: cada suma del día elegido se puede quitar,
// también en un día anterior, para corregir un error; la API solo quita las propias.
export default function AguaDelDia({ fecha, version = 0 }) {
  const [estado, setEstado] = useState(null);
  const [quitando, setQuitando] = useState(null);
  const [error, setError] = useState(null);
  const clave = `${fecha}-${version}`;
  // Día que se está viendo ahora. Revisión del PR #48: si se pulsa «Quitar» y se cambia de día antes de que termine,
  // la respuesta es del día anterior y no debe reemplazar los datos del día nuevo.
  const fechaVigente = useRef(fecha);
  const claveVigente = useRef(clave);
  useLayoutEffect(() => {
    fechaVigente.current = fecha;
    claveVigente.current = clave;
  });

  useEffect(() => {
    let activo = true;
    obtenerAguaDelDia(fecha)
      .then((dia) => activo && setEstado({ clave, dia }))
      .catch(() => activo && setEstado({ clave, error: true }));
    return () => { activo = false; };
  }, [clave, fecha]);

  async function quitar({ id }) {
    const fechaAlQuitar = fecha;
    setQuitando(id);
    setError(null);
    try {
      const dia = await deshacerAgua(id, fechaAlQuitar);
      if (fechaVigente.current === fechaAlQuitar) setEstado({ clave: claveVigente.current, dia });
    } catch (e) {
      if (fechaVigente.current === fechaAlQuitar) setError({ fecha: fechaAlQuitar, mensaje: e.message });
    } finally {
      setQuitando(null);
    }
  }

  // Mientras llega la primera respuesta no se muestra nada; al recargar se deja el valor anterior para que no salte.
  if (!estado) return null;
  if (estado.error) return <p className="texto-secundario agua-del-dia__error">No pudimos cargar el agua de este día.</p>;
  const { totalMl, metaMl, registros } = estado.dia;
  return (
    <div className="agua-del-dia">
      <BarraNutriente nombre="Agua" consumo={totalMl} objetivo={metaMl} unidad="ml" color="#2aa5c9" />
      {registros.length > 0 && (
        <ul className="agua-del-dia__sumas" aria-label="Agua registrada este día">
          {registros.map((registro) => (
            <li key={registro.id}>
              <span>{formatearNumero(registro.ml)} ml · {registro.hora}</span>
              <button type="button" className="boton-texto" disabled={quitando !== null} onClick={() => quitar(registro)}
                aria-label={`Quitar ${formatearNumero(registro.ml)} ml de las ${registro.hora}`}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      {error?.fecha === fecha && <p className="agua-del-dia__error" role="alert">{error.mensaje}</p>}
    </div>
  );
}
