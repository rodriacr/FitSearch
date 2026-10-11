# Revisión de Sprint Backlogs 2 y 3

Estado documental al 11-10-2026. Los hallazgos de las planillas proceden de la revisión del 10-10-2026 sobre el commit 5fcbf8e; las decisiones posteriores de los PR se distinguen más abajo. No se asignan responsables ni se aceptan historias sin acuerdo del equipo.

## Hallazgos iniciales

| Elemento | Evidencia revisada | Acción pendiente |
| --- | --- | --- |
| FS-HU-04, perfil profesional | Sprint 2, filas 10 a 12: «Por iniciar» y responsable por asignar. Product Backlog, fila 8: «Planificada». Trello indica integración de Luis, PR #12 fusionado y ajustes en PR #13, pero aceptación del PO pendiente. | Actualizar el avance técnico de las tareas y el responsable confirmado, conservando la aceptación pendiente. Corregir la tarjeta situada en «Terminado» si el PO aún no la ha aceptado. |
| FS-HU-13, disponibilidad | Sprint 2, filas 13 a 15: «Por iniciar». Product Backlog, fila 17: Sprint 2. Trello la replanifica al Sprint 3. No aparece en la planilla de Sprint 3. | Conciliar la replanificación: registrar el arrastre del Sprint 2 y las tareas de disponibilidad en Sprint 3, con responsable y estimación acordados. |
| FS-HU-06, mapa y lista | Sprint 3, filas 7 y 8: pendientes y sin responsable. El código muestra enlaces externos a Google Maps, pero no la alternancia de resultados entre mapa y lista. | Definir responsable y horas; implementar la vista y sus pruebas según el alcance acordado. |
| FS-HU-14, reservas | Sprint 3, filas 9 a 11: pendientes y sin responsable. No existen modelos de disponibilidad o reservas en el esquema Prisma ni rutas de esas funcionalidades; la agenda aparece como «Próximamente». | Resolver primero FS-HU-13. Después implementar API, pantalla y pruebas de reservas con mensaje obligatorio y protección contra reservas simultáneas del mismo bloque. |
| FS-HU-05 y FS-HU-21 a FS-HU-24 | Sprint 3, filas 6 y 12 a 20: implementadas, revisadas y fusionadas mediante PR #10; aceptación del PO pendiente. Trello coincide. | Mantenerlas en revisión hasta contar con aceptación explícita del PO. La aprobación técnica no equivale a aceptación del producto. |
| Revisión del PR #13 | Trello indica fusión y revisión posterior pendiente de Luis o Nicolás (DoD-04). La fila 21 del Sprint 3 documenta solo la revisión del PR #10. | Realizar y registrar una revisión específica del PR #13, sin reutilizar la aprobación del PR #10. |
| Horas y estimaciones | Sprint 2 tiene 26 tareas y solo una con horas: revisión de Luis, G30 = 2 y AR30 = 2. Sprint 3 tiene 16 tareas, todas sin estimaciones ni horas consumidas registradas. | Recoger las estimaciones y horas reales del equipo. No completar con ceros ni inventar duración de trabajo a partir de commits. |
| SMTP | Sprint 2, fila 18: configuración del correo a cargo de Rodrigo, «Por iniciar», mientras recuperación de contraseña figura aceptada. | Confirmar con Rodrigo si el envío real ya está configurado y probado. No inspeccionar ni publicar credenciales. |

Las fórmulas de seguimiento se conservan. No se observaron errores Excel en los valores almacenados de las dos planillas; esto no demuestra recálculo en Excel. Con estimaciones ausentes, los resultados de horas restantes no permiten evaluar el avance real.

## Correcciones de la revisión del PR 13

Se corrigieron la navegación administrativa sin bucles, el descarte del JWT anterior ante 409 en otra pestaña y la navegación por teclado en las pestañas profesionales. Los ajustes y diagramas fueron integrados mediante los PR #15 y #16. Las planillas locales registran FS-HU-04 implementada con aceptación pendiente y el arrastre de FS-HU-13 al Sprint 3, sin inventar estimaciones.

Luis indicó aproximadamente siete horas para el perfil profesional del PR #12. Se conserva como total retrospectivo, sin desglose por fecha/tarea y sin sustituir las dos horas de la revisión del PR #9/#10.

## Orden de trabajo pendiente

1. Confirmar aceptación de FS-HU-04 y las historias implementadas, así como responsables, estimaciones y horas del equipo.
2. Revisar el panel y las correcciones del PR #19, y sincronizar Drive después de fusionar.
3. Resolver disponibilidad FS-HU-13 antes de reservas FS-HU-14. FS-HU-06 puede avanzar cuando se asigne responsable.

## Estado posterior a la revisión

El PR #15 fue fusionado en main (`20c3ea3`) y el PR #16 también está fusionado (`d56e244`). Los ajustes de navegación, flujo 06 y DAS 1.17 de esa etapa fueron sincronizados con Drive. Por tanto, los pendientes de Drive descritos en los antecedentes no siguen abiertos como tareas de esa versión.

Rodrigo entregó el mockup y autorizó Dashboard, Profesionales, Verificaciones, Usuarios y Reportes, excluyendo Configuración y Contenido. El panel se implementó y continúa en revisión mediante el PR #19 contra main; sustituye al #17 cerrado sin fusionar tras eliminarse su rama base. Esta autorización no cambia por sí sola el Sprint 5 del Product Backlog ni declara la historia aceptada.

La revisión del 11-10-2026 corrige las fichas pendientes sin envío, la conservación de adjuntos vigentes, el bloqueo por versiones históricas y el cambio de especialidad. DAS local 1.19 y flujo 11 preparados. Drive y Miro conservan la publicación anterior hasta fusionar el PR, conforme a Rodrigo. Siguen pendientes las asignaciones, estimaciones, desglose de horas y aceptaciones del equipo; no se inventan datos ni se confunden con la revisión técnica.

## Fuentes y límites

- [Sprint Backlog 2](../Sprint%202/PMOInformatica_Plantilla_de_Sprint_Backlog.xlsx), hoja «Sprint Backlog», filas 6 a 31.
- [Sprint Backlog 3](PMOInformatica_Plantilla_de_Sprint_Backlog.xlsx), hoja «Sprint Backlog», filas 6 a 21.
- Product Backlog del repositorio, hoja «Historias de Usuario», filas 8, 10, 17 y 18.
- [Seguimiento de Sprint Backlog en Trello](https://trello.com/c/aTyNjPjl).
- [FS-HU-04](https://trello.com/c/NRpHvcg0), [FS-HU-06](https://trello.com/c/H2XV5ORS), [FS-HU-13](https://trello.com/c/Wie6El3W), [FS-HU-14](https://trello.com/c/xxQfnJVB) y [revisión del PR #13](https://trello.com/c/wjtYViPS).
- Código: esquema Prisma, rutas del backend, navegación y pantallas de agenda/mapas del frontend.

Las observaciones de las planillas corresponden a las filas y evidencias de la revisión inicial. La autorización administrativa posterior y sus correcciones no asignan disponibilidad, reservas ni mapa/lista a un integrante. Las aproximadamente siete horas de Luis son un total retrospectivo sin desglose diario.
