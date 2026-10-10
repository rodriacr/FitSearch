# Revisión de Sprint Backlogs 2 y 3

Revisión del 10-10-2026, sobre la copia local de FitSearch, commit `5fcbf8e`. Se contrastaron las dos planillas de Sprint Backlog, el Product Backlog, las tarjetas de Trello y el código. Es una revisión de seguimiento; no constituye aceptación de historias por el Product Owner ni una nueva asignación de trabajo.

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

## Orden de trabajo

1. Corregir el seguimiento de FS-HU-04 y conciliar la replanificación de FS-HU-13, manteniendo pendientes las aceptaciones que faltan.
2. Revisar específicamente el PR #13 y registrar hallazgos y resultado.
3. Confirmar responsables, estimaciones, horas reales y aceptación de las cinco historias ya implementadas.
4. Desarrollar FS-HU-13 antes de FS-HU-14. FS-HU-06 puede avanzar en paralelo si el equipo asigna un responsable.

FS-HU-12 (verificación) sigue prevista para Sprint 5 y en revisión del PO mediante PR #15. Las pruebas manuales de API y de insignias se registraron en su tarjeta; no se agrega esta historia al Sprint 3.

## Revisión inicial del PR #13

Se contrastó el merge `9c440a9` con su primer padre y se revisaron elección de rol, protección de rutas, sesión y lectura del perfil profesional. El PR cambia 96 archivos, incluidos documentos y evidencias; este apartado cubre esos flujos y no aprueba la totalidad del PR.

1. **Inicio del administrador: redirección a la misma ruta.** `inicioDe({ rol: 'administrador', rolConfirmado: true })` devuelve `/inicio`. Esa ruta exige rol `usuario`; `RutaProtegida` rechaza al administrador y lo redirige nuevamente a `/inicio`. Se comprobó la función real con Node y se contrastó con las rutas de App. Coincide con la pantalla blanca observada durante las pruebas manuales. Debe resolverse la navegación de este rol; no requiere asumir un panel administrativo completo.
2. **Recuperación de elección de perfil en otra pestaña: token anterior.** Ante 409 en `ElegirPerfil`, el cliente lee el usuario actualizado y conserva `sesion.token`. Si otra pestaña eligió «Profesional», el JWT anterior conserva el rol «usuario», aunque la interfaz navega al espacio profesional. `autenticar`/`autorizarRoles` usan el rol del JWT, por lo que la ficha propia puede recibir 403. El caso se identificó por análisis del código; falta reproducirlo y cubrirlo con una prueba antes de resolverlo y aprobar la revisión.

La confirmación de rol del modelo sí usa `updateMany` con la condición `rolConfirmado: false`, lo que evita que una segunda elección sobrescriba la primera. La selección de ficha propia incorpora el ID que necesita la vista pública.

Estos hallazgos motivaron las correcciones descritas a continuación; DoD-04 sigue en revisión.

## Correcciones realizadas después de la revisión

- Sprint 2: FS-HU-04 figura implementada por Luis, con ajustes de Rodrigo y aceptación del PO pendiente. Las tres tareas de disponibilidad registran su replanificación al Sprint 3, conservando su historial.
- Sprint 3: se agregaron las tres tareas de FS-HU-13 en las filas 22 a 24 y el seguimiento de la revisión posterior del PR #13 en la fila 25. No se asignó responsable de desarrollo ni se inventaron estimaciones.
- Product Backlog: FS-HU-04 pasa a «En Proceso», con nota de implementación y aceptación pendiente; FS-HU-13 pasa a Sprint 3 según la replanificación de Trello.
- Elección del perfil: el 409 de otra pestaña descarta la sesión anterior y solicita un nuevo ingreso. La prueba comprueba que no se consulta la ficha con el token viejo y que el nuevo ingreso usa el token del profesional.
- Administrador: la navegación va a una página de acceso no disponible con opción de cerrar sesión, evitando la redirección repetida a `/inicio`. No se implementa un panel administrativo ni se modifica el permiso de acceso a las páginas del usuario o profesional.

Validación: la prueba de regresión del conflicto entre pestañas falló antes de la corrección y pasó después. Frontend: 19 archivos, 138 pruebas aprobadas; lint y build sin errores. Después se amplió la misma prueba para verificar el nuevo ingreso, y las ocho pruebas de ElegirPerfil volvieron a pasar. Las planillas se recalcularon y renderizaron con la herramienta de hojas de cálculo; se verificó la conservación de fórmulas, valores y estilos fuera de las celdas autorizadas. No se verificó su recálculo en Excel.

Quedan pendientes la revisión completa del PR #13, las horas reales y estimaciones del equipo, la asignación de las tres funcionalidades del Sprint 3 y las aceptaciones del PO. Las copias de Drive no se actualizaron.

## Fuentes y límites

- [Sprint Backlog 2](../Sprint%202/PMOInformatica_Plantilla_de_Sprint_Backlog.xlsx), hoja «Sprint Backlog», filas 6 a 31.
- [Sprint Backlog 3](PMOInformatica_Plantilla_de_Sprint_Backlog.xlsx), hoja «Sprint Backlog», filas 6 a 21.
- Product Backlog del repositorio, hoja «Historias de Usuario», filas 8, 10, 17 y 18.
- [Seguimiento de Sprint Backlog en Trello](https://trello.com/c/aTyNjPjl).
- [FS-HU-04](https://trello.com/c/NRpHvcg0), [FS-HU-06](https://trello.com/c/H2XV5ORS), [FS-HU-13](https://trello.com/c/Wie6El3W), [FS-HU-14](https://trello.com/c/xxQfnJVB) y [revisión del PR #13](https://trello.com/c/wjtYViPS).
- Código: esquema Prisma, rutas del backend, navegación y pantallas de agenda/mapas del frontend.

Las copias de Drive no se descargaron ni modificaron. Las planillas locales se actualizaron después de esta revisión. Las asignaciones y la aceptación del PO se describen según la evidencia disponible, no como decisiones nuevas.
