# Revisión técnica y preparación del cierre del Sprint 5

Fecha de corte: 16-11-2026. El período planificado del Sprint 5 es del 02 al 22-11-2026. Este corte no declara una reunión ya celebrada ni reemplaza la aceptación del Product Owner.

## Observaciones del equipo y resolución

| Revisión | Observación | Corrección y evidencia |
| --- | --- | --- |
| #61, Luis | Marcador con dirección anterior si falla la búsqueda; inestabilidad de Portada | 85f7d48, integrado con #61. Pruebas de FormularioFicha y Portada. CP-230 a CP-232, defectos 47 y 48. |
| #61, Nicolás y Luis | Un punto de Argentina se aceptaba como Chile; respuesta anterior sobrescribía el último movimiento | #67, b433d58, integrado. Validación country_code y región; descarte de la consulta anterior y uso de las coordenadas consultadas. CP-238/239 y defectos 53/54, además de los casos de perfil ya registrados. |
| #62, Nicolás | Fotos de autores en reseñas, id de cuenta en enlaces y carga de imágenes por reserva | #70 fusionado, 66e9c4d. CP-233 a CP-236; defectos 49 a 51 corregidos. |
| #63, Luis y Nicolás | Estado congelado y cancelación abierta después de comenzar | Luis corrigió el reloj de la agenda en 2aedfe0; #71 (22c3b277) completa Mis citas y la cancelación abierta. CP-237 con reservas pendientes y confirmadas y CP-248 para los períodos. |
| #66, Luis | Tab y Shift+Tab permiten salir de los filtros y accionar el fondo | #72 fusionado, a33f13a4. Fondo inerte, foco circular y retorno al botón. CP-241 y defecto 55. |

Los cambios se verificaron juntos antes de publicar. No se requirieron migraciones nuevas. Las revisiones pendientes de los integrantes no se consideran aprobadas por el hecho de haber integrado el código.

## Verificaciones y documentación

- Jest: 59 suites, 628 pruebas aprobadas.
- Vitest: 51 archivos, 489 pruebas aprobadas. Se mantienen advertencias de act en pruebas anteriores; no hubo fallos.
- ESLint correcto en frontend y backend; compilación del frontend correcta.
- MySQL real: plan de alimentación 75/75 y concurrencia de especialidades 7/7, con datos temporales propios eliminados. Agenda 55/55 y mejoras de agenda, clientes, reportes y chat 86/86: 223 verificaciones MySQL en total. Los avisos SMTP de agenda fueron rechazados por el entorno; no se acredita entrega de correo.
- Planilla: 248 casos continuos (CP-001 a CP-248), 247 aprobados y CP-025 pendiente. CP-024 aprobado por reporte manual del PO de registro con Google real e inicio de sesión.
- Se completaron CP-151 y CP-157 a CP-159; CP-233 a CP-237; CP-240 a CP-248. Los casos de evidencias históricas lo indican expresamente.
- Docker: se recuperaron las versiones de Nicolás desde Drive. El caso de servicios externos pasó de CP-178 a CP-240; el CP-178 de carga conserva su identidad. No se repitió Docker en esta sesión; WSL no permite enumerar distribuciones desde este entorno.
- Registro: 55 defectos, todos en estado Corregido tras el registro de esta consolidación. Esto no elimina mejoras futuras ni equivale a certificación de ausencia de errores.
- DAS 1.35 y Plan de Pruebas 1.0.3. Se conserva la Guía 2.4 enviada.
- Miro: se sincronizan 02, 03, 04, 07, 08 y 16 desde las fuentes actuales; el encabezado corresponde al DAS 1.35. Se preservan los marcos históricos.

## Revisión del sprint lista para validar

| Entregable | Resultado demostrado | Validación pendiente |
| --- | --- | --- |
| Clientes y Reportes (FS-HU-27/28) | Integrados, criterios y casos existentes; correcciones de fotos integradas | Aceptación del PO |
| Experiencia/configuración (FS-HU-29) y Mensajes (FS-HU-31) | Integrados y probados según sus evidencias | Aceptación del PO |
| Plan de alimentación (FS-HU-32) | Implementación y evidencia disponibles; 75 comprobaciones MySQL reales | Criterios confirmados (SC-39); aceptación formal de la entrega pendiente |
| SC-35 a SC-38 | Solicitudes registradas; implementaciones y correcciones integradas | Confirmación del PO sobre el resultado final |
| Planilla, Registro, DAS y Plan de Pruebas | Consolidados con trazabilidad | Revisión visual final de documentos Word/Excel en su aplicación y subida manual a Drive |
| Sprint Backlog y burndown | Se preservan estimaciones y gráfico existentes | Horas reales por día o reconstrucción documentada autorizada |

## Criterios de FS-HU-32 confirmados por el PO — SC-39

Texto confirmado: «Como usuario, necesito elegir un plan de alimentación según mi meta, guardar planes personalizados y definir una meta de peso, para organizar mi alimentación y seguir mi objetivo sin perder el historial».

1. Con el perfil completo, «Según tu meta» calcula calorías y macronutrientes a partir del objetivo vigente; con perfil incompleto explica qué falta y no muestra cantidades ficticias.
2. Se pueden guardar hasta diez planes personalizados con nombre y porcentajes que sumen 100; elegir, editar y eliminar únicamente planes propios. Si se elimina el elegido, se vuelve al plan de la meta.
3. Un cambio rige desde el día correspondiente; los días anteriores conservan el reparto aplicable a su fecha.
4. Se puede guardar, ajustar y quitar una meta de peso con ritmo semanal; se rechazan objetivos incompatibles con el perfil o su dirección y se explica el motivo.
5. La pantalla muestra el plan vigente y el progreso hacia la meta de peso; la orientación no sustituye la atención profesional.

Estado: criterios confirmados expresamente por Rodrigo Cárcamo Rojas y registrados como SC-39 en la Matriz. Se actualizaron las dos historias oficiales y el enunciado del Product Backlog. La confirmación no se extiende por inferencia a la aceptación de las entregas.

## Retrospectiva: aportes recibidos y validación pendiente

Hechos para conversar: las observaciones de revisión detectaron fallos de ubicación, privacidad, reloj y foco; la integración fue anterior al cierre de algunos registros; hubo colisión de un ID entre Docker y carga y diferencias entre Drive y GitHub.

Acciones propuestas: un único responsable de edición de archivos Office; reservar IDs antes de usarlos; comprobar observaciones de todos los PR antes del cierre; mantener una matriz PR → corrección → prueba → documento; separar integración de código de aceptación del PO.

16-11-2026: se incorporaron los comentarios íntegros de Luis Méndez y Nicolás Silva en Plantilla_Resumen_Reunion_Retrospectiva.docx de esta carpeta. Luis destaca el trabajo en Docker, base de datos y asistente y relata el problema de usuarios no visibles en Docker, que considera solucionado. Nicolás destaca las correcciones y señala las diferencias documentales y las dos pruebas de Google pendientes. Ambos proponen reforzar las pruebas; Nicolás añade organización, documentación y registro de horas.

Rodrigo aprobó su aporte sobre comunicación, compromiso, cumplimiento de fechas, autonomía e iniciativa; ya está incorporado junto con los de Luis y Nicolás. Quedan pendientes la validación de acuerdos, responsables, plazos y horas. No se infiere una reunión ni la aceptación de las entregas.

## Mejoras de seguimiento

Se conservan como mejoras pendientes de decisión: límite de la cola y caché de 404 de Nominatim; protección de cambios sin guardar al cambiar de sección; confirmación del alcance público de la biografía; unificar etiquetas de estados; aclarar si Reservas del día debe incluir canceladas. Las pruebas de períodos y de la hora exacta ya se cubren en el PR #71.

## Condiciones que faltan para declarar el cierre formal

1. Aceptación o rechazo expreso de las entregas por el PO. Los criterios de FS-HU-32 ya están confirmados (SC-39).
2. Validación de horas por día y acuerdos del equipo; los tres aportes de retrospectiva están recibidos. Actualizar el burndown sin presentar estimaciones como mediciones ni consumir fechas futuras.
3. CP-025 con Google real y cuenta previamente registrada con contraseña, o excepción expresamente aceptada por el PO. CP-024 ya fue reportado por él como aprobado. Completar las comprobaciones estándar de QA que no tengan evidencia suficiente.
4. Validar visualmente los documentos editados y subir a Drive los archivos de la entrega preparada, reemplazando los existentes para conservar sus IDs.

No se marca el Sprint 5 como cerrado mientras estas condiciones sigan pendientes.

## Seguimiento de QA y horas — comprobación adicional del 16-11-2026

QA estándar: 21 OK, 11 NA y 24 pendientes. Se ejecutaron 33 comprobaciones nuevas de fechas, gramos, precio, texto y formatos reales, todas aprobadas. No se declara terminada la revisión visual del sistema. La carga histórica conserva la limitación del login a 50 conexiones.

Se comprobó visualmente la retrospectiva en Word: sus cuatro páginas se abren, las tablas y aportes son visibles; el estado del registro queda en una cuarta página breve. Falta revisar los demás Word/Excel.

Se corrigió el seguimiento del Sprint Backlog a DAS 1.35/Miro sincronizado. La asignación inicial de FS-HU-25 a Luis se conserva como línea base, pero se explicita que Rodrigo entregó el código y las pruebas de #47. Una propuesta de reconstrucción de horas se prepara fuera de los documentos oficiales; falta validación del equipo antes de volcar Cons./Rest. y el burndown.

La lista breve de pendientes no sustituye las 34 tareas originales: se preparó Manual Técnico/Manual_Tecnico_General.md para revisión del equipo/PO, completando el contenido que no cubría el manual Docker. La revisión posterior #31/#32 sigue sin cierre acreditado y debe contrastarse antes de declarar todas las tareas terminadas. Las revisiones de #70–#75 no tienen aún aprobación independiente registrada en GitHub al corte consultado.

Guía para ejecutar las 24 comprobaciones residuales, Google real y revisión independiente: Plan de Pruebas/QA_Revision_Manual_Pendiente.md. La guía es una preparación de pruebas, no una ejecución acreditada.

### Cambios concurrentes posteriores

Durante esta comprobación main avanzó de bf3a857 a 4c26358 con #76 (bienvenida al iniciar sesión) y #77 (informe final 2.6). Las verificaciones de 489 pruebas frontend aquí documentadas corresponden a la versión local anterior; #77 informa 494 sobre la nueva versión. El informe declara terminado el Sprint 5, mientras la aceptación del PO, horas, pruebas y cierre de los documentos de seguimiento continúan pendientes de evidencia expresa en esta revisión. Hace falta conciliar esa declaración antes de formalizar el cierre. Se preservan ambos PR y el informe del usuario; no se modifica ni se considera una autorización automática del PO por el solo texto de un commit.

## Confirmaciones del PO y estado posterior

Fuente: Confirmaciones_PO_2026-11-16.md. Se registraron la retrospectiva aprobada, SC-39 e historias oficiales y la prueba de registro Google (CP-024). El PO pedirá las revisiones independientes después; continúan pendientes. La validación se reúne en Documento_validando_Sprint_5.docx, con estado en curso. La propuesta revisada de horas es Rodrigo 47, Luis 24 y Nicolás 21 (92 h), pendiente de confirmar las duraciones y días añadidos de Luis. No se cargaron como horas reales.

Las versiones anteriores del PR #78 ya se comprobaron en Drive. Esta actualización necesita nuevos reemplazos manuales en Drive; no se confunde la entrega anterior con esta. La revisión visual previa de cuatro páginas de retrospectiva corresponde a la versión anterior a incorporar el aporte de Rodrigo; las versiones modificadas requieren nueva revisión visual.
