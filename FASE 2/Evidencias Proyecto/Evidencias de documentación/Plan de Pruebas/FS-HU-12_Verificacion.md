# Verificación básica de perfiles profesionales

Actualización del 10-10-2026 por Luis Méndez. FS-HU-12 permanece como avance técnico en revisión. La historia está prevista para Sprint 5, con prioridad baja y 3 puntos, si hay capacidad y con alcance final definido por el Product Owner. Esta entrega corrige el PR #14 sobre el PR #13 y continúa en el [PR #15](https://github.com/rodriacr/FitSearch/pull/15).

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

Verificación ejecutada el 10-10-2026 en la rama `codex/integrar-pr14-sobre-pr13`:

- Backend: `npm test -- --runInBand`, 19 suites y 166 pruebas aprobadas.
- Frontend: `npm test`, 18 archivos y 135 pruebas aprobadas.
- Backend y frontend: `npm run lint`, sin errores.
- Frontend: `npm run build`, compilación correcta.

Los tests de API usan modelos simulados y los del frontend usan respuestas simuladas. Después de esas pruebas se realizó un recorrido manual guiado con Luis contra MySQL local: verificación administrativa de la ficha 2, respuesta `{ id: 2, verificado: true }`, insignias confirmadas en perfil y listado, 401 sin sesión, 403 con usuario y con profesional, 400 con ID `abc` y 404 con ID `999999` («No encontramos este profesional»). Los resultados se registraron en Trello a partir de las capturas y confirmaciones de Luis. La prueba de intentar alterar `verificado` mediante edición propia sigue cubierta por tests automatizados; no se ejecutó manualmente en ese recorrido. Las pruebas no equivalen a aceptación por el PO.

## Documentación y pendientes

El DAS pasa de 1.15 a 1.16 e incorpora el flujo y la decisión D28. La planilla añade los ocho casos y recalcula los totales. El Product Backlog conserva «Planificada», Sprint 5, prioridad baja y 3 puntos; se actualiza el comentario de avance sin declarar aceptación.

Luis confirmó la revisión visual del DAS; se marcó completada en Trello. El renderizador automático no estaba disponible en el equipo.

Quedan pendientes la definición del PO de la pantalla administrativa y la provisión de cuentas, su implementación cuando se confirme el alcance y la aceptación del PO. Se detectó un bucle de navegación al ingresar como administrador y se corrigió con una página de acceso no disponible que permite cerrar sesión; no es una pantalla administrativa de verificación. No se habilita registro público como administrador. Trello: [FS-HU-12](https://trello.com/c/4CaN8UAs).
