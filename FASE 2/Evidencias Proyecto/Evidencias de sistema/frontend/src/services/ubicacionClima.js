// Ubicación reciente y aproximada para el clima. No reutiliza el lugar de atención ni la ubicación del buscador.
let enCurso = null;
export function ubicarParaClima() {
  if (enCurso) return enCurso;
  if (!navigator.geolocation) return Promise.reject(Object.assign(new Error('Tu navegador no permite obtener la ubicación.'), { motivo: 'no-disponible' }));
  enCurso = new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ lat: Math.round(coords.latitude * 100) / 100, lng: Math.round(coords.longitude * 100) / 100 }),
    (error) => reject(Object.assign(new Error(error.code === 1
      ? 'Permite la ubicación en tu navegador para ver el clima donde estás.'
      : 'No pudimos obtener tu ubicación actual. Intenta nuevamente.'), { motivo: error.code === 1 ? 'denegada' : 'no-disponible' })),
    { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 },
  )).finally(() => { enCurso = null; });
  return enCurso;
}
