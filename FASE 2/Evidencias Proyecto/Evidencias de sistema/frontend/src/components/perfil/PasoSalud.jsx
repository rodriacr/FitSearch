import { useState } from 'react';
import Alerta from '../Alerta.jsx';
import Icono from '../Icono.jsx';
import { actualizarSalud } from '../../services/perfil.service.js';
import { catalogoSalud, validarSalud } from '../../services/validaciones.js';
import { GrupoCasillas, PieAsistente } from './piezas.jsx';

// Paso 3 del asistente: información de salud (FS-HU-19). Solo opciones de catálogo, sin texto libre (minimización de datos).
export default function PasoSalud({ salud, onGuardado, onVolver, textoVolver, textoPrincipal }) {
  const [datos, setDatos] = useState({
    condicionesMedicas: salud?.condicionesMedicas ?? [],
    tomaMedicamentos: salud?.tomaMedicamentos ?? null,
    medicamentos: salud?.medicamentos ?? [],
    alergias: salud?.alergias ?? [],
  });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fijar = (campo) => (valor) => setDatos({ ...datos, [campo]: valor });

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje('');
    const erroresCliente = validarSalud(datos);
    setErrores(erroresCliente);
    if (Object.keys(erroresCliente).length > 0) return;
    setEnviando(true);
    try {
      onGuardado(await actualizarSalud({ ...datos, medicamentos: datos.tomaMedicamentos ? datos.medicamentos : [] }));
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <Alerta>{mensaje}</Alerta>
      <GrupoCasillas nombre="condicionesMedicas" leyenda="¿Tienes alguna condición médica?" opciones={catalogoSalud.condicionesMedicas}
        seleccion={datos.condicionesMedicas} onCambio={fijar('condicionesMedicas')} error={errores.condicionesMedicas} />

      <fieldset className="grupo-opciones" aria-describedby={errores.tomaMedicamentos ? 'toma-error' : undefined}>
        <legend>¿Tomas algún medicamento regularmente?</legend>
        <div className="selector-rol__opciones">
          {[[true, 'Sí'], [false, 'No']].map(([valor, etiqueta]) => (
            <label key={etiqueta} className={`selector-rol__opcion${datos.tomaMedicamentos === valor ? ' selector-rol__opcion--activa' : ''}`}>
              <input type="radio" name="tomaMedicamentos" checked={datos.tomaMedicamentos === valor}
                onChange={() => setDatos({ ...datos, tomaMedicamentos: valor })} />
              {etiqueta}
            </label>
          ))}
        </div>
        {errores.tomaMedicamentos && <p id="toma-error" className="campo__mensaje" role="alert">{errores.tomaMedicamentos}</p>}
      </fieldset>

      {datos.tomaMedicamentos && (
        <GrupoCasillas nombre="medicamentos" leyenda="¿Qué tipo de medicamento?" opciones={catalogoSalud.medicamentos}
          seleccion={datos.medicamentos} onCambio={fijar('medicamentos')} error={errores.medicamentos} />
      )}

      <GrupoCasillas nombre="alergias" leyenda="Alergias" opciones={catalogoSalud.alergias}
        seleccion={datos.alergias} onCambio={fijar('alergias')} error={errores.alergias} />

      <p className="nota-privacidad">
        <Icono nombre="info" tamano={20} />
        Toda la información es confidencial: solo tú puedes verla y se usa únicamente para mejorar tu experiencia en la plataforma.
      </p>
      <PieAsistente onVolver={onVolver} textoVolver={textoVolver} textoPrincipal={textoPrincipal} enviando={enviando} />
    </form>
  );
}
