import { useState } from 'react';
import Alerta from '../../components/Alerta.jsx';
import Icono from '../../components/Icono.jsx';
import { Barras, Cifra, ColumnasApiladas } from '../../components/graficos/Graficos.jsx';
import { formatearNumero } from '../../services/formato.js';
import { useDatosAdmin } from './useDatosAdmin.js';
import './PanelesAdministrador.css';

const PERIODOS = [[30, '30 días'], [90, '90 días'], [365, '12 meses']];
// Mismos colores que en los reportes del profesional para las reservas (la misma cosa, el mismo color). Las cuentas
// usan el azul y el naranjo de la paleta validada.
const SERIES_CUENTAS = [
  { clave: 'usuario', nombre: 'Usuarios', color: '#1565a0' },
  { clave: 'profesional', nombre: 'Profesionales', color: '#e07b2a' },
];
const SERIES_RESERVAS = [
  { clave: 'confirmada', nombre: 'Confirmadas', color: '#1f7a52' },
  { clave: 'pendiente', nombre: 'Por confirmar', color: '#e07b2a' },
  { clave: 'cancelada', nombre: 'Canceladas', color: '#b54a5a' },
];
const FUNCIONES = [
  ['asistente', 'Asistente IA'], ['comidas', 'Registro de comidas'], ['reservas', 'Reservas de horas'], ['agua', 'Registro de agua'],
  ['favoritos', 'Favoritos'], ['planes', 'Planes personalizados'],
];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const corta = (fecha) => `${Number(fecha.slice(8))} ${MESES[Number(fecha.slice(5, 7)) - 1]}`;
const larga = (fecha) => `${Number(fecha.slice(8))} de ${MESES_LARGOS[Number(fecha.slice(5, 7)) - 1]} de ${fecha.slice(0, 4)}`;
const porcentaje = (parte, total) => (total ? `${Math.round((parte / total) * 100)} %` : '—');
const decimal = (valor) => valor.toLocaleString('es-CL', { maximumFractionDigits: 1 });
// Días para verificar: bajo un día se dice así, en vez de «0 días».
const textoDias = (valor) => (valor < 1 ? 'menos de un día' : `${decimal(valor)} ${valor === 1 ? 'día' : 'días'}`);

// Cómo se nombra cada grupo del gráfico: semanas (por su lunes) o meses.
function nombresDeGrupo(agrupacion) {
  if (agrupacion === 'mes') {
    const mes = (grupo) => `${MESES[Number(grupo.clave.slice(5)) - 1]} ${grupo.clave.slice(2, 4)}`;
    return { etiqueta: mes, titulo: (grupo) => `${MESES_LARGOS[Number(grupo.clave.slice(5)) - 1]} de ${grupo.clave.slice(0, 4)}`, encabezado: 'Mes' };
  }
  return { etiqueta: (grupo) => corta(grupo.desde), titulo: (grupo) => `Semana del ${corta(grupo.desde)}`, encabezado: 'Semana' };
}

// CSV del reporte para abrir en una planilla (separado por punto y coma, como lo espera Excel en español).
function descargarCsv(datos) {
  const filas = [['Sección', 'Indicador', 'Valor']];
  const agregar = (seccion, indicador, valor) => filas.push([seccion, indicador, valor ?? '']);
  const { crecimiento, oferta, demanda, calidad, uso, periodo } = datos;
  agregar('Período', 'Desde', periodo.desde);
  agregar('Período', 'Hasta', periodo.hasta);
  agregar('Crecimiento', 'Cuentas nuevas', crecimiento.nuevas);
  agregar('Crecimiento', 'Cuentas nuevas del período anterior', crecimiento.nuevasAnterior);
  agregar('Crecimiento', 'Profesionales nuevos', crecimiento.profesionalesNuevos);
  for (const grupo of crecimiento.grupos) agregar('Crecimiento', `Cuentas desde el ${grupo.desde} (usuarios / profesionales)`, `${grupo.usuario} / ${grupo.profesional}`);
  agregar('Demanda', 'Reservas', demanda.reservas);
  agregar('Demanda', 'Reservas del período anterior', demanda.reservasAnterior);
  agregar('Demanda', 'Tasa de cancelación (%)', demanda.tasaCancelacion);
  agregar('Demanda', 'Profesionales verificados con reservas', `${demanda.profesionalesConReservas} de ${demanda.verificados}`);
  for (const fila of demanda.porEspecialidad) agregar('Demanda', `Reservas de ${fila.etiqueta}`, fila.valor);
  for (const [clave, nombre] of [['sinSolicitud', 'Sin solicitud'], ['pendiente', 'Pendientes'], ['verificado', 'Verificados'], ['rechazado', 'Rechazados']]) {
    agregar('Oferta', `Profesionales: ${nombre}`, oferta.embudo[clave]);
  }
  for (const fila of oferta.porEspecialidad) agregar('Oferta', `Verificados en ${fila.etiqueta}`, fila.valor);
  for (const fila of oferta.porComuna) agregar('Oferta', `Verificados en la comuna ${fila.etiqueta}`, fila.valor);
  agregar('Oferta', 'Días para verificar (promedio)', oferta.verificacion.promedio);
  agregar('Calidad', 'Reseñas', calidad.resenas);
  agregar('Calidad', 'Calificación promedio', calidad.promedio);
  for (const puntaje of [5, 4, 3, 2, 1]) agregar('Calidad', `Reseñas de ${puntaje} estrellas`, calidad.distribucion[puntaje]);
  for (const [clave, nombre] of FUNCIONES) agregar('Uso', `Personas que usaron ${nombre}`, uso[clave]);
  const texto = filas.map((fila) => fila.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(';')).join('\r\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([`\uFEFF${texto}`], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `reporte-fitsearch-${periodo.desde}-al-${periodo.hasta}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

// Reportes del administrador (11-11-2026): análisis de un período frente al anterior, por áreas (crecimiento, demanda,
// oferta, calidad y uso). Lo del día a día está en el Dashboard; aquí no se repite.
export default function ReportesAdministrador() {
  const [dias, setDias] = useState(30);
  const { datos, error, actualizando, reintentar } = useDatosAdmin(`/administrador/reportes?dias=${dias}`);
  const nombres = datos && nombresDeGrupo(datos.periodo.agrupacion);
  const deltaDe = (actual, anterior) => actual - anterior;

  return (
    <div className="admin-pantalla">
      <header className="admin-pantalla__cabecera">
        <div>
          <h1>Reportes</h1>
          <p>{datos
            ? `Del ${larga(datos.periodo.desde)} al ${larga(datos.periodo.hasta)}, comparado con los ${datos.periodo.dias === 365 ? '12 meses' : `${datos.periodo.dias} días`} anteriores.`
            : 'Cómo crece y se usa FitSearch en el período que elijas.'}</p>
        </div>
        <div className="admin-pantalla__herramientas">
          <div className="segmentos" role="group" aria-label="Período del reporte">
            {PERIODOS.map(([valor, nombre]) => (
              <button key={valor} type="button" className="segmentos__opcion" aria-pressed={dias === valor} onClick={() => setDias(valor)}>{nombre}</button>
            ))}
          </div>
          <button type="button" className="boton boton--secundario boton--compacto" disabled={!datos} onClick={() => descargarCsv(datos)}>
            <Icono nombre="descargar" tamano={18} /> Descargar CSV
          </button>
        </div>
      </header>

      {error && !datos ? (
        <div className="admin-pantalla__estado">
          <Alerta>{error}</Alerta>
          <button type="button" className="boton boton--secundario boton--compacto" onClick={reintentar}>Reintentar</button>
        </div>
      ) : !datos ? (
        <p className="texto-secundario" role="status">Cargando reportes…</p>
      ) : (
        <div className={`admin-reportes${actualizando ? ' admin-reportes--actualizando' : ''}`} aria-busy={actualizando}>
          {error && <Alerta>{error}</Alerta>}

          <section className="admin-panel" aria-labelledby="titulo-crecimiento">
            <h2 id="titulo-crecimiento">Crecimiento</h2>
            <dl className="cifras">
              <Cifra etiqueta="Cuentas nuevas" valor={formatearNumero(datos.crecimiento.nuevas)} delta={deltaDe(datos.crecimiento.nuevas, datos.crecimiento.nuevasAnterior)} />
              <Cifra etiqueta="Profesionales nuevos" valor={formatearNumero(datos.crecimiento.profesionalesNuevos)}
                detalle={`${porcentaje(datos.crecimiento.profesionalesNuevos, datos.crecimiento.nuevas)} de las cuentas nuevas`} />
              <Cifra etiqueta="Usuarios activos" valor={formatearNumero(datos.crecimiento.usuariosActivos)} detalle="Total actual" />
              <Cifra etiqueta="Cuentas desactivadas" valor={formatearNumero(datos.crecimiento.inactivas)} detalle="Total actual" />
            </dl>
            <h3 className="admin-panel__subtitulo">Cuentas nuevas por {datos.periodo.agrupacion === 'mes' ? 'mes' : 'semana'} y tipo</h3>
            <ColumnasApiladas grupos={datos.crecimiento.grupos} series={SERIES_CUENTAS} unidad={['cuenta nueva', 'cuentas nuevas']}
              etiqueta={nombres.etiqueta} titulo={nombres.titulo} tituloTabla="Cuentas nuevas por período y tipo de cuenta"
              filaTabla={{ encabezado: nombres.encabezado, texto: (grupo) => `Del ${corta(grupo.desde)} al ${corta(grupo.hasta)}` }} />
          </section>

          <section className="admin-panel" aria-labelledby="titulo-demanda">
            <h2 id="titulo-demanda">Demanda: reservas de horas</h2>
            <dl className="cifras">
              <Cifra etiqueta="Reservas" valor={formatearNumero(datos.demanda.reservas)} delta={deltaDe(datos.demanda.reservas, datos.demanda.reservasAnterior)} />
              <Cifra etiqueta="Cancelación" valor={datos.demanda.tasaCancelacion === null ? '—' : `${datos.demanda.tasaCancelacion} %`}
                detalle={`${datos.demanda.canceladas} de ${datos.demanda.reservas} reservas`} />
              <Cifra etiqueta="Profesionales con reservas" valor={porcentaje(datos.demanda.profesionalesConReservas, datos.demanda.verificados)}
                detalle={`${datos.demanda.profesionalesConReservas} de ${datos.demanda.verificados} verificados`} />
              <Cifra etiqueta="Reservas por profesional" valor={datos.demanda.verificados ? decimal(datos.demanda.reservas / datos.demanda.verificados) : '—'}
                detalle="Promedio entre los verificados" />
            </dl>
            <div className="admin-reportes__grilla">
              <div>
                <h3 className="admin-panel__subtitulo">Reservas por {datos.periodo.agrupacion === 'mes' ? 'mes' : 'semana'} y estado</h3>
                {datos.demanda.reservas ? (
                  <ColumnasApiladas grupos={datos.demanda.grupos} series={SERIES_RESERVAS} unidad={['reserva', 'reservas']}
                    etiqueta={nombres.etiqueta} titulo={nombres.titulo} tituloTabla="Reservas por período y estado"
                    filaTabla={{ encabezado: nombres.encabezado, texto: (grupo) => `Del ${corta(grupo.desde)} al ${corta(grupo.hasta)}` }} />
                ) : <p className="texto-secundario">No hubo reservas en este período.</p>}
              </div>
              <div>
                <h3 className="admin-panel__subtitulo">Especialidades más reservadas</h3>
                {datos.demanda.porEspecialidad.length
                  ? <Barras etiquetaLector="Reservas por especialidad" filas={datos.demanda.porEspecialidad} />
                  : <p className="texto-secundario">Sin reservas en el período.</p>}
              </div>
            </div>
          </section>

          <section className="admin-panel" aria-labelledby="titulo-oferta">
            <h2 id="titulo-oferta">Oferta: profesionales</h2>
            <div className="admin-reportes__grilla admin-reportes__grilla--tres">
              <div>
                <h3 className="admin-panel__subtitulo">Estado de verificación</h3>
                <Barras etiquetaLector="Profesionales según su estado de verificación" filas={[
                  { etiqueta: 'Verificados', valor: datos.oferta.embudo.verificado },
                  { etiqueta: 'Pendientes', valor: datos.oferta.embudo.pendiente },
                  { etiqueta: 'Sin solicitud', valor: datos.oferta.embudo.sinSolicitud },
                  { etiqueta: 'Rechazados', valor: datos.oferta.embudo.rechazado },
                ]} />
                <p className="admin-panel__nota">
                  {datos.oferta.verificacion.aprobadas
                    ? `Verificar tomó ${textoDias(datos.oferta.verificacion.promedio)} en promedio (mediana: ${textoDias(datos.oferta.verificacion.mediana)}) en ${datos.oferta.verificacion.aprobadas} ${datos.oferta.verificacion.aprobadas === 1 ? 'aprobación' : 'aprobaciones'} del período.`
                    : 'No hubo aprobaciones en el período.'}
                </p>
              </div>
              <div>
                <h3 className="admin-panel__subtitulo">Verificados por especialidad</h3>
                {datos.oferta.porEspecialidad.length
                  ? <Barras etiquetaLector="Profesionales verificados por especialidad" filas={datos.oferta.porEspecialidad} />
                  : <p className="texto-secundario">Aún no hay profesionales verificados.</p>}
              </div>
              <div>
                <h3 className="admin-panel__subtitulo">Verificados por comuna</h3>
                {datos.oferta.porComuna.length
                  ? <Barras etiquetaLector="Profesionales verificados por comuna" filas={datos.oferta.porComuna} />
                  : <p className="texto-secundario">Aún no hay profesionales verificados.</p>}
              </div>
            </div>
          </section>

          <div className="admin-reportes__grilla">
            <section className="admin-panel" aria-labelledby="titulo-calidad">
              <h2 id="titulo-calidad">Calidad: reseñas</h2>
              <p className="admin-calidad">
                <strong className="cifra">{datos.calidad.promedio === null ? '—' : decimal(datos.calidad.promedio)}</strong>
                <span>
                  de 5 estrellas en promedio
                  <small>{datos.calidad.resenas} {datos.calidad.resenas === 1 ? 'reseña' : 'reseñas'} · {porcentaje(datos.calidad.conCita, datos.calidad.resenas)} con cita verificada</small>
                </span>
              </p>
              <Barras etiquetaLector="Reseñas por cantidad de estrellas"
                filas={[5, 4, 3, 2, 1].map((p) => ({ etiqueta: `${p} ${p === 1 ? 'estrella' : 'estrellas'}`, valor: datos.calidad.distribucion[p] }))} />
            </section>
            <section className="admin-panel" aria-labelledby="titulo-uso">
              <h2 id="titulo-uso">Uso de las funciones</h2>
              <p className="admin-panel__nota">Personas que usaron cada función en el período, sobre {formatearNumero(datos.uso.usuariosActivos)} usuarios activos.</p>
              <Barras etiquetaLector="Personas que usaron cada función" formato={(valor) => formatearNumero(valor)}
                filas={FUNCIONES.map(([clave, nombre]) => ({ etiqueta: nombre, valor: datos.uso[clave], detalle: `(${porcentaje(datos.uso[clave], datos.uso.usuariosActivos)})` }))} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
