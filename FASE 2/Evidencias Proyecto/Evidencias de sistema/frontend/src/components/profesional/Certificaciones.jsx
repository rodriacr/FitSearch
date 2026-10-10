import { useEffect, useState } from 'react';
import { solicitar } from '../../services/api.js';
import { descargarDocumento } from '../../services/documentos.js';
import './Certificaciones.css';
export function Documentos({ documentos, onError }) {
  return <ul>{documentos.map((d) => <li key={d.id}><button type="button" onClick={() => descargarDocumento(d).catch((e) => onError(e.message))}>{d.tipo}: {d.nombre}</button></li>)}</ul>;
}
export default function Certificaciones() {
  const [solicitud, setSolicitud] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [detalles, setDetalles] = useState({});
  const [aviso, setAviso] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipo, setTipo] = useState('identidad');
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let vigente = true;
    solicitar('/verificaciones/mi-solicitud').then(({ solicitud: datos }) => {
      if (vigente) { setSolicitud(datos); setRut((valor) => valor || datos?.rut || ''); setTelefono((valor) => valor || datos?.telefono || ''); setCargando(false); }
    }).catch((e) => { if (vigente) { setError(e.message); setCargando(false); } });
    return () => { vigente = false; };
  }, [revision]);
  async function enviar(e, documento) {
    e.preventDefault(); setError(''); setDetalles({}); setAviso(''); setGuardando(true);
    try {
      if (documento) {
        if (!archivo || archivo.size > 5 * 1024 * 1024) throw new Error('Selecciona un PDF, JPG o PNG de hasta 5 MB');
        await solicitar(`/verificaciones/documentos?${new URLSearchParams({ tipo, nombre: archivo.name })}`, { metodo: 'POST', archivo });
        setArchivo(null); e.target.reset(); setAviso('Documento adjuntado.');
      } else {
        await solicitar('/verificaciones/mi-solicitud', { metodo: 'POST', cuerpo: { rut, telefono } });
        setAviso('Solicitud enviada para revisión.');
      }
      setRevision((r) => r + 1);
    } catch (e) { setError(e.message); setDetalles(e.detalles || {}); }
    finally { setGuardando(false); }
  }
  if (cargando) return <p role="status">Cargando certificaciones…</p>;
  return <section className="certificaciones"><h3>Verificación profesional</h3>
    {error && <div role="alert"><p>{error}</p>{Object.keys(detalles).length > 0 && <ul>{Object.entries(detalles).map(([campo, mensaje]) => <li key={campo}>{mensaje}</li>)}</ul>}</div>}{aviso && <p role="status">{aviso}</p>}
    {solicitud && <><p>Estado: {solicitud.estado}</p>{solicitud.motivo && <p>Motivo: {solicitud.motivo}</p>}
      <p>Los documentos son privados: solo tú y el administrador pueden descargarlos.</p>
      <h4>Documentos adjuntados</h4>
      {solicitud.documentos.length === 0 && <p>Todavía no has adjuntado documentos.</p>}
      <Documentos documentos={solicitud.documentos} onError={setError} />
      {solicitud.estado !== 'verificado' && <>
        <form onSubmit={(e) => enviar(e, true)}><label>Tipo de documento<select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="identidad">Documento de identidad</option><option value="titulo">Título profesional</option><option value="antecedentes">Certificado de antecedentes (opcional)</option></select></label>
          <label>Archivo PDF, JPG o PNG (máximo 5 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={(e) => setArchivo(e.target.files[0])} /></label>{archivo && <p>Archivo seleccionado. Pulsa «Adjuntar documento» para subirlo; después aparecerá en la lista de documentos adjuntados.</p>}<button disabled={guardando}>Adjuntar documento</button></form>
        <form onSubmit={(e) => enviar(e, false)}><label>RUT<input required value={rut} maxLength={12} placeholder="12345678-5" aria-invalid={Boolean(detalles.rut)} aria-describedby="ayuda-rut-verificacion" onChange={(e) => setRut(e.target.value)} /></label><p id="ayuda-rut-verificacion">Ingresa el RUT con guion y dígito verificador, por ejemplo: 12345678-5.</p><label>Teléfono (opcional)<input value={telefono} maxLength={20} aria-invalid={Boolean(detalles.telefono)} onChange={(e) => setTelefono(e.target.value)} /></label>
          <p>Adjunta tu documento de identidad y título antes de enviar la solicitud. Si fue rechazada, corrige lo solicitado y vuelve a enviarla.</p><button disabled={guardando}>Enviar solicitud a revisión</button></form>
      </>}
      <h3>Historial</h3><ul>{solicitud.historial.map((h, i) => <li key={i}>{new Date(h.fecha).toLocaleString('es-CL')}: {h.accion}{h.motivo && ` — ${h.motivo}`}</li>)}</ul>
    </>}
  </section>;
}
