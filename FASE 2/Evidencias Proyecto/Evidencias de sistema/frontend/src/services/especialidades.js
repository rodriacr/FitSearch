import { useEffect, useState } from 'react';
import { solicitar } from './api.js';

// Catálogo de especialidades activas (FS-HU-30): lo administra el administrador. Es público, porque también lo usa la
// portada sin sesión.
export const obtenerEspecialidades = () => solicitar('/especialidades', { conSesion: false });

// Especialidades activas; mientras cargan o si la consulta falla, una lista vacía.
export function useEspecialidades() {
  const [especialidades, setEspecialidades] = useState([]);
  useEffect(() => {
    let vigente = true;
    obtenerEspecialidades()
      .then((datos) => vigente && setEspecialidades(datos.especialidades ?? []))
      .catch(() => {});
    return () => { vigente = false; };
  }, []);
  return especialidades;
}
