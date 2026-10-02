import Icono from '../Icono.jsx';
import {
  catalogoSalud, etiquetaDe, opcionesActividad, opcionesComidas, opcionesObjetivo, opcionesSexo, opcionesSueno,
  OPCIONES_TIPO_CUENTA,
} from '../../services/validaciones.js';
import { TarjetaEstimacion } from './piezas.jsx';

const numero = (valor, unidad) => (valor === null ? '—' : `${valor.toLocaleString('es-CL')} ${unidad}`);
const listado = (opciones, valores) => (valores.length ? valores.map((valor) => etiquetaDe(opciones, valor)).join(', ') : '—');
const iniciales = (nombre) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0].toUpperCase()).join('');

function TarjetaResumen({ titulo, icono, paso, onEditar, filas, pie }) {
  return (
    <article className="resumen-tarjeta">
      <header className="resumen-tarjeta__encabezado">
        <h2><Icono nombre={icono} tamano={20} /> {titulo}</h2>
        <button type="button" className="boton-texto" onClick={() => onEditar(paso)} aria-label={`Editar ${titulo.toLowerCase()}`}>
          <Icono nombre="lapiz" tamano={16} /> Editar
        </button>
      </header>
      <dl className="resumen-tarjeta__datos">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>
        ))}
      </dl>
      {pie}
    </article>
  );
}

// Vista "Mi perfil" cuando el asistente está completo: resumen por sección con su botón "Editar".
export default function ResumenPerfil({ datos, aviso, onEditar }) {
  const { usuario, perfil, objetivos, salud, requerimientoCaloricoKcal } = datos;
  const tipoCuenta = OPCIONES_TIPO_CUENTA.find((opcion) => opcion.valor === usuario.rol);
  return (
    <section className="resumen">
      <header className="resumen__cabecera">
        <span className="avatar avatar--grande" aria-hidden="true">{iniciales(usuario.nombre)}</span>
        <div>
          <h1>Hola, {usuario.nombre}</h1>
          <p className="texto-secundario">{usuario.correo} · <span className="etiqueta-rol">{usuario.rol === 'profesional' ? 'Profesional' : 'Usuario'}</span></p>
        </div>
      </header>
      {aviso}
      <TarjetaEstimacion kcal={requerimientoCaloricoKcal} />
      <div className="resumen__grilla">
        <TarjetaResumen titulo="Tipo de cuenta" icono="maletin" paso={0} onEditar={onEditar} filas={[
          ['Uso de FitSearch', etiquetaDe(OPCIONES_TIPO_CUENTA, usuario.rol)],
          ['Descripción', tipoCuenta?.descripcion ?? '—'],
        ]} />
        <TarjetaResumen titulo="Datos personales" icono="usuario" paso={1} onEditar={onEditar} filas={[
          ['Peso', numero(perfil.pesoKg, 'kg')], ['Altura', numero(perfil.alturaCm, 'cm')], ['Edad', numero(perfil.edad, 'años')],
          ['Sexo', etiquetaDe(opcionesSexo, perfil.sexo)], ['Actividad física', etiquetaDe(opcionesActividad, perfil.actividadFisica)],
        ]} />
        <TarjetaResumen titulo="Objetivos y estilo de vida" icono="objetivoBajar" paso={2} onEditar={onEditar} filas={[
          ['Objetivo principal', etiquetaDe(opcionesObjetivo, objetivos.objetivoPrincipal)],
          ['Comidas al día', etiquetaDe(opcionesComidas, objetivos.comidasDia)],
          ['Horas de sueño', etiquetaDe(opcionesSueno, objetivos.horasSueno)],
        ]} />
        <TarjetaResumen titulo="Información de salud" icono="corazon" paso={3} onEditar={onEditar} filas={[
          ['Condiciones médicas', listado(catalogoSalud.condicionesMedicas, salud?.condicionesMedicas ?? [])],
          ['Medicamentos', salud?.tomaMedicamentos ? listado(catalogoSalud.medicamentos, salud.medicamentos) : 'No toma medicamentos'],
          ['Alergias', listado(catalogoSalud.alergias, salud?.alergias ?? [])],
        ]} pie={<p className="nota-privacidad nota-privacidad--compacta"><Icono nombre="candadoCerrado" tamano={16} /> Solo tú puedes ver esta información.</p>} />
      </div>
    </section>
  );
}
