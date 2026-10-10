import { useEffect, useState } from 'react';
import { solicitar } from '../../services/api.js';
import { descargarDocumento } from '../../services/documentos.js';
import Icono from '../Icono.jsx';
import './Certificaciones.css';
const TIPOS_DOCUMENTO = [
  { tipo: 'identidad', nombre: 'Documento de identidad', obligatorio: true },
  { tipo: 'titulo', nombre: 'Título profesional', obligatorio: true },
  { tipo: 'antecedentes', nombre: 'Certificado de antecedentes', obligatorio: false },
];
function formatearRut(valor) {
  const limpio = valor.replace(/[.\s-]/g, '').toUpperCase();
  return limpio.length > 1 ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : limpio;
}
export function Documentos({ documentos, onError }) {
  function lista(versiones) {
    return <ul>{versiones.map((d) => <li key={d.id}><button type="button" onClick={() => descargarDocumento(d).catch((e) => onError(e.message))}>{d.tipo}: {d.nombre}</button></li>)}</ul>;
  }
  return <div className="documentos-versiones">{TIPOS_DOCUMENTO.map(({ tipo }) => {
    const versiones = documentos.filter((d) => d.tipo === tipo).sort((a, b) => (Date.parse(b.fechaCreacion) || 0) - (Date.parse(a.fechaCreacion) || 0) || b.id - a.id);
    if (!versiones.length) return null;
    return <div key={tipo}>{lista(versiones.slice(0, 1))}</div>;
  })}</div>;
}
export default function Certificaciones() {
  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detalles, setDetalles] = useState({});
  const [aviso, setAviso] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [archivos, setArchivos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let vigente = true;
    solicitar('/verificaciones/mi-solicitud').then(({ solicitud: datos }) => {
      if (vigente) { setSolicitud(datos); setRut((valor) => valor || datos?.rut || ''); setTelefono((valor) => valor || datos?.telefono || ''); setCargando(false); }
    }).catch((e) => { if (vigente) { setError(e.message); setCargando(false); } });
    return () => { vigente = false; };
  }, [revision]);
  async function enviar(e, tipo) {
    const formulario = e.currentTarget;
    e.preventDefault(); setError(''); setDetalles({}); setAviso(''); setGuardando(true);
    try {
      if (tipo) {
        const archivo = archivos[tipo];
        if (!archivo || archivo.size > 5 * 1024 * 1024) throw new Error('Selecciona un PDF, JPG o PNG de hasta 5 MB');
        await solicitar(`/verificaciones/documentos?${new URLSearchParams({ tipo, nombre: archivo.name })}`, { metodo: 'POST', archivo });
        setArchivos((anteriores) => ({ ...anteriores, [tipo]: null })); formulario.reset(); setAviso('Documento adjuntado.');
      } else {
        const rutFormateado = formatearRut(rut);
        setRut(rutFormateado);
        await solicitar('/verificaciones/mi-solicitud', { metodo: 'POST', cuerpo: { rut: rutFormateado, telefono } });
        setAviso('Solicitud enviada para revisión.');
      }
      setRevision((r) => r + 1);
    } catch (e) { setError(e.message); setDetalles(e.detalles || {}); }
    finally { setGuardando(false); }
  }
  if (cargando) return <p role="status">Cargando certificaciones…</p>;
  return <section className="certificaciones"><div className="certificaciones__encabezado"><span className="certificaciones__icono"><Icono nombre="escudo" tamano={24} /></span><div><h3>Verificación profesional</h3><p>Completa tus documentos y envía tu solicitud a revisión.</p></div></div>
    {error && <div role="alert"><p>{error}</p>{Object.keys(detalles).length > 0 && <ul>{Object.entries(detalles).map(([campo, mensaje]) => <li key={campo}>{mensaje}</li>)}</ul>}</div>}{aviso && <p role="status">{aviso}</p>}
    {solicitud && <><div className="certificaciones__resumen"><p>Estado: <strong>{solicitud.estado}</strong></p>{solicitud.motivo && <p>Motivo: {solicitud.motivo}</p>}</div>
      {solicitud.estado === 'rechazado' && <p className="certificaciones__correccion">Tu solicitud fue rechazada o tu verificación fue revocada. Adjunta nuevamente el documento de identidad y el título profesional, corrige lo indicado en el motivo y envía una nueva solicitud.</p>}
      <p className="certificaciones__privacidad"><Icono nombre="candado" tamano={18} /> Los documentos son privados: solo tú y el administrador pueden descargarlos.</p>
      <div className="certificaciones__documentos">{TIPOS_DOCUMENTO.map(({ tipo, nombre, obligatorio }, indice) => {
        const adjuntados = solicitud.documentos.filter((documento) => documento.tipo === tipo);
        return <section className="certificaciones__documento" key={tipo} aria-labelledby={`titulo-documento-${tipo}`}>
          <div className="certificaciones__titulo-documento"><h4 id={`titulo-documento-${tipo}`}><span className="certificaciones__numero" aria-hidden="true">{indice + 1}</span>{nombre}</h4><span>{obligatorio ? 'Obligatorio' : 'Opcional'}</span></div>
          <p className={`certificaciones__indicador${adjuntados.length ? ' certificaciones__indicador--adjuntado' : ''}`}><Icono nombre={adjuntados.length ? 'check' : 'info'} tamano={16} />{adjuntados.length ? 'Adjuntado' : 'Sin adjuntar'}</p>
          <Documentos documentos={adjuntados} onError={setError} />
          {solicitud.estado !== 'verificado' && <form onSubmit={(e) => enviar(e, tipo)}>
            <label htmlFor={`archivo-${tipo}`}>Archivo PDF, JPG o PNG (máximo 5 MB)</label><input id={`archivo-${tipo}`} aria-label={`Seleccionar archivo: ${nombre}`} type="file" accept=".pdf,.jpg,.jpeg,.png" required disabled={guardando} onChange={(e) => setArchivos((anteriores) => ({ ...anteriores, [tipo]: e.target.files[0] }))} />
            {archivos[tipo] && <p className="certificaciones__ayuda">Archivo seleccionado. Pulsa «{adjuntados.length ? 'Reemplazar documento' : 'Adjuntar documento'}» para subirlo.</p>}
            <button disabled={guardando || !archivos[tipo]} aria-label={`${adjuntados.length ? 'Reemplazar documento' : 'Adjuntar documento'}: ${nombre}`}>{adjuntados.length ? 'Reemplazar documento' : 'Adjuntar documento'}</button>
          </form>}
        </section>;
      })}</div>
      {solicitud.estado !== 'verificado' && <>
        <form className="certificaciones__solicitud" onSubmit={(e) => enviar(e)}><h4>Datos para la solicitud</h4><label>RUT<input required value={rut} maxLength={12} placeholder="12345678-5" aria-invalid={Boolean(detalles.rut)} aria-describedby="ayuda-rut-verificacion" onChange={(e) => setRut(e.target.value)} onBlur={() => setRut(formatearRut(rut))} /></label><p id="ayuda-rut-verificacion">Puedes escribir tu RUT sin puntos ni guion; agregaremos el guion antes del dígito verificador.</p><label>Teléfono (opcional)<input value={telefono} maxLength={20} aria-invalid={Boolean(detalles.telefono)} onChange={(e) => setTelefono(e.target.value)} /></label>
          <p>Adjunta el documento de identidad y el título profesional antes de enviar. Si tu solicitud fue rechazada, corrige lo indicado en el motivo.</p><button className="certificaciones__enviar" disabled={guardando}>Enviar solicitud a revisión<Icono nombre="flecha" tamano={18} /></button></form>
      </>}
      <h3>Historial</h3><ul>{solicitud.historial.map((h, i) => <li key={i}>{new Date(h.fecha).toLocaleString('es-CL')}: {h.accion}{h.motivo && ` — ${h.motivo}`}</li>)}</ul>
    </>}
  </section>;
}
