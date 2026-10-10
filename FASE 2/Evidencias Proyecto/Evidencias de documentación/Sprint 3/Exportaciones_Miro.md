# Diagramas y exportaciones de Miro

## Versión vigente: DAS 1.18 · panel administrativo · 10-10-2026

La ampliación del PR #17 incorpora Dashboard, Profesionales, Verificaciones, Usuarios y Reportes. Configuración y Contenido quedan fuera del alcance autorizado. Revisión/fusión del PR y aceptación de FS-HU-12 siguen pendientes del PO; la planificación del backlog conserva Sprint 5.

Se actualizaron 01–04, 07 y 08 y se añadió 11. El modelo completo comprende 15 tablas: 10 implementadas en esta rama y 5 previstas. Se documentan cuenta activa y versión de sesión, documentos privados y metadatos, RUT, historial y revisión concurrente, rechazo/reenvío/revocación y reportes con datos existentes. El flujo 06 se conserva sin cambios.

Los nuevos marcos se crearon en Miro conservando los anteriores como historial. Los PNG/SVG locales se renderizaron desde las fuentes actualizadas; no son exportaciones nativas de los nuevos marcos de Miro. Se contrastaron las entidades y conexiones del tablero mediante su SVG. Exportar los nuevos marcos desde Miro es opcional para conservar además su disposición visual nativa.

- [DAS 1.18 · 01 Casos de uso](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777496)
- [DAS 1.18 · 02 Clases del dominio](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777497)
- [DAS 1.18 · 03 DER completo: 15 tablas](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777498)
- [DAS 1.18 · 04 DER implementado: 10 tablas](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777499)
- [DAS 1.18 · 07 Vista de desarrollo](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777500)
- [DAS 1.18 · 08 Vista física](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777501)
- [DAS 1.18 · 11 Verificación administrativa](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686744777502)
- [06 Elección de perfil y asistente: se conserva](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989749)

El DAS incluye vistas resumidas de asociaciones de clases y relaciones de tablas para facilitar la lectura en Word. Los campos completos permanecen en el diccionario y en las fuentes integrales 02/04. Las adaptaciones de presentación se conservan en `Presentacion_DAS/`. Las fuentes y las imágenes actualizadas se sincronizan en la carpeta existente de Drive; se conservan los IDs de los archivos que ya existían.

Revisión final: DAS 1.18 exportado con Word, índice actualizado y 47 páginas revisadas. Sincronicé y comprobé el DAS, 20 archivos de los siete diagramas modificados/nuevos y las instrucciones en Drive; los tres archivos del flujo 06 conservan su versión. Los 24 archivos de la carpeta coinciden con los tamaños locales. La revisión y aceptación del PR #17 siguen pendientes.

## Historial: DAS 1.17 y exportaciones recibidas


Marcos actuales creados el 10-10-2026. Exportar cada marco como PNG a máxima resolución y enviar los archivos para contrastar su disposición con las imágenes locales. Conservar SVG si está disponible.

## Revisión de exportaciones recibidas

Se recibieron JPG de 01, 02, 03, 04 y 06. El 02 incluye rolConfirmado, Favorito y Resena; el 03 representa las catorce tablas del modelo completo; el 04 contiene las nueve implementadas; el 06 muestra el nuevo ingreso tras 409, reanudación y edición del perfil. El 01 tenía conexiones que atravesaban los casos de uso: se fijaron los extremos al lado derecho del actor y al izquierdo del caso, y se identificaron los actores con el estereotipo UML.

Los diagramas 07 y 08 no se pudieron exportar por errores del editor de Miro en etiquetas con punto y coma. Se sustituyeron por etiquetas entre comillas sin esos separadores, conservando el contenido. Ambos pasan parseo y renderizado local con Mermaid; se actualizaron los mismos widgets de Miro.

**Los siete marcos actuales ya están exportados y revisados en su contenido.** Se recibieron nuevamente 01, 07 y 08: el 01 ya no atraviesa los casos de uso con sus conexiones; 07 y 08 se renderizan sin el error del editor. El 07 muestra la conexión Prisma compartida, Open-Meteo y el endpoint administrativo sin pantalla; el 08 distingue las nueve tablas actuales, las cinco previstas y el despliegue objetivo. Antes de insertar exportaciones en el DAS se comprobará la legibilidad al tamaño final. La exportación de 06 tiene 707 píxeles de ancho; conviene conservar también PNG/SVG de mayor resolución si Miro permite obtenerlos.

- [Sprint 3 · 01 Casos de uso · 10-10-2026](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686731138738)
- [Sprint 3 · 02 Clases del dominio · 10-10-2026](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989746)
- [Sprint 3 · 03 DER completo · 14 tablas (9 actuales, 5 previstas) · 10-10-2026](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989747)
- [Sprint 3 · 04 DER implementado · 9 tablas · 10-10-2026](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989748)
- [Sprint 3 · 06 Elegir perfil y asistente · 409 y nuevo ingreso · 10-10-2026](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989749)
- [Sprint 3 · 07 Vista de desarrollo · componentes actuales · 10-10-2026](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989750)
- [Sprint 3 · 08 Vista física · estado local y despliegue objetivo · 10-10-2026](https://miro.com/app/board/uXjVHtdZChE=/?moveToWidget=3458764686730989751)

Los marcos anteriores se conservan como historial. La arquitectura futura no equivale a funciones implementadas.

El DAS 1.17 contiene las imágenes locales actualizadas de 06, 07 y 08. Se revisó su exportación con Microsoft Word: 44 páginas, índice actualizado, sin la página vacía previa al índice y D28 en una sola fila. La ilustración 6 se dividió en tres partes con etiquetas envueltas y participantes repetidos, conservando la numeración del flujo. El resumen, la vista física y la tabla de reutilización distinguen las capacidades actuales de las previstas. Las versiones integrales de Miro y las fuentes del repositorio se conservan; la división es una adaptación de presentación para el DAS.

Sincronicé y comprobé en Drive los siete diagramas actuales (20 archivos), el DAS 1.17 y las instrucciones de Miro. Conservé los enlaces existentes y las versiones históricas. La sincronización documental está completada.
