import { useEffect, useState } from 'react';
import reglas from '@shared/reglas.json';
import { useSesion } from '../../context/SesionContext.jsx';
import { formatearFecha, formatearNumero, textoResenas } from '../../services/formato.js';
import { eliminarResena, guardarResena, listarResenas } from '../../services/profesional.service.js';
import Alerta from '../Alerta.jsx';
import { Estrellas } from '../Calificacion.jsx';
import EstadoVacio from '../EstadoVacio.jsx';
import Icono from '../Icono.jsx';

const { comentario: limites } = reglas.resena;

function ResumenResenas({ resumen }) {
  const { promedio, total, distribucion } = resumen;
  return (
    <div className="resumen-resenas">
      <div className="resumen-resenas__promedio">
        <strong>{total ? formatearNumero(promedio) : '–'}</strong>
        <Estrellas valor={promedio || 0} />
        <span>{total ? textoResenas(total) : 'Sin reseñas aún'}</span>
      </div>
      <ul className="resumen-resenas__distribucion" aria-label="Reseñas por cantidad de estrellas">
        {[5, 4, 3, 2, 1].map((puntaje) => {
          const cantidad = distribucion[puntaje] || 0;
          const porcentaje = total ? Math.round((cantidad / total) * 100) : 0;
          return (
            <li key={puntaje}>
              <span>{puntaje} {puntaje === 1 ? 'estrella' : 'estrellas'}</span>
              <span className="resumen-resenas__barra" aria-hidden="true"><span style={{ width: `${porcentaje}%` }} /></span>
              <span>{cantidad}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Calificación obligatoria de 1 a 5 estrellas y comentario opcional de 10 a 500 caracteres (FS-HU-24).
function FormularioResena({ nombre, inicial, onGuardar, onCancelar }) {
  const [puntaje, setPuntaje] = useState(inicial?.puntaje || 0);
  const [comentario, setComentario] = useState(inicial?.comentario || '');
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento) => {
    evento.preventDefault();
    const texto = comentario.trim();
    const nuevos = {};
    if (!puntaje) nuevos.puntaje = 'Elige una calificación de 1 a 5 estrellas';
    if (texto && texto.length < limites.min) nuevos.comentario = `El comentario debe tener al menos ${limites.min} caracteres, o puedes dejarlo vacío`;
    setErrores(nuevos);
    setMensaje('');
    if (Object.keys(nuevos).length) return;
    setEnviando(true);
    try {
      await onGuardar({ puntaje, comentario: texto });
    } catch (error) {
      setErrores(error.detalles || {});
      setMensaje(error.message);
      setEnviando(false);
    }
  };

  return (
    <form className="formulario-resena" onSubmit={enviar} noValidate>
      <Alerta>{mensaje}</Alerta>
      <fieldset className="selector-estrellas" aria-describedby={errores.puntaje ? 'error-puntaje' : undefined}>
        <legend>Tu calificación para {nombre}</legend>
        <div className="selector-estrellas__opciones">
          {[1, 2, 3, 4, 5].map((numero) => (
            <label key={numero} className={`selector-estrellas__opcion${numero <= puntaje ? ' selector-estrellas__opcion--activa' : ''}`}>
              <input type="radio" name="puntaje" value={numero} checked={puntaje === numero} onChange={() => setPuntaje(numero)} />
              <Icono nombre="estrella" tamano={30} relleno={numero <= puntaje} />
              <span className="solo-lector">{numero} {numero === 1 ? 'estrella' : 'estrellas'}</span>
            </label>
          ))}
        </div>
        {errores.puntaje && <p id="error-puntaje" className="campo__mensaje" role="alert">{errores.puntaje}</p>}
      </fieldset>
      <div className={`campo${errores.comentario ? ' campo--error' : ''}`}>
        <label className="campo__etiqueta" htmlFor="comentario-resena">Comentario (opcional)</label>
        <textarea id="comentario-resena" className="campo__control campo__control--area" rows={4} maxLength={limites.max} value={comentario}
          onChange={(evento) => setComentario(evento.target.value)} aria-invalid={Boolean(errores.comentario)} aria-describedby="ayuda-comentario"
          placeholder="Cuéntale a otras personas cómo fue tu experiencia." />
        {errores.comentario && <p className="campo__mensaje" role="alert">{errores.comentario}</p>}
        <p id="ayuda-comentario" className="campo__ayuda">{comentario.length}/{limites.max} caracteres · mínimo {limites.min} si escribes un comentario.</p>
      </div>
      <div className="formulario-resena__acciones">
        {onCancelar && <button type="button" className="boton-texto" onClick={onCancelar}>Cancelar</button>}
        <button type="submit" className="boton boton--principal boton--compacto" disabled={enviando}>
          {enviando ? 'Guardando…' : inicial ? 'Actualizar reseña' : 'Publicar reseña'}
        </button>
      </div>
    </form>
  );
}

// Resumen, reseña propia (crear, editar o eliminar) y reseñas de otras personas, paginadas.
export default function Resenas({ profesionalId, nombre, resumen, miResena, puedeResenar, onCambio }) {
  const { sesion } = useSesion();
  const [pagina, setPagina] = useState(1);
  const [version, setVersion] = useState(0);
  const [lista, setLista] = useState(null);
  const [editando, setEditando] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const clave = `${profesionalId}-${pagina}-${version}`;
  const cargando = lista?.clave !== clave;

  useEffect(() => {
    let activo = true;
    listarResenas(profesionalId, pagina)
      .then((datos) => activo && setLista({ clave, ...datos }))
      .catch((fallo) => activo && setLista({ clave, error: fallo.message }));
    return () => { activo = false; };
  }, [clave, profesionalId, pagina]);

  const recargar = () => { setPagina(1); setVersion((valor) => valor + 1); };
  const guardar = async (datos) => {
    const { resena, resumenResenas } = await guardarResena(profesionalId, datos);
    onCambio(resumenResenas, resena);
    setMensaje(miResena ? 'Tu reseña fue actualizada.' : '¡Gracias! Tu reseña fue publicada.');
    setEditando(false);
    recargar();
  };
  const eliminar = async () => {
    setError('');
    try {
      const { resumenResenas } = await eliminarResena(profesionalId);
      onCambio(resumenResenas, null);
      setMensaje('Tu reseña fue eliminada.');
      setConfirmandoBorrado(false);
      recargar();
    } catch (fallo) {
      setError(fallo.message);
    }
  };

  let aviso = null;
  if (!puedeResenar) {
    aviso = sesion?.usuario.rol === 'usuario'
      ? 'Esta es tu propia ficha profesional: no puedes calificarte.'
      : 'Solo las cuentas de usuario pueden calificar a profesionales.';
  }

  return (
    <section className="ficha__seccion resenas" aria-labelledby="titulo-resenas">
      <h2 id="titulo-resenas">Calificaciones y reseñas</h2>
      <ResumenResenas resumen={resumen} />
      <Alerta tipo="exito">{mensaje}</Alerta>
      <Alerta>{error}</Alerta>
      {aviso && <p className="resenas__aviso"><Icono nombre="info" tamano={18} /> {aviso}</p>}

      {puedeResenar && (!miResena || editando) && (
        <>
          <h3>{miResena ? 'Edita tu reseña' : `Califica a ${nombre}`}</h3>
          <FormularioResena key={miResena?.id || 'nueva'} nombre={nombre} inicial={miResena} onGuardar={guardar}
            onCancelar={miResena ? () => setEditando(false) : undefined} />
        </>
      )}
      {puedeResenar && miResena && !editando && (
        <div className="resena resena--propia">
          <p className="resena__etiqueta">Tu reseña</p>
          <Estrellas valor={miResena.puntaje} />
          {miResena.comentario && <p className="resena__comentario">{miResena.comentario}</p>}
          {confirmandoBorrado ? (
            <div className="resena__acciones" role="group" aria-label="Confirmar eliminación">
              <span>¿Eliminar tu reseña?</span>
              <button type="button" className="boton boton--secundario boton--compacto" onClick={eliminar}>Sí, eliminar</button>
              <button type="button" className="boton-texto" onClick={() => setConfirmandoBorrado(false)}>Cancelar</button>
            </div>
          ) : (
            <div className="resena__acciones">
              <button type="button" className="boton-texto" onClick={() => { setMensaje(''); setEditando(true); }}><Icono nombre="lapiz" tamano={16} /> Editar</button>
              <button type="button" className="boton-texto" onClick={() => { setMensaje(''); setConfirmandoBorrado(true); }}>Eliminar</button>
            </div>
          )}
        </div>
      )}

      <h3>Lo que dicen otras personas</h3>
      {cargando ? <p className="texto-secundario" role="status">Cargando reseñas…</p> : lista.error ? <Alerta>{lista.error}</Alerta> : !lista.resenas.length ? (
        <EstadoVacio compacto icono="estrella" titulo="Este profesional aún no tiene reseñas">
          {puedeResenar && !miResena ? '¡Sé la primera persona en dejar una reseña!' : null}
        </EstadoVacio>
      ) : (
        <>
          <ol className="lista-resenas">
            {lista.resenas.map((resena) => (
              <li key={resena.id} className="resena">
                <div className="resena__cabecera">
                  <span className="avatar avatar--pequeno" aria-hidden="true">{resena.autor[0].toUpperCase()}</span>
                  <p>
                    <strong>{resena.autor}</strong>
                    {resena.propia && <span className="etiqueta-rol">Tu reseña</span>}
                    <time dateTime={resena.fecha}>{formatearFecha(resena.fecha)}</time>
                  </p>
                </div>
                <Estrellas valor={resena.puntaje} tamano={16} />
                {resena.comentario && <p className="resena__comentario">{resena.comentario}</p>}
              </li>
            ))}
          </ol>
          {lista.totalPaginas > 1 && (
            <nav className="paginacion" aria-label="Páginas de reseñas">
              <button type="button" className="boton boton--secundario boton--compacto" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <span>Página {pagina} de {lista.totalPaginas}</span>
              <button type="button" className="boton boton--secundario boton--compacto" disabled={pagina >= lista.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
