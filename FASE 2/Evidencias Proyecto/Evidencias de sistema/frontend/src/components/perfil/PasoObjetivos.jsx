import { useState } from 'react';
import Alerta from '../Alerta.jsx';
import CampoFormulario from '../CampoFormulario.jsx';
import Icono from '../Icono.jsx';
import { actualizarObjetivos } from '../../services/perfil.service.js';
import { opcionesComidas, opcionesObjetivo, opcionesSueno, validarObjetivos } from '../../services/validaciones.js';
import { PieAsistente } from './piezas.jsx';

const ICONO_OBJETIVO = {
  bajar_peso: 'objetivoBajar', mantener_peso: 'objetivoMantener', aumentar_masa: 'mancuerna', mejorar_rendimiento: 'rayo', otro: 'mas',
};

// Paso 2 del asistente: objetivo principal y estilo de vida (FS-HU-18).
export default function PasoObjetivos({ objetivos, onGuardado, onVolver, textoVolver, textoPrincipal }) {
  const [datos, setDatos] = useState({
    objetivoPrincipal: objetivos.objetivoPrincipal ?? '',
    comidasDia: objetivos.comidasDia ?? '',
    horasSueno: objetivos.horasSueno ?? '',
  });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (evento) => setDatos({ ...datos, [evento.target.name]: evento.target.value });

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    const erroresCliente = validarObjetivos(datos);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) return;
    setEnviando(true);
    try {
      onGuardado(await actualizarObjetivos({ ...datos, comidasDia: Number(datos.comidasDia) }));
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Alerta>{mensaje}</Alerta>
      <fieldset className="grupo-opciones" aria-describedby={errores.objetivoPrincipal ? 'objetivo-error' : undefined}>
        <legend>Objetivo principal</legend>
        <div className="tarjetas-objetivo">
          {opcionesObjetivo.map(({ valor, etiqueta }) => (
            <label key={valor} className={`tarjeta-objetivo${datos.objetivoPrincipal === valor ? ' tarjeta-objetivo--activa' : ''}`}>
              <input type="radio" name="objetivoPrincipal" value={valor} checked={datos.objetivoPrincipal === valor} onChange={cambiar} />
              <Icono nombre={ICONO_OBJETIVO[valor]} tamano={24} />
              <span>{etiqueta}</span>
            </label>
          ))}
        </div>
        {errores.objetivoPrincipal && <p id="objetivo-error" className="campo__mensaje" role="alert">{errores.objetivoPrincipal}</p>}
      </fieldset>
      <CampoFormulario id="comidasDia" etiqueta="¿Cuántas comidas realizas al día?" value={datos.comidasDia} onChange={cambiar}
        error={errores.comidasDia}>
        <option value="">Selecciona una opción</option>
        {opcionesComidas.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
      </CampoFormulario>
      <CampoFormulario id="horasSueno" etiqueta="Horas de sueño promedio" value={datos.horasSueno} onChange={cambiar}
        error={errores.horasSueno}>
        <option value="">Selecciona una opción</option>
        {opcionesSueno.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
      </CampoFormulario>
      <PieAsistente onVolver={onVolver} textoVolver={textoVolver} textoPrincipal={textoPrincipal} enviando={enviando} />
    </form>
  );
}
