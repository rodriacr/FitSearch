import { useState } from 'react';
import reglas from '@shared/reglas.json';
import Icono from '../Icono.jsx';
import { formatearNumero } from '../../services/formato.js';
import { BarraReparto } from './RepartoMacros.jsx';
import { MACROS, decimal, gramos } from './planComun.js';

const { planes } = reglas.comidas;
const { min: MIN, max: MAX } = planes.personalizado;
const MAX_NOMBRE = planes.nombrePersonalizado.max;
const comoTexto = (porcentajes) => Object.fromEntries(MACROS.map(({ clave }) => [clave, String(porcentajes[clave])]));
// Entero escrito en el campo, o null si está vacío o no es un número entero.
const leer = (texto) => (/^\d{1,3}$/.test(String(texto).trim()) ? Number(texto) : null);

// Editor de un plan personalizado: nombre, un deslizador y un número por macronutriente, el total y la vista previa.
function EditorPersonalizado({ inicial, editando, kcal, pesoKg, proteinaMetaGKg, recomendado, guardando, alGuardar, alCancelar }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [borrador, setBorrador] = useState(comoTexto(inicial.porcentajes));
  const valores = Object.fromEntries(MACROS.map(({ clave }) => [clave, leer(borrador[clave])]));
  const completos = MACROS.every(({ clave }) => valores[clave] !== null);
  const suma = MACROS.reduce((total, { clave }) => total + (valores[clave] ?? 0), 0);
  const enRango = MACROS.every(({ clave }) => valores[clave] !== null && valores[clave] >= MIN && valores[clave] <= MAX);
  const nombreListo = nombre.trim().length > 0;
  const valido = nombreListo && enRango && suma === 100;
  // Ajuste rápido: los carbohidratos completan el 100 % si el resultado queda dentro de lo permitido.
  const carbohidratosParaCien = 100 - (valores.proteinas ?? 0) - (valores.grasas ?? 0);
  const proteinaPorKilo = kcal && pesoKg && valores.proteinas !== null ? Math.round((gramos(kcal, valores.proteinas, 'proteinas') / pesoKg) * 10) / 10 : null;
  const cambiar = (clave, texto) => setBorrador((actual) => ({ ...actual, [clave]: texto }));
  const enviar = (usar) => alGuardar({ nombre: nombre.trim(), ...valores, ...(editando ? {} : { usar }) });

  return (
    <form className="plan-editor" onSubmit={(evento) => { evento.preventDefault(); if (valido) enviar(true); }}>
      <h3 className="plan-editor__titulo">{editando ? `Editar «${inicial.nombre}»` : 'Nuevo plan personalizado'}</h3>
      <label className="plan-editor__nombre">
        Nombre
        <input
          type="text" value={nombre} maxLength={MAX_NOMBRE} placeholder="Por ejemplo: Días de entrenamiento" autoComplete="off"
          aria-describedby="plan-nombre-ayuda" onChange={(evento) => setNombre(evento.target.value)}
        />
        <span id="plan-nombre-ayuda" className="plan-editor__ayuda">{nombreListo ? `Hasta ${MAX_NOMBRE} caracteres.` : 'Ponle un nombre para encontrarlo en tu lista.'}</span>
      </label>

      <div className="plan-editor__cabecera">
        <span id="plan-macros-titulo">Qué parte de tus calorías viene de cada macronutriente</span>
        <button type="button" className="boton-texto plan-editor__meta" onClick={() => setBorrador(comoTexto(recomendado))}>Partir del reparto de mi meta</button>
      </div>
      <div className="plan-editor__macros" role="group" aria-labelledby="plan-macros-titulo">
        {MACROS.map(({ clave, nombre: etiqueta, color }) => {
          const valor = valores[clave];
          const [desde, hasta] = planes.recomendado[clave];
          const fueraDeRango = valor !== null && (valor < MIN || valor > MAX);
          // Fuera de los rangos generales para adultos, salvo que sea justo lo que recomienda su meta (por ejemplo, menos
          // carbohidratos al bajar de peso, porque la proteína sube).
          const fueraDeRecomendado = valor !== null && !fueraDeRango && (valor < desde || valor > hasta) && valor !== recomendado[clave];
          const posicion = valor === null ? MIN : Math.min(MAX, Math.max(MIN, valor));
          return (
            <div key={clave} className="plan-macro" style={{ '--color-nutriente': color }}>
              <label htmlFor={`plan-${clave}`} className="plan-macro__nombre"><span className="reparto__punto" aria-hidden="true" /> {etiqueta}</label>
              <input
                type="range" className="plan-macro__deslizador" min={MIN} max={MAX} step={1} value={posicion}
                style={{ '--relleno': `${((posicion - MIN) / (MAX - MIN)) * 100}%` }}
                aria-label={`${etiqueta}, deslizador`} aria-valuetext={`${valor ?? MIN} %`} onChange={(evento) => cambiar(clave, evento.target.value)}
              />
              <span className="plan-macro__numero">
                <input
                  id={`plan-${clave}`} type="number" inputMode="numeric" min={MIN} max={MAX} step={1} value={borrador[clave]}
                  aria-invalid={valor === null || fueraDeRango} aria-describedby={`plan-${clave}-detalle`} onChange={(evento) => cambiar(clave, evento.target.value)}
                />
                <span aria-hidden="true">%</span>
              </span>
              <p id={`plan-${clave}-detalle`} className={`plan-macro__detalle${fueraDeRango || valor === null ? ' plan-macro__detalle--error' : ''}`}>
                {valor === null && `Escribe un número entero entre ${MIN} y ${MAX}.`}
                {fueraDeRango && `Elige entre ${MIN} % y ${MAX} %.`}
                {valor !== null && !fueraDeRango && (kcal ? `${formatearNumero(gramos(kcal, valor, clave))} g al día` : `Recomendado: ${desde}–${hasta} %`)}
                {fueraDeRecomendado && <span className="plan-macro__aviso"> · Fuera de lo recomendado ({desde}–{hasta} %)</span>}
              </p>
            </div>
          );
        })}
      </div>

      <div className={`plan-total${completos && suma === 100 ? ' plan-total--ok' : ''}`} role="status">
        {completos && suma === 100 ? (
          <p><Icono nombre="check" tamano={18} /> Suman 100 %</p>
        ) : (
          <p>
            Suman {suma} %. {suma > 100 ? `Quita ${suma - 100} %` : `Agrega ${100 - suma} %`} para llegar a 100 %.
            {valores.proteinas !== null && valores.grasas !== null && carbohidratosParaCien >= MIN && carbohidratosParaCien <= MAX && carbohidratosParaCien !== valores.carbohidratos && (
              <> <button type="button" className="boton-texto" onClick={() => cambiar('carbohidratos', String(carbohidratosParaCien))}>Ajustar carbohidratos a {carbohidratosParaCien} %</button></>
            )}
          </p>
        )}
      </div>
      {proteinaPorKilo !== null && (
        <p className="plan__por-kilo">
          Tu proteína equivale a <strong>{decimal(proteinaPorKilo)} g por kilo</strong> de peso; tu meta recomienda {decimal(proteinaMetaGKg)} g.
          {proteinaPorKilo < planes.proteinaMinimaGKg && ` Queda bajo el mínimo diario de ${decimal(planes.proteinaMinimaGKg)} g por kilo para adultos.`}
        </p>
      )}
      {/* Vista previa del reparto: los números ya están en cada fila, así que va solo la barra. */}
      <BarraReparto porcentajes={valores} />

      <div className="plan__acciones">
        {editando ? (
          <button type="submit" className="boton boton--principal boton--compacto" disabled={!valido || guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        ) : (
          <>
            <button type="submit" className="boton boton--principal boton--compacto" disabled={!valido || guardando}>{guardando ? 'Guardando…' : 'Guardar y usar desde hoy'}</button>
            <button type="button" className="boton boton--secundario boton--compacto" disabled={!valido || guardando} onClick={() => enviar(false)}>Solo guardar</button>
          </>
        )}
        <button type="button" className="boton-texto" onClick={alCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function PlanDeLista({ plan, guardando, alUsar, alEditar, alEliminar }) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <li className={`personalizado${plan.enUso ? ' personalizado--en-uso' : ''}`}>
      <div className="personalizado__cabecera">
        <div className="personalizado__titulo">
          <h3 className="personalizado__nombre">{plan.nombre}</h3>
          {plan.enUso && <span className="personalizado__en-uso"><Icono nombre="check" tamano={14} /> En uso</span>}
        </div>
        {!confirmando && (
          <span className="personalizado__iconos">
            <button type="button" className="boton-icono" aria-label={`Editar «${plan.nombre}»`} title="Editar" onClick={alEditar}><Icono nombre="lapiz" tamano={18} /></button>
            <button type="button" className="boton-icono" aria-label={`Eliminar «${plan.nombre}»`} title="Eliminar" onClick={() => setConfirmando(true)}><Icono nombre="basura" tamano={18} /></button>
          </span>
        )}
      </div>
      <BarraReparto porcentajes={plan.porcentajes} compacta />
      <ul className="personalizado__valores">
        {MACROS.map(({ clave, nombre, color }) => (
          <li key={clave} style={{ '--color-nutriente': color }}>
            <span className="reparto__punto" aria-hidden="true" /> {nombre} <strong>{plan.porcentajes[clave]} %</strong>
          </li>
        ))}
      </ul>
      {confirmando ? (
        <div className="personalizado__confirmar">
          <p>¿Eliminar «{plan.nombre}»?{plan.enUso && ' Desde hoy volverás al plan según tu meta.'}</p>
          <div>
            <button type="button" className="boton boton--peligro boton--compacto" disabled={guardando} onClick={alEliminar}>Eliminar</button>
            <button type="button" className="boton-texto" onClick={() => setConfirmando(false)}>Cancelar</button>
          </div>
        </div>
      ) : !plan.enUso && (
        <div className="personalizado__acciones">
          <button type="button" className="boton boton--secundario boton--compacto" disabled={guardando} onClick={alUsar}>Usar desde hoy</button>
        </div>
      )}
    </li>
  );
}

// Lista de planes personalizados (11-11-2026; pedido del PO): se guardan varios y se elige cuál usar desde hoy.
export default function PlanesPersonalizados({ datos, guardando, editor, setEditor, acciones }) {
  const { personalizados, maxPersonalizados, plan, perfil, recomendado } = datos;
  const lleno = personalizados.length >= maxPersonalizados;
  const proteinaMetaGKg = recomendado.proteinasG !== null && perfil.pesoKg
    ? Math.round((recomendado.proteinasG / perfil.pesoKg) * 10) / 10
    : (planes.metas[datos.meta.valor] ?? planes.metas.otro).proteinaGKg;
  const abrirNuevo = () => setEditor({ id: null, nombre: '', porcentajes: recomendado.porcentajes });

  if (editor) {
    return (
      <EditorPersonalizado
        key={editor.id ?? 'nuevo'} inicial={editor} editando={editor.id !== null} kcal={plan.kcal} pesoKg={perfil.pesoKg}
        proteinaMetaGKg={proteinaMetaGKg} recomendado={recomendado.porcentajes} guardando={guardando} alCancelar={() => setEditor(null)}
        alGuardar={(valores) => (editor.id === null ? acciones.crear(valores) : acciones.actualizar(editor.id, valores))}
      />
    );
  }
  return (
    <div className="personalizados">
      <div className="personalizados__encabezado">
        <h3>Mis planes personalizados</h3>
        <span className="texto-secundario">{personalizados.length} de {maxPersonalizados}</span>
      </div>
      {personalizados.length === 0 ? (
        <p className="personalizados__vacio texto-secundario">Aún no tienes planes propios. Crea uno con el reparto que prefieras, ponle un nombre y cámbialo cuando quieras: por ejemplo, uno para días de entrenamiento y otro para días de descanso.</p>
      ) : (
        <ul className="personalizados__lista">
          {personalizados.map((propio) => (
            <PlanDeLista
              key={propio.id} plan={propio} guardando={guardando}
              alUsar={() => acciones.usar(propio)} alEliminar={() => acciones.eliminar(propio)}
              alEditar={() => setEditor({ id: propio.id, nombre: propio.nombre, porcentajes: propio.porcentajes })}
            />
          ))}
        </ul>
      )}
      <div className="plan__acciones">
        <button type="button" className="boton boton--principal boton--compacto" disabled={lleno} onClick={abrirNuevo}>
          <Icono nombre="mas" tamano={18} /> Crear plan personalizado
        </button>
        {lleno && <p className="texto-secundario">Llegaste al máximo de {maxPersonalizados}; borra uno para crear otro.</p>}
      </div>
      <p className="texto-secundario plan__nota">Las calorías siguen tu meta. El plan que uses rige desde hoy; los días anteriores conservan el que tenían.</p>
    </div>
  );
}
