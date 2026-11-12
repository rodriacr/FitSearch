import { useEffect, useState } from 'react';
import reglas from '@shared/reglas.json';
import Icono from '../../components/Icono.jsx';
import { solicitar } from '../../services/api.js';

const { especialidad: REGLA_ESPECIALIDAD } = reglas.profesionales;
const { alimento: REGLA_ALIMENTO, establecimiento: REGLA_ESTABLECIMIENTO } = reglas.contenido;
const etiquetaCategoria = (valor) => REGLA_ESTABLECIMIENTO.categorias.find((categoria) => categoria.valor === valor)?.etiqueta ?? valor;
const numero = (valor) => Number(valor).toLocaleString('es-CL');
// Los decimales se escriben con coma o punto; la API recibe punto. Un campo vacío se envía vacío para que la API lo pida.
const leerNumero = (texto) => (String(texto).trim() === '' ? '' : Number(String(texto).trim().replace(',', '.')));
const conComa = (valor) => (valor === null || valor === undefined ? '' : String(valor).replace('.', ','));

// Cada catálogo: textos, campos del formulario, cómo se resume en la lista y cómo se cuenta su uso.
const CATALOGOS = {
  especialidades: {
    nombre: 'Especialidades', singular: 'especialidad', femenino: true,
    explicacion: 'Las que eligen los profesionales en su ficha, las del buscador de la portada y las que recomienda el asistente.',
    campos: [{ clave: 'nombre', etiqueta: 'Nombre', max: REGLA_ESPECIALIDAD.max }],
    resumen: () => null,
    uso: (n) => (n === 1 ? 'La usa la ficha de 1 profesional' : `La usan las fichas de ${n} profesionales`),
    desactivar: 'Puedes desactivarla para que no aparezca en fichas nuevas.',
  },
  alimentos: {
    nombre: 'Alimentos', singular: 'alimento', femenino: false,
    explicacion: 'El catálogo de Comidas: los valores van por cada 100 g y se usan al registrar comidas y desde el asistente.',
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre', max: REGLA_ALIMENTO.nombre.max },
      { clave: 'sinonimos', etiqueta: 'Sinónimos (separados por coma, opcional)', max: REGLA_ALIMENTO.sinonimos.max },
      { clave: 'calorias', etiqueta: 'Calorías (kcal por 100 g)', numerico: true },
      { clave: 'proteinasG', etiqueta: 'Proteínas (g por 100 g)', numerico: true },
      { clave: 'carbohidratosG', etiqueta: 'Carbohidratos (g por 100 g)', numerico: true },
      { clave: 'grasasG', etiqueta: 'Grasas (g por 100 g)', numerico: true },
    ],
    resumen: (fila) => `${numero(fila.calorias)} kcal · ${numero(fila.proteinasG)} g de proteínas · ${numero(fila.carbohidratosG)} g de carbohidratos · ${numero(fila.grasasG)} g de grasas, por 100 g`,
    uso: (n) => (n === 1 ? 'Aparece en 1 registro de comidas' : `Aparece en ${n} registros de comidas`),
    desactivar: 'Puedes desactivarlo para que no aparezca al registrar comidas.',
  },
  establecimientos: {
    nombre: 'Establecimientos', singular: 'establecimiento', femenino: false,
    explicacion: 'Los centros de salud y gimnasios del directorio, con su comuna, su dirección y su ubicación en el mapa.',
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre', max: REGLA_ESTABLECIMIENTO.nombre.max },
      { clave: 'categoria', etiqueta: 'Categoría', opciones: REGLA_ESTABLECIMIENTO.categorias },
      { clave: 'comuna', etiqueta: 'Comuna', max: REGLA_ESTABLECIMIENTO.comuna.max },
      { clave: 'direccion', etiqueta: 'Dirección', max: REGLA_ESTABLECIMIENTO.direccion.max },
      // Opcional: el usuario de Instagram (sin «@»); también se acepta el enlace del perfil (11-11-2026).
      { clave: 'instagram', etiqueta: 'Instagram (opcional)', max: 100 },
      { clave: 'ubicacionLat', etiqueta: 'Latitud', numerico: true },
      { clave: 'ubicacionLng', etiqueta: 'Longitud', numerico: true },
    ],
    resumen: (fila) => `${etiquetaCategoria(fila.categoria)} · ${fila.comuna || 'Sin comuna'} · ${fila.direccion}${fila.instagram ? ` · @${fila.instagram}` : ''}`,
    uso: (n) => (n === 1 ? 'Tiene 1 profesional asociado' : `Tiene ${n} profesionales asociados`),
    desactivar: 'Puedes desactivarlo para que no aparezca en el directorio.',
  },
};
const estadoDe = (catalogo, activo) => (CATALOGOS[catalogo].femenino ? (activo ? 'Activa' : 'Inactiva') : (activo ? 'Activo' : 'Inactivo'));

// Datos del formulario a partir de un elemento (o vacíos para uno nuevo): los números se muestran con coma.
function datosDe(catalogo, fila) {
  return Object.fromEntries(CATALOGOS[catalogo].campos.map(({ clave, numerico, opciones }) => {
    if (!fila) return [clave, opciones ? opciones[0].valor : ''];
    return [clave, numerico ? conComa(fila[clave]) : (fila[clave] ?? '')];
  }));
}

function useListado(ruta, revision) {
  const [resultado, setResultado] = useState({ ruta: null, datos: null, error: '' });
  useEffect(() => {
    let vigente = true;
    solicitar(ruta)
      .then((datos) => vigente && setResultado({ ruta, datos, error: '' }))
      .catch((error) => vigente && setResultado({ ruta, datos: null, error: error.message }));
    return () => { vigente = false; };
  }, [ruta, revision]);
  return resultado.ruta === ruta ? resultado : { datos: null, error: '' };
}

// Formulario para agregar o editar un elemento. Los errores de la API caen en su campo (mismos nombres que la API).
function FormularioElemento({ catalogo, elemento, alGuardar, alCancelar }) {
  const config = CATALOGOS[catalogo];
  const [datos, setDatos] = useState(() => datosDe(catalogo, elemento));
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [ubicacion, setUbicacion] = useState({ buscando: false, mensaje: '' });
  const titulo = `${elemento ? 'Editar' : 'Agregar'} ${config.singular}`;
  const cambiar = (clave) => (e) => setDatos((actuales) => ({ ...actuales, [clave]: e.target.value }));

  async function buscarUbicacion() {
    setUbicacion({ buscando: true, mensaje: '' });
    try {
      const parametros = new URLSearchParams({ comuna: datos.comuna.trim(), direccion: datos.direccion.trim() });
      const lugar = await solicitar(`/administrador/contenido/establecimientos/ubicacion?${parametros}`);
      setDatos((actuales) => ({ ...actuales, ubicacionLat: conComa(lugar.lat), ubicacionLng: conComa(lugar.lng) }));
      setErrores((actuales) => ({ ...actuales, comuna: undefined, ubicacionLat: undefined, ubicacionLng: undefined }));
      setUbicacion({
        buscando: false,
        mensaje: lugar.precision === 'exacta' ? `Encontramos ${lugar.encontrada}.`
          : `Encontramos ${lugar.encontrada}, pero no la dirección exacta: revisa la latitud y la longitud.`,
      });
    } catch (e) {
      setErrores((actuales) => ({ ...actuales, ...e.detalles }));
      setUbicacion({ buscando: false, mensaje: e.message });
    }
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError('');
    setErrores({});
    const cuerpo = Object.fromEntries(config.campos.map(({ clave, numerico }) => [clave, numerico ? leerNumero(datos[clave]) : datos[clave]]));
    try {
      const { elemento: guardado } = await solicitar(`/administrador/contenido/${catalogo}${elemento ? `/${elemento.id}` : ''}`, {
        metodo: elemento ? 'PUT' : 'POST', cuerpo,
      });
      alGuardar(guardado, Boolean(elemento));
    } catch (e) {
      setErrores(e.detalles ?? {});
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <form className="admin__tarjeta admin__formulario" onSubmit={guardar} noValidate aria-labelledby="titulo-formulario-contenido">
      <h2 id="titulo-formulario-contenido">{titulo}</h2>
      {error && <p role="alert" className="admin__error">{error}</p>}
      <div className="admin__campos">
        {config.campos.map(({ clave, etiqueta, max, numerico, opciones }) => {
          // El error va fuera de la etiqueta: así el campo se sigue llamando solo por su nombre.
          const control = {
            id: `contenido-${clave}`, value: datos[clave], onChange: cambiar(clave), 'aria-invalid': Boolean(errores[clave]),
            'aria-describedby': errores[clave] ? `error-${clave}` : undefined,
          };
          return (
            <div key={clave} className={errores[clave] ? 'admin__campo admin__campo--error' : 'admin__campo'}>
              <label htmlFor={control.id}>{etiqueta}</label>
              {opciones ? (
                <select {...control}>
                  {opciones.map(({ valor, etiqueta: nombre }) => <option key={valor} value={valor}>{nombre}</option>)}
                </select>
              ) : (
                <input {...control} maxLength={max} inputMode={numerico ? 'decimal' : undefined} />
              )}
              {errores[clave] && <small id={`error-${clave}`}>{errores[clave]}</small>}
            </div>
          );
        })}
      </div>
      {catalogo === 'establecimientos' && (
        <div className="admin__ubicacion">
          <button type="button" onClick={buscarUbicacion} disabled={ubicacion.buscando || !datos.comuna.trim()}>
            <Icono nombre="pin" /> {ubicacion.buscando ? 'Buscando…' : 'Buscar la ubicación con la dirección'}
          </button>
          {ubicacion.mensaje && <p role="status">{ubicacion.mensaje}</p>}
        </div>
      )}
      <div className="admin__acciones-formulario">
        <button type="submit" className="admin__boton" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" onClick={alCancelar} disabled={guardando}>Cancelar</button>
      </div>
    </form>
  );
}

// Contenido del administrador (FS-HU-30): agregar, editar, desactivar y eliminar especialidades, alimentos y
// establecimientos. Lo que está en uso no se elimina: se ofrece desactivarlo, sin perder el historial.
export default function ContenidoAdministrador() {
  const [catalogo, setCatalogo] = useState('especialidades');
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [revision, setRevision] = useState(0);
  const [formulario, setFormulario] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const config = CATALOGOS[catalogo];
  const parametros = new URLSearchParams({ q, estado, pagina: String(pagina) });
  const { datos, error: errorCarga } = useListado(`/administrador/contenido/${catalogo}?${parametros}`, revision);

  const reiniciarMensajes = () => { setAviso(''); setError(''); };
  function elegirCatalogo(valor) {
    setCatalogo(valor);
    setPagina(1);
    setQ('');
    setBusqueda('');
    setFormulario(null);
    setConfirmacion(null);
    reiniciarMensajes();
  }
  function alGuardar(guardado, editado) {
    setFormulario(null);
    setAviso(`«${guardado.nombre}» quedó ${editado ? 'actualizad' : 'agregad'}${config.femenino ? 'a' : 'o'}.`);
    setRevision((valor) => valor + 1);
  }
  async function cambiarEstado(fila) {
    reiniciarMensajes();
    setGuardando(true);
    try {
      const { elemento } = await solicitar(`/administrador/contenido/${catalogo}/${fila.id}/estado`, { metodo: 'PATCH', cuerpo: { activo: !fila.activo } });
      setConfirmacion(null);
      setAviso(`«${elemento.nombre}» quedó ${estadoDe(catalogo, elemento.activo).toLowerCase()}.`);
      setRevision((valor) => valor + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }
  async function eliminar(fila) {
    reiniciarMensajes();
    setGuardando(true);
    try {
      await solicitar(`/administrador/contenido/${catalogo}/${fila.id}`, { metodo: 'DELETE' });
      setConfirmacion(null);
      setAviso(`«${fila.nombre}» se eliminó.`);
      setRevision((valor) => valor + 1);
    } catch (e) {
      // Si alguien empezó a usarlo mientras tanto, la API responde 409: se ofrece desactivarlo.
      if (e.estado === 409) setConfirmacion({ fila: { ...fila, enUso: e.detalles?.enUso ?? 1 }, motivo: e.message });
      else setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <h1>Contenido</h1>
      <p>Administra los catálogos de FitSearch sin cambiar el código.</p>
      <div className="admin__filtros" role="group" aria-label="Catálogo">
        {Object.entries(CATALOGOS).map(([valor, { nombre }]) => (
          <button type="button" key={valor} aria-pressed={catalogo === valor} onClick={() => elegirCatalogo(valor)}>{nombre}</button>
        ))}
      </div>
      <p className="admin__nota">{config.explicacion}</p>

      {aviso && <p role="status" className="admin__exito">{aviso}</p>}
      {error && <p role="alert" className="admin__error">{error}</p>}

      {confirmacion && (
        <div className="admin__tarjeta" role="group" aria-labelledby="titulo-confirmacion">
          {confirmacion.fila.enUso > 0 ? (
            <>
              <h2 id="titulo-confirmacion">No se puede eliminar «{confirmacion.fila.nombre}»</h2>
              <p>
                {confirmacion.motivo ?? `${config.uso(confirmacion.fila.enUso)}. Si ${config.femenino ? 'la' : 'lo'} eliminas se perdería ese historial.`}{' '}
                {confirmacion.fila.activo && !confirmacion.motivo && config.desactivar}
              </p>
              <div className="admin__acciones-formulario">
                {confirmacion.fila.activo && (
                  <button type="button" className="admin__boton" disabled={guardando} onClick={() => cambiarEstado(confirmacion.fila)}>
                    Desactivar {config.singular}
                  </button>
                )}
                <button type="button" disabled={guardando} onClick={() => setConfirmacion(null)}>Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <h2 id="titulo-confirmacion">¿Eliminar «{confirmacion.fila.nombre}»?</h2>
              <p>Nadie {config.femenino ? 'la' : 'lo'} usa todavía. Esta acción no se puede deshacer.</p>
              <div className="admin__acciones-formulario">
                <button type="button" className="admin__boton" disabled={guardando} onClick={() => eliminar(confirmacion.fila)}>Confirmar eliminación</button>
                <button type="button" disabled={guardando} onClick={() => setConfirmacion(null)}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {formulario ? (
        <FormularioElemento key={`${catalogo}-${formulario.elemento?.id ?? 'nuevo'}`} catalogo={catalogo} elemento={formulario.elemento}
          alGuardar={alGuardar} alCancelar={() => setFormulario(null)} />
      ) : (
        <button type="button" className="admin__boton admin__agregar" onClick={() => { reiniciarMensajes(); setConfirmacion(null); setFormulario({ elemento: null }); }}>
          <Icono nombre="mas" /> Agregar {config.singular}
        </button>
      )}

      <div className="admin__filtros" role="group" aria-label="Estado">
        {[['', 'Todos'], ['activos', config.femenino ? 'Activas' : 'Activos'], ['inactivos', config.femenino ? 'Inactivas' : 'Inactivos']].map(([valor, nombre]) => (
          <button type="button" key={valor} aria-pressed={estado === valor} onClick={() => { setEstado(valor); setPagina(1); }}>{nombre}</button>
        ))}
      </div>
      <form className="admin__busqueda" role="search" onSubmit={(e) => { e.preventDefault(); setQ(busqueda.trim()); setPagina(1); }}>
        <label htmlFor="busqueda-contenido">Buscar {config.nombre.toLowerCase()}</label>
        <div>
          <input id="busqueda-contenido" value={busqueda} maxLength={reglas.contenido.busqueda.max} onChange={(e) => setBusqueda(e.target.value)} />
          <button type="submit"><Icono nombre="buscar" /> Buscar</button>
        </div>
      </form>

      {errorCarga && <p role="alert" className="admin__error">{errorCarga}</p>}
      {!datos && !errorCarga && <p role="status">Cargando información…</p>}
      {datos && (
        <>
          <p role="status">{numero(datos.total)} {datos.total === 1 ? 'resultado' : 'resultados'}</p>
          {!datos.resultados.length && <p className="admin__tarjeta">No hay {config.nombre.toLowerCase()} para estos filtros.</p>}
          <ul className="admin__lista" aria-label={config.nombre}>
            {datos.resultados.map((fila) => (
              <li key={fila.id} className="admin__tarjeta admin__fila">
                <div>
                  <h2>{fila.nombre}</h2>
                  {config.resumen(fila) && <p>{config.resumen(fila)}</p>}
                  <small>{fila.enUso > 0 ? config.uso(fila.enUso) : 'Sin uso todavía'}</small>
                </div>
                <span className={`admin__estado${fila.activo ? ' admin__estado--verificado' : ''}`}>{estadoDe(catalogo, fila.activo)}</span>
                <div className="admin__acciones-fila">
                  <button type="button" aria-label={`Editar ${fila.nombre}`} onClick={() => { reiniciarMensajes(); setConfirmacion(null); setFormulario({ elemento: fila }); }}>
                    <Icono nombre="lapiz" /> Editar
                  </button>
                  <button type="button" aria-label={`${fila.activo ? 'Desactivar' : 'Reactivar'} ${fila.nombre}`} disabled={guardando} onClick={() => cambiarEstado(fila)}>
                    {fila.activo ? 'Desactivar' : 'Reactivar'}
                  </button>
                  <button type="button" aria-label={`Eliminar ${fila.nombre}`} onClick={() => { reiniciarMensajes(); setFormulario(null); setConfirmacion({ fila }); }}>
                    <Icono nombre="basura" /> Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {datos.totalPaginas > 1 && (
            <nav className="admin__paginacion" aria-label="Páginas de resultados">
              <button type="button" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <span>Página {pagina} de {datos.totalPaginas}</span>
              <button type="button" disabled={pagina >= datos.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
