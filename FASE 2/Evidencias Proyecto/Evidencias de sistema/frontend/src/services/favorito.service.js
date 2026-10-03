import { solicitar } from './api.js';

// Profesionales favoritos del usuario con sesión (FS-HU-23).
export const listarFavoritos = (pagina = 1) => solicitar(`/favoritos?pagina=${pagina}`);
export const agregarFavorito = (profesionalId) => solicitar(`/favoritos/${profesionalId}`, { metodo: 'PUT' });
export const quitarFavorito = (profesionalId) => solicitar(`/favoritos/${profesionalId}`, { metodo: 'DELETE' });
