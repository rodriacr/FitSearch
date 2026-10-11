# Auditoría de diagramas y DAS

## Actualización realizada · 10-10-2026

Desde main con el PR #15 fusionado (merge `20c3ea3`), se corrigieron 06, 07 y 08 y se incorporaron sus PNG al DAS 1.17. D25 y flujo 8 documentan el nuevo ingreso tras 409 y la excepción administrativa. Las proporciones de las tres imágenes se ajustaron a sus nuevos archivos. La validación actual es 166 pruebas backend y 144 frontend (19 suites/archivos por capa), lint correcto y build frontend correcto.

En Miro se crearon siete marcos del Sprint 3 (01–04, 06–08), conservando las versiones anteriores. Se distinguen las nueve tablas implementadas de las catorce del modelo completo; Docker/Nginx, Maps, IA y reservas se identifican como objetivos pendientes. La versión de cuatro pasos del ZIP describe solo el asistente del usuario; 06 conserva además la elección previa, el espacio profesional, la reanudación y la edición.

Los siete marcos actuales están exportados y revisados en su contenido. Sincronicé y comprobé en Drive los siete diagramas actuales (20 archivos), el DAS 1.17 y las instrucciones de Miro. Conservé los enlaces existentes y las versiones históricas. La sincronización documental está completada. Falta la revisión y fusión del PR #16.

Se exportó el DAS 1.17 con Microsoft Word y se revisaron las 44 páginas. Se eliminó la página vacía previa al índice, se actualizó la tabla de contenidos, se evitó la división de D28 y se presentó la secuencia 06 en tres partes legibles. Se aclararon los componentes previstos en resumen, modelo de datos, vista física y reutilización. No se amplió el alcance administrativo de FS-HU-12.

## Diagnóstico previo a los cambios

### Comprobación de exportaciones

Se contrastaron cinco JPG exportados de Miro (01, 02, 03, 04 y 06). El contenido de clases, datos y secuencia coincide con las actualizaciones. Se corrigió el recorrido de las asociaciones de actores en 01 para evitar que atravesaran los casos de uso. Los marcos 07/08 mostraban errores en el editor: se simplificaron las etiquetas y se comprobaron con parseo y renderizado local de Mermaid. Ambos widgets se actualizaron en Miro. Se recibieron después las nuevas exportaciones 01/07/08: desaparecen los errores de renderizado y las conexiones de actores ya no atraviesan los casos de uso. 07 conserva Prisma compartido, Open-Meteo y verificación administrativa parcial; 08 distingue estado local y despliegue previsto. Con estas tres imágenes quedan contrastados los siete marcos actuales. Las imágenes recibidas sirvieron para contrastar el contenido. El DAS conserva las imágenes locales de mayor resolución; su paginación se comprobó posteriormente con Word, y la secuencia 06 se adaptó en tres partes.

Revisión sobre el commit `53d773f` y el DAS v1.16. Los apartados siguientes conservan los hallazgos iniciales; las correcciones efectuadas se resumen arriba.

## Resultado

El diagrama 06 no es el único pendiente. Hay tres diagramas con correcciones necesarias: **06, 07 y 08**. Además, deben actualizarse ciertos textos del DAS y el inventario para Miro. Los diagramas del modelo completo y de funcionalidades futuras no deben confundirse con evidencias de implementación.

## Inventario y contraste

| Diagrama | Versión local utilizada o vigente | Resultado y acción |
| --- | --- | --- |
| 01 Casos de uso | Actualización Sprint 3; ilustración 1 del DAS | Incluye CU-04 para el profesional y CU-07/FS-HU-12 para verificación administrativa. Es un modelo del producto completo, no una lista de funciones terminadas. No se encontró un cambio estructural obligatorio por las correcciones del PR #15. Puede precisarse la elección de perfil en CU-01, pero no exige un diagrama nuevo. |
| 02 Clases | Actualización Sprint 3; ilustración 2 | Profesional ya contiene `verificado`; Usuario contiene `rolConfirmado`; aparecen favoritos y reseñas. Incluye entidades futuras. No requiere agregar un campo nuevo por FS-HU-12. Conviene indicar expresamente que representa el dominio completo. |
| 03 DER completo | Actualización Sprint 3; fuente para Miro | Contiene las 14 tablas del diseño completo, incluidas disponibilidad, reservas, conversaciones, mensajes y alimentación. Esas cinco tablas todavía no existen en el esquema Prisma actual. Puede mantenerse como modelo objetivo; debe identificarse como tal. No es la ilustración de las tablas implementadas del DAS. |
| 04 DER implementado | Actualización Sprint 3; ilustración 4 | Incluye las nueve tablas del esquema Prisma actual y `verificado` ya existe. No se encontró necesidad de cambiar su estructura por el endpoint de verificación. `_prisma_migrations` es interna y no entra en el conteo del dominio. |
| 05 Recuperación de contraseña | Actualización Sprint 2; ilustración 8 | El flujo coincide en lo esencial con recuperación, hash del código, envío asíncrono y actualización transaccional de contraseña. Los 60 minutos del diagrama son el valor por defecto configurable. No requiere cambios por el PR #15. |
| 06 Elegir perfil y asistente | Actualización Sprint 3; ilustración 6 | **Desactualizado:** ante 409 dice «Va a su Inicio con el aviso». El código descarta la sesión anterior y dirige a iniciar sesión nuevamente. Actualizar MMD, SVG, PNG e imagen incrustada en DAS; reflejarlo en el marco 06 de Miro cuando se sincronice. |
| 07 Vista de desarrollo | Solo hay versión de Actualización Sprint 2; ilustración 9 | **Desactualizado:** muestra únicamente rutas `/api/auth` y `/api/perfil`, páginas anteriores, servicios/modelos anteriores y «12 tablas». Omite elección de perfil, espacio profesional, directorio, favoritos, reseñas, clima y sus componentes. El texto del DAS ya menciona varios de ellos, pero la imagen no. Crear una versión del Sprint 3, conservando la del Sprint 2 como histórica; añadir la dependencia del clima hacia Open-Meteo y reflejar la verificación dentro del módulo profesional, sin inventar un módulo administrativo implementado. |
| 08 Vista física | Actualización Sprint 3; ilustración 10 | **Requiere aclaración:** incluye correctamente Open-Meteo, pero el esquema `fitsearch` dice «14 tablas ... migraciones Prisma» cuando Prisma implementa nueve tablas de dominio. Distinguir «9 implementadas; 14 previstas». Docker/Nginx, Claude y la integración de Maps representan arquitectura objetivo; `docker-compose.yml` todavía es un placeholder para FS-HU-11. La figura/texto debe identificar ese estado, sin presentar como desplegada toda la solución. |
| 09 Secuencia de reservas | Actualización Sprint 2; ilustración 7 | Es un diseño futuro para FS-HU-13/14; el DAS lo identifica expresamente como previsto. No hay implementación que permita declarar validadas las transacciones del dibujo. No necesita cambios por verificación; se ajustará al implementar disponibilidad y reservas. |
| 10 Estados de reserva | Actualización Sprint 2; ilustración 3 | Es el modelo previsto de FS-HU-14. No hay cambio de estados autorizado que obligue a redibujarlo. Mantenerlo como diseño futuro. |

La ilustración 5 del DAS (registro de comida mediante IA) también representa una función futura. Debe quedar claro ese estado, sin tratar su ausencia en el código como razón para desarrollar fuera del sprint asignado.

## Coherencia de las imágenes incrustadas

Se extrajo el contenido OOXML del DOCX sin modificarlo y se compararon los bytes de sus imágenes con los archivos PNG del repositorio mediante SHA-256. Esto permite identificar qué versión usa Word sin depender del nombre del archivo:

- Ilustración 1: PNG 01 de Sprint 3.
- Ilustración 2: PNG 02 de Sprint 3.
- Ilustración 3: PNG 10 de Sprint 2.
- Ilustración 4: PNG 04 de Sprint 3.
- Ilustración 6: PNG 06 de Sprint 3, con el 409 anterior.
- Ilustración 7: PNG 09 de Sprint 2.
- Ilustración 8: PNG 05 de Sprint 2.
- Ilustración 9: PNG 07 de Sprint 2, todavía antiguo.
- Ilustración 10: PNG 08 de Sprint 3, con 14 tablas.

Se inspeccionaron visualmente las imágenes incrustadas de casos de uso, elección de perfil, desarrollo, despliegue, registro de comida y estados de reserva. No se renderizó el DOCX completo ni se verificó su paginación. Esta revisión no certifica su maquetación.

## Textos del DAS que también requieren ajuste

1. **Autenticación y perfil / D25:** documentar el nuevo tratamiento del 409 y añadir la excepción del administrador: `/acceso-no-disponible`, con cierre de sesión, mientras no tiene espacio administrativo. Actualmente el texto general dice que cada rol va a su Inicio.
2. **Vista de desarrollo:** sustituir la ilustración 9 por la nueva versión 07. La tabla de módulos ya está más actualizada que su imagen.
3. **Vista física:** diferenciar despliegue objetivo y situación actual; aclarar 9 tablas implementadas y 14 del diseño completo. El párrafo actual habla de los tres contenedores como un despliegue existente, aunque compose solo tiene comentarios.
4. **Escenarios 4+1:** CU-08 conserva Sprint 2; el seguimiento replanificó FS-HU-13 al Sprint 3. Conservar el historial y reflejar el arrastre. CU-07 muestra `admin` como módulo objetivo, mientras la verificación actual está en rutas/controlador/servicio/modelo de profesional; distinguir ambos estados.
5. **Validación de verificación:** el DAS registra 135 pruebas frontend; el último resultado de la rama es 139. Conservar el resultado histórico y añadir la validación posterior y las pruebas manuales ya realizadas, con su alcance. No convertir pruebas con modelos simulados en pruebas reales de MySQL.
6. **Inventario de Miro:** las instrucciones de Sprint 3 enumeran 01–04, 06 y 08; falta incorporar la actualización de 07 y explicar qué versiones anteriores siguen vigentes. El número del diagrama no siempre coincide con el de la ilustración del DAS (07 → ilustración 9; 08 → ilustración 10).

El DAS ya contiene el flujo de FS-HU-12, la decisión D28, la respuesta mínima y los errores esperados, y declara pendiente la pantalla administrativa y la provisión de cuentas. No falta todo ese contenido. Una secuencia adicional de verificación sería una mejora opcional; no se encontró una instrucción que obligue a crearla para esta corrección.

## Orden de actualización

1. Corregir 06, preparar 07 del Sprint 3 y aclarar 08.
2. Exportar sus SVG/PNG y verificar la lectura de cada figura.
3. Sustituir las ilustraciones 6, 9 y 10 del DAS, actualizar sus textos y registrar la versión; renderizar e inspeccionar el documento cuando esté disponible el compilador de documentos.
4. Actualizar el inventario y después sincronizar los marcos 06, 07 y 08 de Miro y las copias de Drive. Confirmar las otras versiones vigentes al sincronizar.
5. Mantener pendientes la aceptación del PO y el alcance administrativo; esta actualización documental no asigna nuevas funcionalidades.

## Fuentes y límites

- DAS local: `Documento de Arquitectura (DAS)/Documento_Arquitectura_Sistema_DAS_.docx`.
- Diagramas: fuentes MMD/SVG y PNG de `Diagramas (Miro)/Actualización Sprint 2` y `Actualización Sprint 3`.
- Código: `frontend/src/pages/ElegirPerfil.jsx`, `services/navegacion.js`, `App.jsx`, `pages/AccesoNoDisponible.jsx`; esquema Prisma, rutas y modelos del backend; `docker-compose.yml`.
- Seguimiento previo: `Revision_Backlogs_2_y_3.md` y la replanificación ya registrada en Trello.

La primera revisión fue local. Después se contrastó el contenido remoto mediante las conexiones de Miro y Google Drive, como se detalla a continuación. No se modificaron diagramas, DOCX, planillas ni código durante esta auditoría.

## Contraste remoto de Miro y Drive — 10-10-2026

Se leyó el inventario del tablero [FitSearch Architecture](https://miro.com/app/board/uXjVHtdZChE=/), sus marcos de casos de uso, clases, datos implementados, asistente, desarrollo y despliegue, el DER completo y dos diagramas sueltos de clases/datos. La búsqueda del tablero no encontró `rolConfirmado`, `ElegirPerfil`, `Open-Meteo` ni `Sprint 3`. El campo `verificado` sí aparece en el modelo antiguo; su presencia no demuestra la actualización al Sprint 3. La lectura SVG informa elementos extranjeros omitidos; no se certificó la apariencia visual completa del tablero.

| Diagrama | Miro observado | Drive observado |
| --- | --- | --- |
| 01 Casos de uso | CU-01 todavía dice registrarse/iniciar/cerrar sesión; CU-03 buscar profesionales y establecimientos. Leyenda del Sprint 2. | Existen SVG y PNG del Sprint 3; las instrucciones piden actualizar esos dos textos en Miro. No se inspeccionaron sus PNG remotos. |
| 02 Clases | No incluye Favorito, Resena ni rolConfirmado en los diagramas de clases leídos. | La fuente MMD del Sprint 3 sí contiene los tres. |
| 03 DER completo | Fuente antigua de 12 tablas, sin favoritos/resenas ni rol_confirmado. | Existen MMD, SVG y PNG del Sprint 3; las instrucciones documentan el modelo nuevo. No se leyó esta fuente remota en esta revisión. |
| 04 DER implementado | Solo cinco tablas: roles, usuarios, perfiles_usuario, informacion_salud y tokens_recuperacion. El diagrama suelto leído también conserva esas cinco. | La fuente MMD del Sprint 3 contiene las nueve tablas y rol_confirmado, incluidos favoritos y resenas. |
| 06 Elección de perfil | Sigue siendo el asistente de cinco pasos con el tipo de cuenta dentro del asistente. | La fuente del Sprint 3 separa la elección y el asistente de cuatro pasos, pero ante 409 todavía dice «Va a su Inicio con el aviso». El código actual cierra sesión y vuelve a iniciar sesión. |
| 07 Desarrollo | Solo /api/auth y /api/perfil, módulos anteriores y «12 tablas». | Solo se encontró la versión del Sprint 2. Su SVG confirma las rutas anteriores y «12 tablas»; la carpeta del Sprint 3 no contiene una versión 07. |
| 08 Física | «12 tablas», sin Open-Meteo en el contenido consultado. | El SVG del Sprint 3 sí incluye Open-Meteo, pero dice «14 tablas ... migraciones Prisma». Debe distinguir nueve implementadas de catorce previstas y el despliegue objetivo. |

La carpeta de Drive se llama **FitSeach** (sin la segunda r), bajo capstone. Se recorrió su FASE 2 → Evidencias Proyecto → Evidencias de documentación; la búsqueda inicial por FitSearch no localizaba toda esa jerarquía. Se identificaron las carpetas [Diagramas (Miro)](https://drive.google.com/drive/folders/151aErMDlhAzn0FC-qckg0NuM90vvrYIo) y [Actualización Sprint 3](https://drive.google.com/drive/folders/1iciiu_xqJcdlT6iBovB8L1W0VmcYKKQo).

El [DAS de Drive](https://docs.google.com/document/d/1ZDYdzfxujsZvTHXRr9MaGNR5DsxBi2zq/edit) presenta **Versión 1.15**. El local presenta v1.16. El texto remoto leído no contiene D28 ni la documentación específica del endpoint nuevo que sí tiene el DAS local. No se compararon las imágenes incrustadas del DOCX remoto ni su paginación: esta diferencia de versión y texto ya confirma que falta sincronizarlo.

Las [instrucciones de Drive](https://drive.google.com/file/d/1GRwf25AgcksyM_YNdQ3jP_ztfGBgrLW3/view) siguen tituladas «DAS v1.15» y solicitan actualizar los marcos 01–04, 06 y 08. El tablero leído conserva sus versiones anteriores. Se debe preparar/corregir 06, 07 y 08 localmente y después sincronizar también 01–04 en Miro; actualizar el DAS remoto y el inventario. Conservar las versiones del Sprint 2 como históricas. No se publicaron cambios remotos durante esta comprobación.

## Comparación con los ZIP del MacBook — 10-10-2026

Comparé `Diagramas (Miro).zip` y `diagramas.zip`, aportados por Luis, con los archivos del repositorio. Conservé los originales y extraje las imágenes del segundo ZIP en una carpeta temporal de revisión.

**Diagramas (Miro).zip:** todas las imágenes PNG y los SVG generados por Mermaid coinciden byte por byte con los archivos locales correspondientes. Comparé también los MMD, Markdown y SVG de texto: al normalizar LF/CRLF, su contenido coincide. No hay una versión documental más reciente en este ZIP. `.DS_Store` es metadato de macOS, no un diagrama.

**diagramas.zip:** contiene once imágenes, con una mezcla de diagramas anteriores y una variante del asistente de cuatro pasos. Revisé visualmente las once imágenes en hojas de contacto y amplié casos de uso, clases y asistente. No debe sustituir en bloque la carpeta actual.

| Archivo del segundo ZIP | Hallazgo / tratamiento |
| --- | --- |
| Casos_de_Uso.png | Conserva CU-01/CU-03 anteriores y leyenda del Sprint 2; CU-02 solo nombra datos básicos. Usar la versión 01 del Sprint 3. La exportación muestra además una flecha entre SMTP y Google Identity Services que no corresponde a una dependencia de esos servicios; quitarla al revisar las conexiones del tablero. |
| DER_Tablas_Implementadas.png | Idéntico al PNG 04 del Sprint 2: cinco tablas. La versión actual es 04 del Sprint 3, con nueve tablas de dominio. |
| Vista_Datos_DER.jpg | Modelo completo anterior sin favoritos ni resenas ni rol_confirmado. Usar 03 del Sprint 3, identificado como modelo objetivo de catorce tablas. |
| Vista_Logica.png y Vista_Logica_Clases.jpg | Versiones anteriores sin Favorito, Resena ni rolConfirmado. Usar 02 del Sprint 3; conservar los archivos antiguos como históricos. |
| Vista_Desarrollo.png | Rutas /api/auth y /api/perfil y doce tablas; no incluye los módulos actuales. Preparar 07 del Sprint 3. |
| Vista_Fisica.png | Doce tablas y ausencia de Open-Meteo. Partir de 08 del Sprint 3 y corregir nueve implementadas/catorce previstas y estado del despliegue. |
| Vista_Procesos_ asistente de perfil de 4 pasos.png | Describe correctamente las cuatro etapas del usuario y conserva reanudación/edición, pero no incluye la elección previa del rol, el destino profesional ni el 409. Puede conservarse como detalle del asistente del usuario; no reemplaza la secuencia integral 06. Incorporar reanudación/edición al corregir la versión integral, o referenciar este subflujo expresamente. |
| Vista_Procesos_Recuperacion_Contraseña.png | Mantener el flujo de recuperación; no encontré un cambio requerido por el PR #15. |
| Vista_Procesos_ reserva de hora y reservas simultáneas.png | Diseño previsto; conservar con esa identificación y revisar al implementar FS-HU-13/14. |
| Vista_Procesos_Secuencia_Comida.jpg | Flujo previsto de alimentación, sin evidencia de implementación actual. Mantener como diseño futuro; ajustar al desarrollar esa funcionalidad. |

Las carpetas de Sprint 2 y Sprint 3 conservan entregas históricas. La versión vigente se elige por diagrama: 01–04, 06 y 08 del Sprint 3; 05, 09 y 10 conservan la versión del Sprint 2; 07 necesita una actualización. Los cuatro PNG de la raíz son versiones iniciales, no la colección vigente. El inventario debe explicitar esta selección y el estado de cada figura para evitar confundir fecha, ubicación o existencia de una exportación con una funcionalidad terminada.
