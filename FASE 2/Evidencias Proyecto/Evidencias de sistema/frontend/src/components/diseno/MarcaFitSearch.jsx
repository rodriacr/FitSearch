import iconoLogo from '../../assets/logo-fitsearch-icono.png';

// Marca de las pantallas con sesión: el ícono y «FitSearch» en texto, como en la portada. El logo horizontal traía
// el lema dentro de la imagen y a este tamaño no se alcanzaba a leer. El nombre accesible lo da el enlace que la envuelve.
export default function MarcaFitSearch({ clara = false }) {
  return (
    <span className={`marca${clara ? ' marca--clara' : ''}`}>
      <img src={iconoLogo} alt="" width={36} height={36} />
      <span>Fit<span>Search</span></span>
    </span>
  );
}
