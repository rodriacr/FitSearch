# Verificación de perfiles profesionales

## Ampliación administrativa del 10-10-2026

Implementé el panel autorizado por Rodri (Dashboard, Profesionales, Verificaciones, Usuarios y Reportes) y las reglas cuya definición delegó. El contrato, instalación y decisiones están en [Panel_Administrador.md](../Sprint%203/Panel_Administrador.md). Esta entrega requiere la migración `20261010203000_panel_administrativo`; la ruta anterior de aprobación aplica ahora los requisitos documentales y registra historial. Para una ficha nueva, disponer solo de su ID ya no basta para aprobarla.

| Caso nuevo | Resultado comprobado |
| --- | --- |
| Documentos obligatorios o RUT ausentes | 409, sin aprobación |
| Solicitud con RUT válido / inválido | 200 / 400 |
| Archivo ejecutable, vacío o mayor de 5 MB | Se rechaza, sin archivo persistido |
| Descarga del dueño / administrador / otro profesional | 200 / 200 / 403 |
| Rechazo sin motivo / con motivo válido | 400 / 200; historial y motivo |
| Reenvío tras rechazo | Pendiente, conserva historial |
| Decisión sobre revisión anterior | 409, sin sobrescribir cambios |
| Aprobación documentada | 200; insignia persistida |
| Cambio de especialidad de perfil verificado | Retira verificación y vuelve a pendiente |
| Desactivación y reactivación | Los tokens anteriores permanecen inválidos; sesión nueva permitida |
| Login de cuenta desactivada, contraseña o Google | 403 |
| Desactivación de administrador | 409, sin cambios |

Validación: 202 pruebas backend en 25 suites, 152 frontend en 21 archivos, lint y build correctos. Ejecuté 17 comprobaciones contra MySQL local con datos temporales y limpieza final; las pruebas automatizadas también simulan modelos y API para cubrir errores y concurrencia. Revisé las cinco vistas en escritorio y móvil. La revisión y aceptación del PO siguen pendientes.

## Evidencia anterior del PR 15 y revisión del PR 16

Las secciones siguientes conservan el comportamiento y las pruebas de la entrega anterior al panel. No describen los nuevos requisitos documentales ni su migración.

Actualización del 10-10-2026. El avance técnico de FS-HU-12 fue aprobado y fusionado en el [PR #15](https://github.com/rodriacr/FitSearch/pull/15), que reemplazó al PR #14 sobre el PR #13. La historia permanece parcial y prevista para Sprint 5, con prioridad baja y 3 puntos, si hay capacidad y con alcance final definido por el Product Owner.

## Comportamiento implementado

`PATCH /api/profesionales/:id/verificar` requiere sesión y rol `administrador`. Valida el identificador y comprueba la existencia de una ficha asociada a un profesional con `modelo.existe(id)`. El modelo usa la conexión compartida de `models/prisma.js`, actualiza solo `verificado` y selecciona únicamente `id` y `verificado` para la respuesta. No requiere migraciones.

| Condición | Respuesta |
| --- | --- |
| Administrador y ficha existente | 200, `{ "id": 5, "verificado": true }` para el id 5 |
| Usuario o profesional | 403, sin modificar la ficha |
| Sin sesión | 401 |
| Identificador inválido | 400, antes de consultar datos |
| Ficha inexistente o cuenta que ya no es profesional | 404, «No encontramos este profesional» |

El profesional no puede verificarse mediante la edición de su ficha: el controlador excluye `verificado` y `usuarioId` del cuerpo enviado al modelo. La API permite leer el estado en la ficha propia. `PerfilProfesional` y `FichaProfesional` conservan las insignias del PR #13. `TarjetaProfesional` añade el ícono `escudo` y el texto «Verificado» en el listado y el Inicio solo cuando la API devuelve el estado aprobado. `ResumenPerfil` conserva la versión de main para el usuario.

## Casos y evidencia

La planilla de casos de prueba contiene CP-061 a CP-068: aprobación administrativa y respuesta mínima, denegación de usuario y profesional, ausencia de sesión, identificador inválido, ficha inexistente, exclusión de verificación desde la ficha propia e insignias en tarjetas y perfil profesional.

Verificación ejecutada el 10-10-2026 en `codex/actualizar-diagramas-y-revision`, desde main con el PR #15 fusionado:

- Backend: `npm test`, 19 suites y 166 pruebas aprobadas.
- Frontend: `npm test`, 19 archivos y 144 pruebas aprobadas. El PR #15 terminó con 139; esta revisión añade cinco pruebas de navegación.
- Backend y frontend: `npm run lint`, sin errores.
- Frontend: `npm run build`, compilación correcta.

Los tests de API usan modelos simulados y los del frontend usan respuestas simuladas. Probé contra MySQL local la verificación administrativa de la ficha 2: recibí `{ id: 2, verificado: true }` y comprobé las insignias en el perfil y el listado. También comprobé 401 sin sesión, 403 con usuario y con profesional, 400 con ID `abc` y 404 con ID `999999` («No encontramos este profesional»). La exclusión de `verificado` en la edición de la ficha propia está cubierta por pruebas automatizadas; no la probé manualmente. Estas pruebas no equivalen a la aceptación completa de la HU por el PO.

## Documentación y pendientes

El DAS 1.16 incorporó el flujo y la decisión D28. La revisión 1.17 actualiza D25, el flujo 8 y los diagramas 06, 07 y 08. La planilla contiene los ocho casos. El Product Backlog conserva «Planificada», Sprint 5, prioridad baja y 3 puntos; el avance técnico no declara completada la HU.

Quedan pendientes la definición del PO de la pantalla administrativa y la provisión de cuentas, su implementación cuando se confirme el alcance y la aceptación del PO. Se detectó un bucle de navegación al ingresar como administrador y se corrigió con una página de acceso no disponible que permite cerrar sesión; no es una pantalla administrativa de verificación. No se habilita registro público como administrador. Trello: [FS-HU-12](https://trello.com/c/4CaN8UAs).
