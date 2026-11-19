# QA estándar: revisión residual al 16-11-2026

Estado: 21 OK, 11 NA y **24 pendientes**. Esta guía prepara la ejecución; ninguna fila de esta lista se registra como aprobada. Resultado y justificación vigentes: `QA_Estandar_2026-11-16.json`. Validadores/formatos adicionales: 33 comprobaciones aprobadas en `QA_Comprobaciones_2026-11-16.json`.

Ejecutar sobre la versión integrada, anotando commit, navegador, tamaño de ventana, rol, pasos, resultado y evidencia sin datos privados. Usar cuentas y datos de prueba propios. Revisar escritorio (1280 px) y celular (360 y 375 px). Las pruebas automatizadas previas sirven de apoyo, pero no sustituyen la inspección visual global.

| ID | Comprobación concreta y evidencia requerida |
|---|---|
| E-1.1 | Recorrer avisos de éxito, error, carga y confirmación en acceso, perfiles, agenda, comidas, chat y administración. Registrar los mensajes que no incluyan icono y resolver su aplicabilidad; no generalizar desde un solo componente. |
| E-1.2 | Revisar que cada acción tenga etiqueta o nombre accesible que describa su efecto, incluidos botones que solo muestran iconos. |
| E-1.3 | Abrir fichas desde profesionales, centros y gimnasios; historial de cliente y páginas secundarias. Volver debe recuperar el contexto correcto. |
| E-1.4 | Revisar orden, tamaño y separación de acciones principales/secundarias en los tres tamaños y roles. |
| E-1.6 | Crear, editar y eliminar con permisos válidos; comprobar habilitación, espera durante guardado y bloqueo de acciones ajenas. |
| E-1.10 | El cierre actual termina sesión y muestra una despedida posterior. La plantilla exige Aceptar/Cancelar antes de salir: falta decidir con el PO si corresponde cambiar el flujo o justificar una excepción. No confundir despedida con confirmación previa. |
| E-1.13 | Recorrer todas las pantallas y sus estados vacíos/errores; registrar faltas de ortografía con ruta y captura. |
| E-1.14 | Recorrer solo con Tab/Shift+Tab y Escape: navegación, formularios, filtros, calendario, foto, confirmaciones y despedida. Comprobar foco visible, orden y retorno al disparador. |
| E-1.15 | Comparar jerarquía de títulos, texto, ayudas, campos y errores entre módulos; distinguir tamaños por función de inconsistencias. |
| E-1.16 | Probar nombres, direcciones, títulos y mensajes largos; no deben cortar contenido necesario, superponer controles ni generar desborde horizontal. |
| E-2.2 | En fichas, historial y reportes, comprobar que consultar no modifica datos y que un rol sin permiso no accede a edición. |
| E-2.4 | Comprobar RUT con/sin puntos y dígito verificador, precio referencial y fechas en entrada/presentación. Los formatos numéricos ya comprobados no cierran por sí solos la revisión de RUT. |
| E-2.5 | Recorrer límites de nombre, correo, descripción, dirección, reseña, chat, formación y planes: mínimo, máximo y máximo+1; revisar UI y respuesta de API. |
| E-2.6 | Introducir texto alfanumérico válido en nombre de plan, dirección, descripción y mensajes; comprobar que se guarda y se lee sin alterar el significado. |
| E-2.15 | En entorno de pruebas aislado: revisar ausencia/configuración inválida de Google, correo y asistente y fallos de red de mapa/direcciones/clima. Restaurar la configuración al terminar. No cambiar las credenciales compartidas ni tomar el modo simulado como integración real. |
| E-2.16 | Revisar que etiquetas, instrucciones, estados y errores indiquen qué ocurrió y qué puede hacer la persona. |
| E-2.17 | Revisar ortografía de validaciones, correos de muestra y contenido del sistema, además del recorrido de E-1.13. |
| E-3.1 | Registrar navegador/SO/resolución y coexistencia con API/MySQL; recorrer la aplicación local y el despliegue Docker previsto para la demostración. |
| E-3.4 | Recorrer acciones de guardar, cancelar, eliminar, navegar, filtrar, reservar, confirmar, enviar y cerrar sesión. Verificar su efecto y el mensaje, sin tomar el clic como resultado. |
| E-3.11 | En perfil de prueba, vaciar nombre y RUT; cambiar de sección sin guardar y volver. Registrar si se conserva, descarta o advierte; guardar debe validar los obligatorios. No vaciar datos de personas reales. |
| E-3.12 | Quitar un carácter del nombre/RUT y navegar; comprobar validación y comportamiento de cambios sin guardar. Registrar si el nombre restante sigue siendo válido. |
| E-3.15 | Repetición literal de E-3.12 en la plantilla: enlazar la misma evidencia cuando se ejecute, sin inventar una segunda ejecución. |
| E-4.1 | Revisar formato de paneles Reportes profesional/administrador: períodos, ejes, cifras, estados sin datos y adaptación a celular. |
| E-4.3 | Comprobar generación/actualización de reportes al cambiar período y datos; identificar si «emisión» se refiere al panel. Si exige un archivo exportado, confirmar aplicabilidad porque el alcance actual no ofrece un informe con folio. |

## Google real: casos separados

- **CP-024:** cuenta de Google que todavía no existe en FitSearch; se crea una sola cuenta sin contraseña, con sesión, y se abre la elección de tipo de cuenta.
- **CP-025:** correo ya registrado con contraseña; Google se vincula a esa cuenta, conserva su rol y no crea un duplicado.

Actualización del PO: reportó que pudo registrar la cuenta con Google e iniciar sesión; CP-024 queda aprobado con evidencia testimonial. CP-025 permanece pendiente porque requiere un correo previamente registrado con contraseña.

El PO realiza la interacción con su cuenta en el navegador. Registrar únicamente resultado, fecha, entorno y evidencia sin credenciales. «Google ya funciona» no confirma que ambos escenarios hayan sido ejecutados.

## Revisión independiente

Otro integrante debe comprobar las correcciones #67 y #70–#72 y la documentación posterior. Al corte consultado, #70–#75 no tienen una aprobación independiente registrada. Referencias: privacidad/carga de fotos (CP-233–236), reloj/cancelación (CP-237), períodos (CP-248), ubicación (CP-238/239) y foco de filtros (CP-241). La integración o la aprobación de un commit anterior no acredita esta revisión final.
