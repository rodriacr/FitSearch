import { useEffect, useState } from 'react';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import AsistentePerfil from '../components/perfil/AsistentePerfil.jsx';
import PasoDatosPersonales from '../components/perfil/PasoDatosPersonales.jsx';
import PasoObjetivos from '../components/perfil/PasoObjetivos.jsx';
import PasoSalud from '../components/perfil/PasoSalud.jsx';
import PasoTipoCuenta from '../components/perfil/PasoTipoCuenta.jsx';
import { TarjetaEstimacion } from '../components/perfil/piezas.jsx';
import ResumenPerfil from '../components/perfil/ResumenPerfil.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { obtenerPerfil } from '../services/perfil.service.js';

const FINAL = 4;

// Primer paso pendiente del asistente, o null si el perfil está completo.
function pasoPendiente({ pasos }) {
  const orden = [pasos.tipoCuenta, pasos.datosPersonales, pasos.objetivos, pasos.salud];
  const indice = orden.indexOf(false);
  return indice === -1 ? null : indice;
}

// "Mi perfil": asistente de 5 pasos mientras falten datos (FS-HU-02, FS-HU-18, FS-HU-19) y luego el resumen con "Editar".
export default function Perfil() {
  const { aviso, limpiarAviso, actualizarSesion } = useSesion();
  const [avisoInicial] = useState(aviso);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState(null);
  // Paso en el que se abrió el asistente: ahí se muestra el saludo de bienvenida.
  const [pasoInicial, setPasoInicial] = useState(null);
  // vista: { tipo: 'asistente', paso, edicion } | { tipo: 'resumen' }
  const [vista, setVista] = useState(null);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let activo = true;
    obtenerPerfil()
      .then((respuesta) => {
        if (!activo) return;
        setDatos(respuesta);
        const pendiente = pasoPendiente(respuesta);
        setPasoInicial(pendiente);
        setVista(pendiente === null ? { tipo: 'resumen' } : { tipo: 'asistente', paso: pendiente, edicion: false });
      })
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  // El aviso de sesión iniciada o de cuenta creada se muestra una sola vez al llegar al perfil.
  useEffect(() => {
    if (avisoInicial) limpiarAviso();
  }, [avisoInicial, limpiarAviso]);

  if (cargando) return <p className="texto-secundario">Cargando tu perfil…</p>;
  if (error) return <Alerta>{error}</Alerta>;

  const avisos = (
    <>
      {avisoInicial && <Alerta tipo={avisoInicial.tipo}>{avisoInicial.texto}</Alerta>}
      <Alerta tipo="exito">{mensaje}</Alerta>
    </>
  );

  if (vista.tipo === 'resumen') {
    return (
      <ResumenPerfil datos={datos} aviso={avisos}
        onEditar={(paso) => { setMensaje(''); setVista({ tipo: 'asistente', paso, edicion: true }); }} />
    );
  }

  const { paso, edicion } = vista;
  const alGuardar = (respuesta) => {
    setDatos(respuesta);
    // El paso del tipo de cuenta devuelve un token nuevo: el rol cambió y viaja dentro del token.
    if (respuesta.token) actualizarSesion({ token: respuesta.token, usuario: respuesta.usuario });
    if (edicion) {
      setMensaje('Tus cambios se guardaron correctamente.');
      setVista({ tipo: 'resumen' });
    } else {
      setVista({ tipo: 'asistente', paso: paso + 1, edicion: false });
    }
  };
  const propsPaso = {
    onGuardado: alGuardar,
    onVolver: edicion ? () => setVista({ tipo: 'resumen' }) : (paso > 0 ? () => setVista({ ...vista, paso: paso - 1 }) : undefined),
    textoVolver: edicion ? 'Cancelar' : 'Volver',
    textoPrincipal: edicion ? 'Guardar cambios' : 'Siguiente',
  };

  return (
    <AsistentePerfil paso={paso} aviso={(!edicion && paso === pasoInicial) || paso === FINAL ? avisos : null}>
      {paso === 0 && <PasoTipoCuenta rol={datos.pasos.tipoCuenta ? datos.usuario.rol : ''} {...propsPaso} />}
      {paso === 1 && <PasoDatosPersonales perfil={datos.perfil} {...propsPaso} />}
      {paso === 2 && <PasoObjetivos objetivos={datos.objetivos} {...propsPaso} />}
      {paso === 3 && <PasoSalud salud={datos.salud} {...propsPaso} />}
      {paso === FINAL && (
        <div className="paso-final">
          <span className="paso-final__check"><Icono nombre="check" tamano={36} /></span>
          <h1>¡Información guardada!</h1>
          <p className="texto-secundario">Tu perfil fue creado correctamente. Ya puedes usar FitSearch con recomendaciones basadas en tus datos.</p>
          <TarjetaEstimacion kcal={datos.requerimientoCaloricoKcal} />
          <button type="button" className="boton boton--principal" onClick={() => setVista({ tipo: 'resumen' })}>
            Ir a mi perfil <Icono nombre="flecha" tamano={18} />
          </button>
        </div>
      )}
    </AsistentePerfil>
  );
}
