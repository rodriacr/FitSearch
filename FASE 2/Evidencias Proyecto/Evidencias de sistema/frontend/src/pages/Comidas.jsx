import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alerta from '../components/Alerta.jsx';
import Icono from '../components/Icono.jsx';
import ComidasDelDia from '../components/comidas/ComidasDelDia.jsx';
import { AnilloCalorias, BarraNutriente, ProgresoSemanal } from '../components/comidas/GraficosComidas.jsx';
import RegistrarComida from '../components/comidas/RegistrarComida.jsx';
import { formatearNumero } from '../services/formato.js';
import { nombreDia, obtenerDia, obtenerSemana, sumarDias } from '../services/comidas.service.js';
import './Comidas.css';

const PESTANAS = [
  { clave: 'resumen', nombre: 'Resumen' },
  { clave: 'comidas', nombre: 'Comidas' },
  { clave: 'plan', nombre: 'Plan de alimentación', proximamente: true },
  { clave: 'estadisticas', nombre: 'Estadísticas', proximamente: true },
];
const NUTRIENTES = [
  { clave: 'proteinasG', nombre: 'Proteínas', color: '#2a7de1' },
  { clave: 'carbohidratosG', nombre: 'Carbohidratos', color: '#1fa37a' },
  { clave: 'grasasG', nombre: 'Grasas', color: '#f7931e' },
];

function TarjetaObjetivo({ objetivo }) {
  const { perfil } = objetivo;
  return (
    <section className="panel-tarjeta tarjeta-objetivo" aria-labelledby="titulo-objetivo">
      <div className="tarjeta-objetivo__encabezado">
        <h2 id="titulo-objetivo" className="panel-tarjeta__titulo"><Icono nombre="diana" tamano={20} /> Tu objetivo</h2>
        <Link to="/perfil" className="enlace-panel">Editar</Link>
      </div>
      <p className="tarjeta-objetivo__meta">{perfil.objetivoPrincipal ?? 'Sin objetivo definido'}</p>
      {objetivo.calorias ? (
        <dl className="tarjeta-objetivo__datos">
          <div><dt><Icono nombre="balanza" tamano={18} /> Peso</dt><dd>{formatearNumero(perfil.pesoKg)} kg</dd></div>
          <div><dt><Icono nombre="regla" tamano={18} /> Altura</dt><dd>{(perfil.alturaCm / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 })} m</dd></div>
          <div><dt><Icono nombre="actividad" tamano={18} /> Actividad</dt><dd>{perfil.actividadFisica}</dd></div>
        </dl>
      ) : (
        <p className="texto-secundario">Completa tu peso, altura, edad, sexo y actividad física en tu perfil para calcular tu objetivo diario.</p>
      )}
    </section>
  );
}

// Gestor de alimentación del usuario (FS-HU-09 y FS-HU-10; mockup del PO del 26-10-2026). Resumen del día frente al
// objetivo, progreso de la semana y las comidas del día; los alimentos se registran con sus gramos o desde el asistente.
export default function Comidas() {
  const [fecha, setFecha] = useState(null);
  const [intento, setIntento] = useState(0);
  const [pestana, setPestana] = useState('resumen');
  const [registro, setRegistro] = useState({ abierto: false, momento: null });
  const [datos, setDatos] = useState(null);
  const clave = `${fecha}-${intento}`;

  useEffect(() => {
    let activo = true;
    Promise.all([obtenerDia(fecha), obtenerSemana(fecha)])
      .then(([dia, semana]) => activo && setDatos({ clave, dia, semana }))
      .catch((error) => activo && setDatos({ clave, error: error.message }));
    return () => { activo = false; };
  }, [clave, fecha]);

  const recargar = () => setIntento((valor) => valor + 1);
  const abrirRegistro = (momento = null) => setRegistro({ abierto: true, momento });
  const dia = datos?.dia;
  const esHoy = dia && dia.fecha === dia.hoy;

  let contenido;
  if (!datos) {
    contenido = <p className="comidas__estado" role="status">Cargando tus comidas…</p>;
  } else if (datos.error) {
    contenido = (
      <div className="comidas__estado">
        <Alerta>{datos.error}</Alerta>
        <button type="button" className="boton boton--secundario boton--compacto" onClick={recargar}>Reintentar</button>
      </div>
    );
  } else if (pestana === 'comidas') {
    contenido = <ComidasDelDia momentos={dia.momentos} alRegistrar={abrirRegistro} alCambiar={recargar} />;
  } else {
    const { objetivo, consumo } = dia;
    contenido = (
      <div className="comidas__resumen">
        <section className="panel-tarjeta tarjeta-calorias" aria-labelledby="titulo-calorias">
          <h2 id="titulo-calorias" className="panel-tarjeta__titulo">Calorías {esHoy ? 'de hoy' : 'del día'}</h2>
          <p className="texto-secundario tarjeta-calorias__fecha">{nombreDia(dia.fecha)}</p>
          <div className="tarjeta-calorias__cuerpo">
            <AnilloCalorias consumo={consumo.calorias} objetivo={objetivo.calorias} />
            <ul className="tarjeta-calorias__macros">
              {NUTRIENTES.map(({ clave: nutriente, nombre, color }) => (
                <li key={nutriente} style={{ '--color-nutriente': color }}>
                  <span className="tarjeta-calorias__punto" aria-hidden="true" />
                  <span className="tarjeta-calorias__nombre">{nombre}</span>
                  <span>{formatearNumero(consumo[nutriente])} g{objetivo[nutriente] ? ` / ${formatearNumero(objetivo[nutriente])} g` : ''}</span>
                  {objetivo[nutriente] && <strong>{Math.round((consumo[nutriente] / objetivo[nutriente]) * 100)} %</strong>}
                </li>
              ))}
            </ul>
          </div>
          {!objetivo.calorias && <p className="texto-secundario">Completa tu perfil para ver cuánto te falta para tu objetivo diario. <Link to="/perfil">Ir a mi perfil</Link></p>}
        </section>

        <section className="panel-tarjeta tarjeta-semana" aria-labelledby="titulo-semana">
          <div className="tarjeta-semana__encabezado">
            <h2 id="titulo-semana" className="panel-tarjeta__titulo">Progreso semanal</h2>
            <p className="tarjeta-semana__leyenda" aria-hidden="true"><span className="tarjeta-semana__consumidas">Consumidas</span><span className="tarjeta-semana__objetivo">Objetivo</span></p>
          </div>
          <ProgresoSemanal semana={datos.semana} fechaActual={dia.fecha} />
        </section>

        <section className="panel-tarjeta tarjeta-comidas" aria-labelledby="titulo-comidas-dia">
          <div className="tarjeta-comidas__encabezado">
            <h2 id="titulo-comidas-dia" className="panel-tarjeta__titulo">Comidas {esHoy ? 'de hoy' : 'del día'}</h2>
            <button type="button" className="enlace-panel boton-texto" onClick={() => setPestana('comidas')}>Ver todas <Icono nombre="flecha" tamano={16} /></button>
          </div>
          <ComidasDelDia momentos={dia.momentos} compacta alRegistrar={abrirRegistro} />
        </section>

        <section className="panel-tarjeta tarjeta-nutricional" aria-labelledby="titulo-nutricional">
          <h2 id="titulo-nutricional" className="panel-tarjeta__titulo">Resumen nutricional</h2>
          <BarraNutriente nombre="Calorías" consumo={consumo.calorias} objetivo={objetivo.calorias} unidad="kcal" color="#1c74c9" />
          {NUTRIENTES.map(({ clave: nutriente, nombre, color }) => (
            <BarraNutriente key={nutriente} nombre={nombre} consumo={consumo[nutriente]} objetivo={objetivo[nutriente]} color={color} />
          ))}
        </section>

        <div className="comidas__pie">
          <TarjetaObjetivo objetivo={objetivo} />
          <section className="tarjeta-asistente-comidas" aria-labelledby="titulo-asistente-comidas">
            <h2 id="titulo-asistente-comidas">Anótalo conversando</h2>
            <p>Pídele al asistente «agrega 100 g de pollo a mi almuerzo» y lo sumará a tus comidas de hoy.</p>
            <Link to="/asistente/nuevo?inicio=comida" className="boton boton--principal boton--compacto">Abrir asistente <Icono nombre="flecha" tamano={18} /></Link>
          </section>
        </div>

        <p className="comidas__nota texto-secundario">
          Objetivo diario estimado con tu perfil (Mifflin-St Jeor y tu actividad física), repartido en 30 % proteínas, 45 % carbohidratos y
          25 % grasas. Es una referencia general que no reemplaza la evaluación de un nutricionista.
        </p>
      </div>
    );
  }

  return (
    <div className="comidas">
      <header className="comidas__encabezado">
        <span className="comidas__icono" aria-hidden="true"><Icono nombre="comida" tamano={30} /></span>
        <div className="comidas__titulos">
          <h1>Comidas</h1>
          <p>Lleva un registro de tu alimentación diaria y controla tu progreso.</p>
        </div>
        <button type="button" className="boton boton--principal boton--compacto comidas__registrar" onClick={() => abrirRegistro()} disabled={!dia}>
          <Icono nombre="mas" tamano={20} /> Registrar comida
        </button>
      </header>

      <div className="comidas__pestanas" role="group" aria-label="Secciones de Comidas">
        {PESTANAS.map(({ clave: valor, nombre, proximamente }) => (proximamente ? (
          <span key={valor} className="comidas__pestana comidas__pestana--proximamente">{nombre} <span className="etiqueta-proximamente">Próximamente</span></span>
        ) : (
          <button key={valor} type="button" className="comidas__pestana" aria-pressed={pestana === valor} onClick={() => setPestana(valor)}>{nombre}</button>
        )))}
      </div>

      {dia && (
        <nav className="comidas__dia" aria-label="Día">
          <button type="button" className="boton-icono" onClick={() => setFecha(sumarDias(dia.fecha, -1))} aria-label="Día anterior">
            <Icono nombre="chevron" tamano={20} className="comidas__anterior" />
          </button>
          <p aria-live="polite"><strong>{esHoy ? 'Hoy' : nombreDia(dia.fecha)}</strong>{esHoy && <span className="texto-secundario"> · {nombreDia(dia.fecha).toLowerCase()}</span>}</p>
          <button type="button" className="boton-icono" onClick={() => setFecha(sumarDias(dia.fecha, 1))} disabled={esHoy} aria-label="Día siguiente">
            <Icono nombre="chevron" tamano={20} className="comidas__siguiente" />
          </button>
          {!esHoy && <button type="button" className="boton-texto" onClick={() => setFecha(null)}>Volver a hoy</button>}
        </nav>
      )}

      {registro.abierto && dia && (
        <RegistrarComida fecha={dia.fecha} momentoInicial={registro.momento} alGuardar={recargar}
          alCerrar={() => setRegistro({ abierto: false, momento: null })} />
      )}
      {contenido}
    </div>
  );
}
