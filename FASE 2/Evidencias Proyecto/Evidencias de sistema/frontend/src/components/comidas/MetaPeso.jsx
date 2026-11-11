import { useState } from 'react';
import { Link } from 'react-router-dom';
import reglas from '@shared/reglas.json';
import Alerta from '../Alerta.jsx';
import { formatearNumero } from '../../services/formato.js';
import { decimal } from './planComun.js';

const { metaPeso: reglasMeta } = reglas.comidas.planes;
const NOMBRES_RITMO = { 0.25: 'Suave', 0.5: 'Moderado', 0.75: 'Rápido' };
const fechaLarga = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const conFecha = (iso) => fechaLarga.format(new Date(`${iso}T00:00:00Z`));
const kcalPorRitmo = (ritmo) => Math.round((ritmo * reglasMeta.kcalPorKg) / 7);
const sumarDias = (iso, dias) => {
  const fecha = new Date(`${iso}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
};
const hoyEnChile = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
// Peso escrito con coma o punto; null si no es un número.
const leerPeso = (texto) => {
  const valor = Number(String(texto).trim().replace(',', '.'));
  return String(texto).trim() && Number.isFinite(valor) ? Math.round(valor * 10) / 10 : null;
};

function FormularioMeta({ objetivo, opciones, pesoKg, inicial, guardando, alGuardar, alCancelar }) {
  const [peso, setPeso] = useState(inicial ? String(inicial.pesoObjetivoKg).replace('.', ',') : '');
  const [ritmo, setRitmo] = useState(inicial?.ritmoSemanalKg ?? opciones.ritmoPorDefecto);
  const bajar = objetivo === 'bajar_peso';
  const { rango } = opciones;
  const valor = leerPeso(peso);
  let error = null;
  if (peso.trim() && valor === null) error = 'Escribe un número, por ejemplo 64,5.';
  else if (valor !== null && bajar && valor >= pesoKg) error = `Para bajar de peso, elige un peso menor a tu peso actual (${decimal(pesoKg)} kg).`;
  else if (valor !== null && !bajar && valor <= pesoKg) error = `Para aumentar masa muscular, elige un peso mayor a tu peso actual (${decimal(pesoKg)} kg).`;
  else if (valor !== null && valor < rango.min) error = rango.porImc ? `Con tu altura, bajo ${decimal(rango.min)} kg quedarías bajo el rango saludable (IMC 18,5).` : `Elige al menos ${decimal(rango.min)} kg.`;
  else if (valor !== null && valor > rango.max) error = rango.porImc ? `Con tu altura, sobre ${decimal(rango.max)} kg pasarías un IMC de 30.` : `Elige hasta ${decimal(rango.max)} kg.`;
  const valido = valor !== null && !error;
  const semanas = valido ? Math.ceil(Math.abs(pesoKg - valor) / ritmo) : null;

  return (
    <form className="meta-peso__formulario" onSubmit={(evento) => { evento.preventDefault(); if (valido) alGuardar({ pesoObjetivoKg: valor, ritmoSemanalKg: ritmo }); }}>
      <label className="meta-peso__campo">
        Peso al que quieres llegar
        <span className="meta-peso__entrada">
          <input
            type="text" inputMode="decimal" value={peso} placeholder={`Por ejemplo, ${Math.round(bajar ? Math.max(rango.min, pesoKg - 5) : Math.min(rango.max, pesoKg + 3))}`} autoComplete="off"
            aria-invalid={Boolean(error)} aria-describedby="meta-peso-ayuda" onChange={(evento) => setPeso(evento.target.value)}
          />
          <span aria-hidden="true">kg</span>
        </span>
        <span id="meta-peso-ayuda" className={`meta-peso__ayuda${error ? ' meta-peso__ayuda--error' : ''}`}>
          {error ?? `Hoy pesas ${decimal(pesoKg)} kg. Puedes elegir entre ${decimal(rango.min)} y ${decimal(rango.max)} kg.`}
        </span>
      </label>
      <fieldset className="meta-peso__ritmos">
        <legend>A qué ritmo</legend>
        {opciones.ritmos.map((opcion) => (
          <label key={opcion} className="meta-peso__ritmo">
            <input type="radio" name="ritmo" value={opcion} checked={ritmo === opcion} onChange={() => setRitmo(opcion)} />
            <span>
              <strong>{NOMBRES_RITMO[opcion]}</strong> · {decimal(opcion)} kg por semana
              <small>{bajar ? '−' : '+'}{formatearNumero(kcalPorRitmo(opcion))} kcal al día</small>
            </span>
          </label>
        ))}
      </fieldset>
      {semanas !== null && (
        <p className="meta-peso__estimacion">A ese ritmo llegarías cerca del <strong>{conFecha(sumarDias(hoyEnChile(), semanas * 7))}</strong> ({semanas} {semanas === 1 ? 'semana' : 'semanas'}).</p>
      )}
      <div className="plan__acciones">
        <button type="submit" className="boton boton--principal boton--compacto" disabled={!valido || guardando}>{guardando ? 'Guardando…' : 'Guardar meta de peso'}</button>
        {alCancelar && <button type="button" className="boton-texto" onClick={alCancelar}>Cancelar</button>}
      </div>
    </form>
  );
}

// Meta de peso (11-11-2026; pedido del PO): peso al que se quiere llegar y ritmo semanal. Ajusta las calorías del plan y
// muestra el avance con el peso que la persona va anotando en su perfil.
export default function MetaPeso({ datos, guardando, acciones, mensaje }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const { metaPeso: meta, opcionesMetaPeso: opciones, meta: metaPerfil, perfil } = datos;
  const objetivo = metaPerfil.valor;
  const guardar = (valores) => acciones.guardarMetaPeso(valores).then((listo) => listo && setEditando(false));

  let cuerpo;
  if (!opciones) {
    cuerpo = meta ? (
      <>
        <p>Guardaste una meta de llegar a {decimal(meta.pesoObjetivoKg)} kg, pero tu meta ahora es «{metaPerfil.etiqueta ?? 'sin definir'}», así que no se está usando.</p>
        <div className="plan__acciones">
          <Link to="/perfil" className="boton boton--secundario boton--compacto">Cambiar mi meta</Link>
          <button type="button" className="boton-texto" disabled={guardando} onClick={acciones.quitarMetaPeso}>Quitar meta de peso</button>
        </div>
      </>
    ) : (
      <p className="texto-secundario">Puedes fijar un peso al que llegar cuando tu meta sea «Bajar de peso» o «Aumentar masa muscular». <Link to="/perfil">Cambiar mi meta</Link></p>
    );
  } else if (!opciones.rango) {
    cuerpo = <p className="texto-secundario">Anota tu peso actual en tu perfil para fijar una meta de peso. <Link to="/perfil">Ir a mi perfil</Link></p>;
  } else if (!meta || !meta.aplica || editando) {
    cuerpo = (
      <FormularioMeta
        objetivo={objetivo} opciones={opciones} pesoKg={perfil.pesoKg} inicial={meta?.aplica ? meta : null} guardando={guardando}
        alGuardar={guardar} alCancelar={editando ? () => setEditando(false) : null}
      />
    );
  } else {
    const bajar = meta.objetivo === 'bajar_peso';
    cuerpo = (
      <>
        <p className="meta-peso__resumen">
          De <strong>{decimal(meta.pesoInicialKg)} kg</strong> a <strong>{decimal(meta.pesoObjetivoKg)} kg</strong>
          <span className="texto-secundario"> · desde el {conFecha(meta.fechaInicio)}</span>
        </p>
        <div className="meta-peso__avance">
          <div className="meta-peso__pista" role="progressbar" aria-label="Avance de tu meta de peso" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={meta.avancePct ?? 0} aria-valuetext={`${meta.avancePct ?? 0} % del camino`}>
            <span style={{ width: `${meta.avancePct ?? 0}%` }} />
          </div>
          <p><strong>{meta.avancePct ?? 0} %</strong> del camino · hoy pesas {decimal(meta.pesoActualKg)} kg</p>
        </div>
        {meta.alcanzada ? (
          <Alerta tipo="exito">¡Llegaste a tu meta de peso! Si quieres mantenerlo, cambia tu meta a «Mantener peso» en tu perfil.</Alerta>
        ) : (
          <p className="meta-peso__estimacion">
            Te faltan <strong>{decimal(meta.faltanKg)} kg</strong>. A {decimal(meta.ritmoSemanalKg)} kg por semana llegarías cerca del <strong>{conFecha(meta.fechaEstimada)}</strong> ({meta.semanas} {meta.semanas === 1 ? 'semana' : 'semanas'}).
            {' '}Para eso tus calorías {bajar ? 'bajan' : 'suben'} {formatearNumero(Math.abs(meta.ajusteKcal))} kcal al día.
          </p>
        )}
        {confirmando ? (
          <div className="personalizado__confirmar">
            <p>¿Quitar tu meta de peso? Tus calorías volverán al ajuste general de tu meta.</p>
            <div>
              <button type="button" className="boton boton--peligro boton--compacto" disabled={guardando} onClick={() => { setConfirmando(false); acciones.quitarMetaPeso(); }}>Quitar</button>
              <button type="button" className="boton-texto" onClick={() => setConfirmando(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="plan__acciones">
            <button type="button" className="boton boton--secundario boton--compacto" onClick={() => setEditando(true)}>Editar meta</button>
            <button type="button" className="boton-texto" onClick={() => setConfirmando(true)}>Quitar meta</button>
          </div>
        )}
        <p className="texto-secundario plan__nota">Tu avance usa el peso de tu perfil: actualízalo en <Link to="/perfil">Mi perfil</Link> cuando te peses.</p>
      </>
    );
  }

  return (
    <section className="panel-tarjeta meta-peso" aria-labelledby="titulo-meta-peso">
      <h2 id="titulo-meta-peso" className="panel-tarjeta__titulo">Tu meta de peso</h2>
      {cuerpo}
      {mensaje}
    </section>
  );
}
