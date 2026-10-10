import { solicitar } from './api.js';

export async function descargarDocumento(documento) {
  const blob = await solicitar(`/verificaciones/documentos/${documento.id}`, { descargar: true });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url; enlace.download = documento.nombre; enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
