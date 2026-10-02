import { useState } from 'react';
import Alerta from '../Alerta.jsx';
import CampoFormulario from '../CampoFormulario.jsx';
import { actualizarPerfil } from '../../services/perfil.service.js';
import { opcionesActividad, opcionesSexo, validarPerfil } from '../../services/validaciones.js';
import reglas from '@shared/reglas.json';
import { PieAsistente } from './piezas.jsx';

const { pesoKg, alturaCm, edad } = reglas.perfil;
const CAMPOS = ['pesoKg', 'alturaCm', 'edad', 'sexo', 'actividadFisica'];
const aFormulario = (perfil) => Object.fromEntries(CAMPOS.map((campo) => [campo, perfil[campo] ?? '']));

// Paso 1 del asistente: datos básicos para la estimación nutricional (FS-HU-02).
export default function PasoDatosPersonales({ perfil, onGuardado, onVolver, textoVolver, textoPrincipal }) {
  const [datos, setDatos] = useState(() => aFormulario(perfil));
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (evento) => setDatos({ ...datos, [evento.target.name]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    const erroresCliente = validarPerfil(datos);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) {
      setMensaje('No se guardaron los datos: completa o corrige los campos marcados.');
      return;
    }
    setEnviando(true);
    try {
      const respuesta = await actualizarPerfil({
        pesoKg: Number(datos.pesoKg), alturaCm: Number(datos.alturaCm), edad: Number(datos.edad),
        sexo: datos.sexo, actividadFisica: datos.actividadFisica,
      });
      onGuardado(respuesta);
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Alerta>{mensaje}</Alerta>
      <div className="grilla">
        <CampoFormulario id="pesoKg" etiqueta="Peso (kg)" type="number" inputMode="decimal" step="0.1" icono="balanza"
          ayuda={`El peso debe estar entre ${pesoKg.min} y ${pesoKg.max} kg`}
          value={datos.pesoKg} onChange={cambiar} error={errores.pesoKg} />
        <CampoFormulario id="alturaCm" etiqueta="Altura (cm)" type="number" inputMode="decimal" step="0.1" icono="regla"
          ayuda={`La altura debe estar entre ${alturaCm.min} y ${alturaCm.max} cm`}
          value={datos.alturaCm} onChange={cambiar} error={errores.alturaCm} />
      </div>
      <CampoFormulario id="edad" etiqueta="Edad (años)" type="number" inputMode="numeric" step="1" icono="calendario"
        ayuda={`Entre ${edad.min} y ${edad.max} años`} value={datos.edad} onChange={cambiar} error={errores.edad} />
      <CampoFormulario id="sexo" etiqueta="Sexo" icono="persona" ayuda="Se usa para el cálculo nutricional"
        value={datos.sexo} onChange={cambiar} error={errores.sexo}>
        <option value="">Selecciona una opción</option>
        {opcionesSexo.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
      </CampoFormulario>
      <CampoFormulario id="actividadFisica" etiqueta="Actividad física" icono="actividad" ayuda="Tu nivel de actividad en una semana normal"
        value={datos.actividadFisica} onChange={cambiar} error={errores.actividadFisica}>
        <option value="">Selecciona una opción</option>
        {opcionesActividad.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
      </CampoFormulario>
      <PieAsistente onVolver={onVolver} textoVolver={textoVolver} textoPrincipal={textoPrincipal} enviando={enviando} />
    </form>
  );
}
