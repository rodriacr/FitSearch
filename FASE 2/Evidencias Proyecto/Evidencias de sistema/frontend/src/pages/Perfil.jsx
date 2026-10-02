import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import CampoFormulario from '../components/CampoFormulario.jsx';
import { useSesion } from '../context/SesionContext.jsx';
import { actualizarPerfil, obtenerPerfil } from '../services/perfil.service.js';
import { opcionesActividad, opcionesSexo, validarPerfil } from '../services/validaciones.js';

const FORMULARIO_VACIO = { pesoKg: '', alturaCm: '', edad: '', sexo: '', actividadFisica: '' };
const aFormulario = (perfil) =>
  Object.fromEntries(Object.keys(FORMULARIO_VACIO).map((campo) => [campo, perfil[campo] ?? '']));

export default function Perfil() {
  const { state } = useLocation();
  const { aviso, limpiarAviso } = useSesion();
  const [avisoInicial] = useState(aviso);
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [completo, setCompleto] = useState(false);
  const [requerimiento, setRequerimiento] = useState(null);
  const [datos, setDatos] = useState(FORMULARIO_VACIO);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: 'error', texto: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerPerfil()
      .then((respuesta) => {
        if (!activo) return;
        setUsuario(respuesta.usuario);
        setCompleto(respuesta.completo);
        setRequerimiento(respuesta.requerimientoCaloricoKcal);
        setDatos(aFormulario(respuesta.perfil));
      })
      .catch((error) => activo && setMensaje({ tipo: 'error', texto: error.message }))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  // El aviso de sesión iniciada se muestra una sola vez al llegar al perfil.
  useEffect(() => {
    if (avisoInicial) limpiarAviso();
  }, [avisoInicial, limpiarAviso]);

  const cambiar = (evento) => setDatos({ ...datos, [evento.target.name]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje({ tipo: 'error', texto: '' });
    const erroresCliente = validarPerfil(datos);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) {
      setMensaje({ tipo: 'error', texto: 'No se guardaron los datos: completa o corrige los campos marcados.' });
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await actualizarPerfil({
        pesoKg: Number(datos.pesoKg),
        alturaCm: Number(datos.alturaCm),
        edad: Number(datos.edad),
        sexo: datos.sexo,
        actividadFisica: datos.actividadFisica,
      });
      setCompleto(respuesta.completo);
      setRequerimiento(respuesta.requerimientoCaloricoKcal);
      setDatos(aFormulario(respuesta.perfil));
      setMensaje({ tipo: 'exito', texto: 'Tus datos básicos se guardaron correctamente.' });
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <p className="texto-secundario">Cargando tu perfil…</p>;

  return (
    <section className="tarjeta">
      <h1>{usuario ? `Hola, ${usuario.nombre}` : 'Mi perfil'}</h1>
      {usuario && <p className="texto-secundario">{usuario.correo}</p>}
      {state?.bienvenida && <Alerta tipo="exito">Tu cuenta fue creada y la sesión está iniciada.</Alerta>}
      {avisoInicial && <Alerta tipo={avisoInicial.tipo}>{avisoInicial.texto}</Alerta>}
      {!completo && usuario && (
        <Alerta tipo="info">Completa tus datos básicos para recibir estimaciones nutricionales personalizadas.</Alerta>
      )}
      <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>

      {requerimiento !== null && (
        <div className="estimacion" aria-live="polite">
          <p className="estimacion__titulo">Requerimiento calórico diario estimado</p>
          <p className="estimacion__valor">{requerimiento.toLocaleString('es-CL')} kcal/día</p>
          <p className="estimacion__nota">
            Estimación referencial calculada con la ecuación de Mifflin-St Jeor y tu nivel de actividad física.
            No reemplaza la evaluación de un profesional de la salud.
          </p>
        </div>
      )}

      <form onSubmit={guardar} noValidate>
        <h2>Datos básicos</h2>
        <div className="grilla">
          <CampoFormulario id="pesoKg" etiqueta="Peso (kg)" type="number" inputMode="decimal" step="0.1"
            value={datos.pesoKg} onChange={cambiar} error={errores.pesoKg} />
          <CampoFormulario id="alturaCm" etiqueta="Altura (cm)" type="number" inputMode="decimal" step="0.1"
            value={datos.alturaCm} onChange={cambiar} error={errores.alturaCm} />
          <CampoFormulario id="edad" etiqueta="Edad (años)" type="number" inputMode="numeric" step="1"
            value={datos.edad} onChange={cambiar} error={errores.edad} />
          <CampoFormulario id="sexo" etiqueta="Sexo"
            value={datos.sexo} onChange={cambiar} error={errores.sexo}>
            <option value="">Selecciona una opción</option>
            {opcionesSexo.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </CampoFormulario>
          <CampoFormulario id="actividadFisica" etiqueta="Actividad física"
            value={datos.actividadFisica} onChange={cambiar} error={errores.actividadFisica}>
            <option value="">Selecciona una opción</option>
            {opcionesActividad.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
            ))}
          </CampoFormulario>
        </div>
        <button type="submit" className="boton" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar datos'}</button>
      </form>
    </section>
  );
}
