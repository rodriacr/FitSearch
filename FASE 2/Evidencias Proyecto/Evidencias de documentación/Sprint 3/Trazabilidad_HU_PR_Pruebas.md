# Trazabilidad: historias ↔ PR ↔ casos de prueba

Estado al 15-10-2026, sobre `main` (78b610d). Relaciona cada historia del Product Backlog con el código que la implementa (PR o commits), los casos de la planilla de pruebas y las pruebas automatizadas. Cubre el pendiente «Trazabilidad HU ↔ PR ↔ casos de prueba» de la tarjeta *Fase 2 | Verificar evidencias de ejecución y calidad* en Trello.

## Fuentes

- Product Backlog: `FASE 1/Evidencias Grupales/Material complementario/PMOInformatica_Plantilla_de_Product_Backlog.xlsx`, hoja «Historias de Usuario».
- Casos de prueba: `Plan de Pruebas/Planilla_Casos_de_Prueba_Template.xlsx`, hoja «Casos de Prueba» (80 casos: 77 aprobados y 3 sin ejecutar).
- PR y commits: historial de `main` en GitHub.
- Pruebas automatizadas: archivos `*.test.js(x)` de `Evidencias de sistema/backend/tests` y `frontend/src`.

## Matriz

| Historia | Sprint | Estado PB | Código (PR / commits) | Casos de prueba | Resultado | Pruebas automatizadas |
|---|---|---|---|---|---|---|
| FS-HU-01 Registro y login | 1 | Hecho | 695017e, 14e5031; revisión en PR #6 | CP-001, CP-004, CP-005, CP-007 | 4/4 OK | `auth.api`, `Registro`, `InicioSesion` |
| FS-HU-02 Datos básicos del perfil | 1 | Hecho | 695017e; tipo de cuenta en cbfef5f | CP-002, CP-003, CP-027, CP-028, CP-051 | 5/5 OK | `perfil.api`, `acceso.api`, `Perfil` |
| FS-HU-03 Listado de profesionales | 2 | Hecho | PR #8 | CP-029 a CP-035 | 7/7 OK | `profesional.api`, `Profesionales` |
| FS-HU-04 Perfil de profesional | 3 | Hecho | PR #12, PR #13 | CP-057, CP-058, CP-060 | 3/3 OK | `ficha.api`, `profesional.model`, `PerfilProfesional` |
| FS-HU-05 Buscar cerca de mí | 3 | Hecho | PR #10 | CP-044, CP-045 | 2/2 OK | `profesional.api`, `ubicacion`, `Profesionales` |
| FS-HU-06 Vista de mapa y lista | 3 | En proceso | PR #21, PR #22 | CP-076, CP-077, CP-078 | 2/3 OK, **CP-078 sin ejecutar** | `MapaProfesionales`, `mapas` |
| FS-HU-12 Verificar perfiles profesionales | 3 | Hecho | PR #13/#14 (integrados en PR #15), PR #19, PR #20 | CP-061 a CP-068 | 8/8 OK | `verificacion.api`, `verificacion.model`, `administrador.api`, `administrador.model`, `PanelAdministrador` |
| FS-HU-13 Disponibilidad del profesional | 3 | Hecho | PR #21, PR #22 | CP-069 a CP-071 | 3/3 OK | `agenda.api`, `agenda.service`, `Agenda`, `EspacioProfesional` |
| FS-HU-14 Reservar hora | 3 | Hecho | PR #21, PR #22 (defecto 26 en 4728310) | CP-072 a CP-075, CP-079, CP-080 | 6/6 OK | `agenda.api`, `agenda.service`, `Agenda` |
| FS-HU-15 Recuperar contraseña | 2 | Hecho | 389fa1f; SMTP real comprobado el 12-10-2026 | CP-011 a CP-013 | 3/3 OK | `acceso.api`, `validaciones`, `RecuperarContrasena` |
| FS-HU-16 Acceso con Google | 2 | Hecho | 389fa1f, cbfef5f | CP-024, CP-025, CP-026 | 1/3 OK, **CP-024 y CP-025 sin ejecutar** | `google.api`, `google.service`, `BotonGoogle` |
| FS-HU-17 Contraseña confirmada y Recordarme | 2 | Hecho | 389fa1f | CP-008 a CP-010 | 3/3 OK | `acceso.api`, `validaciones`, `Registro`, `InicioSesion` |
| FS-HU-18 Objetivos y estilo de vida | 2 | Hecho | 389fa1f | CP-018 | 1/1 OK | `perfil_asistente.api`, `Perfil` |
| FS-HU-19 Información de salud | 2 | Hecho | 389fa1f | CP-014 a CP-017 | 4/4 OK | `perfil_asistente.api`, `Perfil` |
| FS-HU-20 Portada pública | 2 | Hecho | 6d0bd43; rediseño en PR #10 | CP-006, CP-020 a CP-023, CP-036, CP-037 | 7/7 OK | `Portada` |
| FS-HU-21 Inicio personalizado y navegación | 3 | Hecho | PR #10 | CP-037 a CP-041, CP-049 | 6/6 OK | `Inicio`, `InicioSesion` |
| FS-HU-22 Búsqueda avanzada | 3 | Hecho | PR #10 | CP-042, CP-043 | 2/2 OK | `profesional.api`, `profesional.service`, `Profesionales` |
| FS-HU-23 Profesionales favoritos | 3 | Hecho | PR #10 | CP-046 | 1/1 OK | `favorito.api`, `Favoritos`, `FichaProfesional` |
| FS-HU-24 Calificar y reseñar | 3 | Hecho | PR #10 | CP-047, CP-048 | 2/2 OK | `resena.api`, `profesional.service`, `FichaProfesional` |
| FS-HU-07 a FS-HU-11 | 4 y 5 | Planificada | — | — | — | — |

### Casos sin historia asociada

Validan decisiones del Product Owner y requisitos transversales, no una historia puntual:

- CP-019: pantallas responsivas del Sprint 1.
- CP-050 a CP-056 y CP-059: elección de perfil, espacio del profesional y separación de roles (decisión D25, PR #13).

## Brechas

1. **CP-078** (mapa real de Google Maps sobre `main`) sin ejecutar: impide cerrar FS-HU-06.
2. **CP-024 y CP-025** (ingreso con Google) sin ejecutar: falta autorizar `http://localhost` y `http://localhost:5173` en el cliente OAuth.
3. FS-HU-16 figura «Hecho» en el Product Backlog con dos de sus tres casos pendientes. Conviene que el PO confirme si la aceptación queda condicionada a CP-024 y CP-025.
4. Las pruebas automatizadas de FS-HU-06, FS-HU-12 y FS-HU-14 no citan el código de la historia en el archivo; la relación se estableció por el nombre del archivo y por el PR.
5. FS-HU-01 y FS-HU-02 (Sprint 1) y FS-HU-15 a FS-HU-19 (Sprint 2) se integraron con commits directos a `main`, sin PR propio; la revisión de código quedó registrada en los PR #6 y #9.
