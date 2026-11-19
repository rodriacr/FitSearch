# Menú lateral contraído que se despliega al acercar el mouse (18-11-2026)

Cambio pedido por el Product Owner (Rodrigo Cárcamo Rojas) el 18-11-2026: «el menú lateral siempre contraído y, al estar cerca de los íconos, que se despliegue; quitar la opción de contraer porque ya no es necesaria; para usuario, profesional y administrador».

Ese mismo día pidió también marcar la sección actual con el ícono relleno, sin el recuadro celeste. Además pidió dejar la barra inferior del celular solo con íconos y usar en «Chat IA» el ícono del asistente. Ver la segunda parte más abajo.

- Solicitud de cambio reservada: **SC-40** (Matriz de Control de Cambio), que cubre las dos partes.
- Casos de prueba reservados: **CP-249** (menú contraído que se despliega) y **CP-250** (sección actual y barra inferior) en la Planilla de Casos de Prueba.
- Ambos se escriben en los Excel cuando se fusione el PR #80, que también modifica esos dos archivos.
- Reemplaza el menú compacto a elección del 11-11-2026 (`Menu_Compacto_2026-11-11.json`, botón «Contraer menú» / «Expandir menú»), que queda como evidencia histórica.
- Rama local: `feat/menu-lateral-desplegable` (desde `main` 877c35b).

## Comportamiento

| Situación | Resultado esperado |
|---|---|
| Escritorio con mouse (desde 64rem = 1024 px) | El menú queda siempre contraído: una columna de 76 px con solo los íconos. |
| El mouse se acerca a los íconos (entra en la columna) | Tras 120 ms el menú se despliega a 256 px **sobre** el contenido, con sombra. El contenido no se mueve. La espera evita que se abra cuando el mouse solo cruza la columna. |
| El mouse sale del menú | Se contrae a los 200 ms. La espera perdona salirse un instante del borde. |
| Clic en una opción con el mouse | Navega. Al retirar el mouse, el menú se contrae aunque el foco quede en la opción. |
| Teclado (Tab o Shift+Tab) | Al entrar al menú se despliega de inmediato, sigue desplegado mientras el foco esté dentro y se contrae al salir. |
| Lectores de pantalla | Cada opción conserva su nombre aunque esté contraída (texto transparente, no oculto). |
| Usuario | Contraído, la tarjeta «¿Necesitas una recomendación?» se reduce a un acceso con ícono («Abrir chat con el asistente IA»). Al desplegarse vuelve la tarjeta completa. |
| Profesional y administrador | El logo queda fijo en la columna y el lema «Mejores decisiones, mejores resultados.» aparece a su lado al desplegarse. |
| Opción «Próximamente» | Contraída se marca con un punto naranjo y desplegada, con la etiqueta. |
| Botón «Contraer menú» / «Expandir menú» | Ya no existe. La preferencia `fitsearch_menu_compacto` del navegador deja de usarse. |
| Celular y tableta (menos de 64rem) | Sin cambios: el menú se abre completo desde el botón de tres líneas. |
| Pantalla táctil grande (sin mouse) | El menú sigue completo, porque no hay mouse que se acerque a los íconos. |
| Movimiento reducido | Se despliega y se contrae sin animación. |

## Archivos

- `frontend/src/components/diseno/useMenuDesplegable.js` (nuevo): estado desplegado por mouse, con esperas, y por foco de teclado (`:focus-visible`).
- `frontend/src/components/diseno/MenuLateral.jsx`: sin botón para contraer ni nombre flotante; el acceso con ícono al chat siempre está montado y el CSS elige qué se ve.
- `frontend/src/components/diseno/DisenoAplicacion.jsx` y `DisenoAplicacion.css`: columna de 4,75rem que se despliega con margen negativo, para quedar sobre el contenido sin moverlo.
- Borrados: `useMenuCompacto.js`, `useEtiquetaFlotante.jsx`, la clase `.etiqueta-flotante` de `index.css` y los íconos `contraer` y `expandir` de `Icono.jsx`.
- Pruebas: `DisenoAplicacion.test.jsx` (mouse, clic y teclado), `EspacioProfesional.test.jsx`, `PanelAdministrador.test.jsx` y `Asistente.test.jsx` (nombre exacto del botón «Abrir chat»).

## Resultado

- Vitest del frontend: **494/494**. ESLint sin errores. `vite build` correcto.
- Revisión en Edge sin interfaz con la API y MySQL locales, usando dos cuentas temporales creadas por la API (`prueba.menu.*@fitsearch.test`) que se borraron al terminar:

| Medición (1440 × 900) | Contraído | Desplegado |
|---|---|---|
| Ancho del menú | 76 px | 256 px |
| Borde izquierdo del contenido | 76 px | 76 px (no se mueve) |
| Opacidad de los nombres | 0 | 1 |
| Tarjeta del asistente / acceso con ícono | oculta / visible | visible / oculto |
| Desborde horizontal de la página | no | no |

- A los 80 ms de entrar el mouse el menú todavía no se abre (espera de 120 ms). Con Tab se despliega con el foco en «Inicio» y con Shift+Tab, al salir, se contrae.
- Después de hacer clic en «Profesionales» y retirar el mouse, el menú se contrae.
- En el celular (390 px) el menú se abre completo con la tarjeta, como antes.
- El administrador usa el mismo componente y el mismo CSS. Se comprobó con la prueba automatizada (no hay cuenta de administrador de prueba).

## Segunda parte: sección actual y barra inferior (CP-250)

Pedido del PO durante la revisión (18-11-2026), ajustado en tres rondas:

| Pedido | Resultado |
|---|---|
| Quitar el recuadro de un tono diferente de la sección actual | La opción actual ya no tiene fondo. El nombre conserva su tono (azul oscuro y negrita). |
| El ícono de la sección actual, relleno | Lo que en el ícono de línea es blanco por dentro se pinta del color del ícono, y las líneas interiores quedan blancas. Por ejemplo, la casa queda rellena con la puerta recortada, el calendario con los días en blanco y el chat con sus líneas en blanco. |
| Íconos que son solo líneas (Gimnasios, Comidas, Perfil profesional, Reportes y Configuración) | Primero se probó el dibujo en blanco dentro de un círculo. El PO lo rechazó porque «se ven mal», así que conservan su dibujo con un trazo algo más grueso (2,3 en vez de 1,8). |
| Un tono más fuerte, igual para todos los íconos marcados | Todos los íconos de la sección actual, rellenos o de línea, van en un azul vivo nuevo, `--color-primario-vivo` #1a73e8. Las demás opciones siguen en el azul primario #0b4f80. El contraste es de 4,5:1 sobre blanco y 3,9:1 sobre el celeste. |
| Al pasar el mouse, que se marque el recuadro | Al pasar el mouse por cualquier opción, también la actual, aparece el recuadro celeste `--color-info-fondo` #e6f0f8, el mismo color de la antigua opción actual. Antes era un gris casi invisible (#f7fafc). |
| Barra inferior del celular | Solo íconos: el nombre queda para lectores de pantalla y la sección actual lleva el ícono marcado (relleno o de línea más gruesa) en el mismo azul vivo del resto de la app (al principio era naranjo; el PO pidió azul). Las columnas tienen el mismo ancho. |
| Ícono de «Chat IA» | Usa el mismo ícono que «Asistente IA» en el menú lateral (`chispa`, antes `chat`). |

Archivos de esta parte:
- `Icono.jsx`: versiones rellenas `ACTIVOS` y prop `activo`. Los íconos sin versión rellena reciben la clase `icono--activo-linea`.
- `MenuLateral.jsx` y `BarraInferior.jsx`: eligen el ícono según `isActive` de `NavLink`.
- `secciones.js`: ícono `chispa` en «Chat IA».
- `DisenoAplicacion.css`: sin píldora en la opción actual, azul vivo, recuadro celeste al pasar el mouse y barra solo con íconos.
- `index.css`: token `--color-primario-vivo` y clase `.icono__detalle`.
- `DisenoAplicacion.test.jsx`: comprueba el ícono relleno en el menú y en la barra, y el nombre oculto en la barra.

Comprobado en Edge con cuentas temporales, que se borraron al terminar:
- Escritorio: las 17 secciones del usuario y del profesional muestran su ícono marcado y ninguna tiene fondo; al pasar el mouse, el fondo es `rgb(230, 240, 248)`.
- Celular (390 px): la barra muestra 5 íconos de 76 px cada uno, con la sección actual rellena en Inicio, Chat IA y Comidas; en el menú abierto, Inicio va relleno y sin recuadro.
- Frontend 494/494, ESLint sin errores y `vite build` correcto.

### Tercera ronda: la lupa y el mismo criterio en toda la app

Pedido del PO: «la lupa de la vista más pequeña, haz lo mismo de comida: no la rellenes, ponle el tono más fuerte; y esto de los íconos tiene que ser lo mismo en toda la página, en los íconos del perfil, etc.».

- **Lupa de la barra inferior («Profesionales»):** deja de rellenarse. Queda de línea con el trazo más grueso, igual que Comidas.
- **Regla común:** `.icono--activo` (azul vivo) y `.icono--activo-linea` (trazo 2,3) quedan en `index.css` para toda la app, incluida la barra inferior.
- **Secciones del perfil (usuario y profesional):** la sección actual ya no tiene recuadro degradado ni barra azul al costado. Se reconoce por el ícono marcado y el nombre en negrita. Al pasar el mouse aparece el recuadro celeste.
- **Perfil en el celular (acordeón):** la sección abierta lleva el ícono marcado.
- **Pestañas de la ficha pública** (Información, Formación, Certificaciones y Lugar de atención) y **de la agenda** (Calendario y Reservas): la pestaña elegida lleva el ícono marcado y conserva su indicador de pestaña.
- **Conversación abierta en el asistente:** su ícono (chat o chincheta) va marcado.
- **Íconos rellenos nuevos:** `balanza`, `pin`, `birrete`, `info`, `documento` y `chincheta`. `objetivoMantener` queda de línea con el trazo más grueso.
- **Sin cambios:** los pasos con check del asistente de perfil y del registro ya marcan el paso con su propio indicador. La lista de Mensajes usa fotos, no íconos.

Comprobado en Edge con cuentas temporales, que se borraron al terminar:
- Las 8 secciones del perfil (usuario y profesional) y las 4 pestañas de la ficha pública muestran marcado solo el ícono de la opción actual.
- En la agenda, el ícono marcado pasa a la pestaña elegida.
- La lupa activa de la barra queda en `rgb(26, 115, 232)`, el azul vivo. Al principio era naranjo; el PO confirmó el azul en una cuarta ronda.
- Frontend 494/494, ESLint sin errores y `vite build` correcto. Se agregó en `PerfilProfesional.test.jsx` la comprobación del ícono marcado.

## Capturas

- `Menu_Lateral_Desplegable_2026-11-18_perfil_secciones.png` (perfil del usuario y del profesional, recuadro al pasar el mouse y acordeón del celular)
- `Menu_Lateral_Desplegable_2026-11-18_pestanas_ficha_y_agenda.png`
- `Menu_Lateral_Desplegable_2026-11-18_barra_lupa_profesionales.png`
- `Menu_Lateral_Desplegable_2026-11-18_seccion_actual_usuario.png` (riel en Inicio, Centros de salud, Gimnasios, Asistente IA, Comidas, Mis citas y Mensajes)
- `Menu_Lateral_Desplegable_2026-11-18_seccion_actual_profesional.png` (Clientes, Perfil profesional, Reportes y Configuración)
- `Menu_Lateral_Desplegable_2026-11-18_recuadro_al_pasar_el_mouse.png`
- `Menu_Lateral_Desplegable_2026-11-18_barra_inferior_solo_iconos.png`
- `Menu_Lateral_Desplegable_2026-11-18_usuario_contraido_1440.png`
- `Menu_Lateral_Desplegable_2026-11-18_usuario_desplegado_1440.png`
- `Menu_Lateral_Desplegable_2026-11-18_usuario_teclado_1440.png`
- `Menu_Lateral_Desplegable_2026-11-18_desplegado_sobre_profesionales_1440.png`
- `Menu_Lateral_Desplegable_2026-11-18_profesional_contraido_1440.png`
- `Menu_Lateral_Desplegable_2026-11-18_profesional_desplegado_1440.png`
- `Menu_Lateral_Desplegable_2026-11-18_celular_menu_abierto_390.png`

## Corrección de la revisión del PR #81 — 19-11-2026

Luis Méndez detectó que, al regresar desde el contenido con Shift+Tab, el acceso compacto al asistente recibía el foco y se ocultaba al desplegarse el menú. El teclado quedaba sobre un enlace oculto.

`MenuLateral.jsx` transfiere ese foco al enlace «Abrir chat» de la tarjeta mediante un efecto de disposición, después de mostrar la tarjeta y antes de pintar la pantalla. Se conserva la posición de desplazamiento. El recorrido normal del resto de las opciones no cambia.

Se agregó una prueba que sale del menú hacia el contenido, regresa con Shift+Tab, comprueba el foco en «Abrir chat», retrocede a «Mensajes», avanza de nuevo y activa el chat con Enter. La visibilidad de los dos accesos se reproduce en JSDOM; se simula `:focus-visible` para el acceso compacto porque ese entorno no lo reconoce al tabular hacia atrás.

- La prueba reproduce el fallo sobre el commit anterior `cfad2e6` y pasa con la corrección.
- Frontend: **495/495 pruebas**, 51 archivos aprobados; ESLint y compilación correctos.
- Esta ejecución no sustituye la revisión visual en navegador ni cierra globalmente E-1.14. Las capturas y verificaciones con API/MySQL de las secciones anteriores corresponden al 18-11-2026.
- SC-40 y CP-249/250 conservan su reserva: se actualizarán en las planillas después de integrar el PR #80.
