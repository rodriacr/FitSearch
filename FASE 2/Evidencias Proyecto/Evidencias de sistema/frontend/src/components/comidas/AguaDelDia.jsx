import { useEffect, useState } from 'react';
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
  const [error, setError] = useState('');
  const clave = `${fecha}-${version}`;

  useEffect(() => {
    let activo = true;
    obtenerAguaDelDia(fecha)
      .then((dia) => activo && setEstado({ clave, dia }))
      .catch(() => activo && setEstado({ clave, error: true }));
    return () => { activo = false; };
  }, [clave, fecha]);

  async function quitar({ id }) {
    setQuitando(id);
    setError('');
    try {
      setEstado({ clave, dia: await deshacerAgua(id, fecha) });
    } catch (e) {
      setError(e.message);
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
      {error && <p className="agua-del-dia__error" role="alert">{error}</p>}
    </div>
  );
}
