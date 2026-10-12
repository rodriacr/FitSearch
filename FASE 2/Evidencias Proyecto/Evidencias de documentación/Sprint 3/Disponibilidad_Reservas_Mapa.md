# Disponibilidad reservas y mapa del Sprint 3

Estado al 11-10-2026. Implementación en codex/completar-sprints-2-y-3, pendiente de revisión y fusión. Rodrigo autorizó completar los pendientes de los Sprints 2 y 3. La aceptación del PO, las horas y las estimaciones no se deducen de las pruebas.

## Disponibilidad FS-HU-13

El profesional publica, edita y elimina bloques desde Mi agenda o la pestaña Horarios de su perfil. Fecha y horas se interpretan en America/Santiago, sin convertir la hora publicada según el navegador. Se permiten bloques futuros dentro de 365 días, con inicio anterior al término. Los bloques contiguos son válidos; los superpuestos reciben 409.

Los bloques que alguna vez tuvieron reservas se conservan y no se editan ni eliminan, incluso si sus reservas se cancelaron. Así no cambia la fecha del historial. Para cambiar un bloque usado se publica otro. El usuario ve solamente bloques futuros libres de profesionales activos.

## Reservas FS-HU-14

Desde la ficha pública, el usuario selecciona un bloque y escribe un mensaje obligatorio de 10 a 500 caracteres. La reserva comienza pendiente. El profesional puede confirmar o cancelar; el usuario puede cancelar su propia reserva. Una cancelada no se reactiva. Los horarios pasados permanecen en el historial y no se modifican.

Una transacción con aislamiento ReadCommitted bloquea primero el profesional y después el bloque. La consulta de reservas activas se realiza bajo bloqueo, antes de insertar: dos solicitudes simultáneas producen una creación 201 y un conflicto 409. Cancelar libera el bloque. El mensaje y los participantes se devuelven solo en el listado privado del usuario o del profesional correspondiente; el listado público no los expone.

La pantalla pide confirmación antes de cancelar. Conserva el mensaje y vuelve a cargar la disponibilidad cuando otro usuario ocupa el bloque. Mis citas muestra las próximas reservas también en Inicio.

## Mapa FS-HU-06

La alternancia Lista/Mapa conserva filtros, búsqueda y página. El mapa muestra los resultados de la página actual; se puede paginar en ambas vistas. Usa Google Maps JavaScript API y AdvancedMarkerElement. Los marcadores abren el nombre, la especialidad y un enlace a la ficha. Las coordenadas corresponden a las fichas públicas; no se envía una posición privada adicional.

Falta configurar VITE_GOOGLE_MAPS_API_KEY en frontend/.env para validar el proveedor real. El SDK se carga únicamente al abrir Mapa. Sin clave o si falla, la lista de resultados continúa disponible y la pantalla ofrece reintentar. Las pruebas del mapa usan un SDK simulado; no acreditan la conexión real con Google.

Configuración oficial: https://developers.google.com/maps/documentation/javascript/get-api-key y https://developers.google.com/maps/documentation/javascript/advanced-markers/start. Restringir la clave por sitios web autorizados y por Maps JavaScript API. Para desarrollo, VITE_GOOGLE_MAPS_MAP_ID=DEMO_MAP_ID; para publicación, configurar el ID de mapa del proyecto. No se activaron cuentas ni facturación.

## SMTP pendiente del Sprint 2

La recuperación ya tiene su flujo y servicio, pero el .env local no contiene usuario ni contraseña SMTP. La dirección del destinatario no reemplaza estas credenciales. El comando npm run smtp:comprobar verifica la configuración y la conexión sin enviar mensajes; termina con código 2 si faltan datos.

Una vez configuradas las credenciales localmente, ejecutar desde backend:

```powershell
npm run smtp:comprobar
npm run smtp:comprobar -- --destinatario lmendezl1999@gmail.com --enviar-prueba
```

Luis autorizó ese correo de prueba. No se envió porque faltan las credenciales. No publicar los .env ni contraseñas en GitHub, Trello o documentación. La comprobación de entrega y la recuperación con un correo real siguen pendientes.

## API

Todas las rutas requieren sesión. Disponibilidad propia exige rol profesional; crear reservas exige usuario. Administrador no recibe acceso al mensaje privado por estas rutas.

| Método y ruta | Resultado |
| --- | --- |
| GET /api/disponibilidades | Horarios futuros propios |
| POST /api/disponibilidades | Publicar con fecha, horaInicio y horaFin |
| PUT /api/disponibilidades/:id | Editar un bloque propio sin reservas previas |
| DELETE /api/disponibilidades/:id | Eliminar un bloque propio sin reservas previas |
| GET /api/profesionales/:id/disponibilidades | Horarios públicos futuros y libres |
| GET /api/reservas | Reservas privadas del participante |
| POST /api/reservas | Reservar con disponibilidadId y mensaje |
| PATCH /api/reservas/:id | Confirmar o cancelar con estado |

La API no acepta usuarioId ni profesionalId del cliente para asignar propiedad. Devuelve 400 ante datos inválidos, 401 sin sesión, 403 ante un rol o propietario incorrecto, 404 si no existe el recurso y 409 ante superposición, ocupación o cambios incompatibles.

## Instalación y validación

Desde backend, ejecutar db:generate y db:migrate antes de iniciar. La migración 20261012010000_disponibilidad_reservas agrega disponibilidades y reservas, con claves foráneas y comprobaciones de horarios y estados. Son doce tablas de dominio implementadas de quince del modelo completo; conversaciones, mensajes y registro_comida siguen previstos.

Validación: 231 pruebas backend en 27 suites y 172 frontend en 23 archivos; lint de ambas capas y build frontend correctos. Se ejecutaron 25 comprobaciones con Express y MySQL reales, incluidas privacidad, superposición, reserva concurrente, confirmación, cancelación y conservación del historial. Las cuentas y bloques temporales de la prueba se eliminaron al finalizar. La evidencia está en Plan de Pruebas/Agenda_MySQL_2026-10-11.json.

Prueba manual recomendada: publicar dos bloques contiguos, rechazar uno superpuesto, reservar como usuario con mensaje, confirmar desde el profesional y cancelar desde el usuario. Comprobar que el bloque vuelve a estar libre y que el historial permanece. Abrir Mapa, alternar a Lista conservando filtros y repetir con clave real cuando esté disponible.

## Publicación y pendientes

Los PR 19 y 20 están fusionados. El PR 20 limita diez cargas por tipo y trámite y determina vigencia mediante IDs. La observación posterior sobre el reinicio reiterado de cuota al cambiar especialidad sigue pendiente: no forma parte de esta implementación de agenda.

Este cambio requiere revisión y fusión del nuevo PR antes de sincronizar el DAS y sus diagramas con Drive/Miro, conforme a Rodrigo. No se declara que los Sprints estén aceptados: faltan credenciales SMTP, la validación real de Maps, registro de horas/estimaciones y aceptación del PO.

## Comprobación de dependencias

Se corrigieron las alertas críticas y altas detectadas por npm audit. Backend: proxy-addr actualizado y nodemon sustituido por node --watch (Node 20.13 o superior); npm run dev conserva la recarga automática. Frontend: brace-expansion y source-map-js actualizados. Auditoría completa frontend sin vulnerabilidades, backend sin altas/críticas y producción backend sin vulnerabilidades. Quedan 19 alertas moderadas transitivas de herramientas Jest, derivadas de sprintf-js; no se aplicó la degradación a Jest 25 sugerida por --force. El lint, las 231/172 pruebas y el build se comprobaron después de actualizar.
