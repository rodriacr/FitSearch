import { useState } from 'react';
import { agregarFavorito, quitarFavorito } from '../../services/favorito.service.js';
import Icono from '../Icono.jsx';

// Corazón para guardar o quitar un profesional de favoritos (FS-HU-23). El cambio se ve al instante
// y se revierte si la API falla.
export default function BotonFavorito({ profesional, onCambio, className = '' }) {
  const [esFavorito, setEsFavorito] = useState(Boolean(profesional.esFavorito));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const alternar = async () => {
    const nuevo = !esFavorito;
    setEsFavorito(nuevo);
    setGuardando(true);
    setError('');
    try {
      await (nuevo ? agregarFavorito : quitarFavorito)(profesional.id);
      onCambio?.(nuevo);
    } catch (fallo) {
      setEsFavorito(!nuevo);
      setError(fallo.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <span className={`favorito ${className}`}>
      <button type="button" className={`boton-favorito${esFavorito ? ' boton-favorito--activo' : ''}`} aria-pressed={esFavorito}
        aria-label={`Guardar a ${profesional.nombre} en favoritos`} title={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        disabled={guardando} onClick={alternar}>
        <Icono nombre="corazon" tamano={20} relleno={esFavorito} />
      </button>
      {error && <span className="favorito__error" role="alert">{error}</span>}
    </span>
  );
}
