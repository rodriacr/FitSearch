# Aportes de Nicolás Silva al cierre del Sprint 3 — 15-10-2026

Registro del trabajo realizado el 15-10-2026 (día 9 del Sprint 3), con su evidencia y lo que queda pendiente de decisión del Product Owner. Las horas no se registran aquí: se informan al equipo para el Sprint Backlog 3.

## 1. Trazabilidad historias ↔ PR ↔ casos de prueba

- `Trazabilidad_HU_PR_Pruebas.md` relaciona las 19 historias implementadas con sus PR o commits, los 80 casos de la planilla y las pruebas automatizadas.
- Brechas detectadas: CP-078 (FS-HU-06) y CP-024/CP-025 (FS-HU-16) sin ejecutar; FS-HU-16 figura «Hecho» en el Product Backlog con 2 de 3 casos pendientes.
- PR #25, pendiente de revisión del Product Owner.

## 2. Revisión de requisitos de la entrega (AVA)

- Anuncio del docente del 13-10-2026: reflexiones y guías en el Git hasta el domingo 18-10; revisión de los repositorios el lunes 19-10 en la mañana.
- Comparación del repositorio con `Estructura_Evidencias_GIT.png`. Faltan en `main`: `FASE 2/Evidencias Proyecto/Presentación Proyecto.pptx` y `FASE 2/Evidencias Grupales/PLANILLA DE EVALUACION AVANCE FASE 2.xlsx`. En la Fase 1, `1.4_APT122_FormativaFase1` y dos `1.1` están en `.pdf` y la estructura los pide en `.docx`.

## 3. Sincronización de Trello y Drive con GitHub

- Trello: 36 casillas marcadas según la evidencia del repositorio (FS-HU-04, 05, 12, 13, 14, 21 a 24, cierre del Sprint 2, Sprint Backlog, PR #13, diario 2.1, capturas del Sprint 3 y Guía 2.4); tarjetas «PR #13» y «Sprint Backlog» movidas a Terminado; la tarjeta del Drive indica «actualizada al 15-10-2026». Quedaron sin marcar los pendientes reales.
- Drive: comparación de los 206 archivos de documentación de `main` con la carpeta FitSeach (contenido por SHA-256). Solo la Guía 2.4 estaba desactualizada; se subió como nueva versión del mismo archivo (conserva su enlace) y se verificó idéntica a `main`.
- Se evaluó automatizar la sincronización con GitHub Actions (PR #26); el equipo prefirió actualizarla a pedido y con aviso previo, por lo que el PR se cerró sin fusionar y se borraron sus ramas.

## 4. FS-HU-06: mapa con MapLibre GL JS y OpenFreeMap (propuesta SC-18)

Rama local `feat/mapa-maplibre` (2 commits), aún no publicada en GitHub a la espera de la decisión del Product Owner.

- Motivo: CP-078 estaba bloqueado porque Google Maps exige una clave con facturación. MapLibre GL JS 5.24.0 con las teselas de OpenFreeMap (datos de OpenStreetMap) es gratuito y no requiere clave, cuenta ni tarjeta.
- Alcance: `frontend/src/services/mapas.js`, `MapaProfesionales.jsx`, sus pruebas, `frontend/.env.example` y el README. El SDK se carga solo al abrir la vista Mapa, con versión fija y huella SRI. Se conservan el plazo de 15 s, los mensajes, el reintento, la lista accesible y el comportamiento al ocultar el mapa.
- Defectos encontrados y corregidos durante la prueba con el proveedor real: encuadrar antes del evento `load` dejaba el mapa en otra zona; la ventana del marcador se cerraba al abrirse (se usa `setPopup`).
- Verificación en un entorno de desarrollo con Node y MySQL 8.4 en un contenedor Docker, sobre `main` + el cambio: frontend 189/189, backend 233/233, lint y build correctos; aplicación completa con MySQL real, 12 profesionales de demostración en el mapa, ventana al hacer clic y enlace «Ver ficha». Se corrigió además la simulación de falla en 3 pruebas (incompatibilidad con Vitest 5).
- Pendiente del Product Owner: aprobar la SC-18, registrarla en la Matriz de Control de Cambio y la decisión de diseño en el DAS; con eso CP-078 queda ejecutable y FS-HU-06 puede cerrarse.

## 5. FS-HU-16: acceso con Google

- Cliente OAuth «FitSearch local» (Google Cloud de Nicolás Silva): orígenes autorizados `http://localhost`, `http://localhost:5173`, `http://localhost:5174` y el del entorno de pruebas; marca completa; 5 usuarios de prueba (cuentas Duoc y Gmail de los tres integrantes).
- En el entorno de pruebas, con el ID del cliente configurado, el botón oficial de Google carga sin errores. Falta el primer ingreso real para ejecutar CP-024 y CP-025.
- Para que cualquier persona pueda ingresar (publicar la app) Google exige página principal y política de privacidad públicas: tarea propuesta para el Sprint 4.
- El ID de cliente no es secreto: `35904243963-tltmtnidrkt5j94rgfi55g2ggo31kvui.apps.googleusercontent.com`. Decisión pendiente del Product Owner: si se adopta como el cliente del equipo.

## 6. Pendientes para cerrar el Sprint 3 (domingo 18-10-2026)

| Pendiente | Responsable sugerido |
|---|---|
| Decidir la SC-18 y, si se aprueba, revisar y fusionar el PR del mapa; ejecutar CP-078 y aceptar FS-HU-06 | Rodrigo Cárcamo Rojas (PO) |
| Revisar y fusionar el PR #25 | Rodrigo Cárcamo Rojas (PO) |
| Documento validando Sprint 3 | Equipo (borrador preparado por Nicolás Silva con los datos que entregue cada integrante) |
| Retrospectiva del Sprint 3 | Los tres integrantes |
| Horas de los días 9 y 10 y burndown final | Cada integrante informa; registro en el Sprint Backlog 3 |
| Marcos de Miro al DAS 1.22 | Luis Méndez |
| Presentación del proyecto y planilla de evaluación del avance en la estructura del Git | Equipo |
