# FitSearch

Plataforma web responsiva que conecta a personas que buscan mejorar su salud, condición física o alimentación con profesionales y establecimientos de salud, deporte y bienestar, mediante búsqueda geolocalizada, un asistente de inteligencia artificial y un gestor de alimentación por lenguaje natural.

Proyecto Capstone (PTY4614) — Duoc UC, Escuela de Informática y Telecomunicaciones, sección 003D, sede Melipilla.

> **Estado (12-10-2026):** Fase 2 — Sprints 1 y 2 cerrados (acceso a la cuenta, perfil completo, portada y listado de profesionales). Sprint 3 en curso, con el código en `main`: Inicio con sesión, búsqueda avanzada y por cercanía, favoritos y reseñas, elección de perfil y espacio del profesional, verificación y panel del administrador, y agenda, reservas y mapa. Las historias del Sprint 3 que siguen en revisión esperan la aceptación del Product Owner.

## Equipo

| Integrante | Rol Scrum | Foco de desarrollo |
|---|---|---|
| Rodrigo Cárcamo Rojas | Product Owner | Backend, datos e IA |
| Luis Méndez | Scrum Master | Backend, base de datos y frontend |
| Nicolás Silva | Desarrollador | Frontend |

## Alcance del MVP

- Registro, inicio de sesión y perfiles de usuario y profesional (roles: usuario, profesional, administrador).
- Directorio de profesionales y establecimientos con búsqueda geolocalizada, vista de mapa y lista.
- Asistente de orientación en salud y bienestar (Groq, plan gratuito) que recomienda categorías de profesionales.
- Gestor de alimentación: registro de comidas en lenguaje natural y seguimiento de calorías y macronutrientes.
- Reserva básica de horas: el profesional publica su disponibilidad y el usuario reserva indicando brevemente lo que necesita.
- Despliegue con contenedores Docker.

Fuera de alcance este semestre: pagos, integración con calendarios externos, verificación avanzada de profesionales e integración con wearables. El asistente entrega orientación general y no reemplaza la atención de un profesional de salud.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite, JavaScript, CSS mobile-first |
| Backend | Node.js + Express (API REST) |
| Base de datos | MySQL 8 + Prisma (ORM y migraciones) |
| Autenticación | JWT + bcryptjs, control de acceso por roles |
| Mapas | MapLibre GL JS con teselas de OpenFreeMap (datos de OpenStreetMap), sin clave ni facturación |
| IA | Groq (plan gratuito, API compatible con OpenAI) con un cliente genérico configurable por `.env` |
| Contenedores | Docker + docker-compose (frontend con Nginx, backend, MySQL) |
| Pruebas | Backend: Jest + Supertest · Frontend: Vitest + Testing Library · Postman/Insomnia |

## Estructura del repositorio

El repositorio sigue la estructura exigida por la asignatura: el código de la aplicación está en `FASE 2/Evidencias Proyecto/Evidencias de sistema/` y todo el resto de la documentación del proyecto en `FASE 2/Evidencias Proyecto/Evidencias de documentación/`.

```
FitSearch/
├── FASE 1/                # Evidencias de la Fase 1 (individuales y grupales)
├── FASE 2/                # Evidencias de la Fase 2
│   ├── Evidencias Individuales/
│   ├── Evidencias Grupales/        # Guía 2.4 y planillas de evaluación
│   └── Evidencias Proyecto/
│       ├── Evidencias de documentación/   # DAS, DoD, diagramas, sprints (con sus capturas), plan de pruebas y control (matriz de cambios y EDT)
│       └── Evidencias de sistema/         # Código de la aplicación
│           ├── frontend/          # React + Vite
│           │   └── src/
│           │       ├── pages/         # Pantallas de la aplicación (y sus pruebas)
│           │       ├── components/    # Componentes de UI reutilizables (perfil/, diseno/ y profesionales/)
│           │       ├── context/       # Estado global de la sesión
│           │       ├── services/      # Cliente de la API REST y validaciones
│           │       ├── assets/        # Logos de FitSearch
│           │       └── tests/         # Configuración y utilidades de pruebas
│           ├── backend/           # Node.js + Express
│           │   ├── prisma/            # Esquema, migraciones, datos iniciales y script de creación de la BD
│           │   ├── src/
│           │   │   ├── routes/        # Definición de endpoints
│           │   │   ├── controllers/   # Orquestan las peticiones
│           │   │   ├── services/      # Lógica de negocio, correo e IA
│           │   │   ├── models/        # Acceso a datos (Prisma / MySQL)
│           │   │   ├── middlewares/   # Autenticación, validación y manejo de errores
│           │   │   ├── validators/    # Reglas de validación por endpoint
│           │   │   └── config/        # Variables de entorno
│           │   └── tests/             # Pruebas unitarias y de integración
│           ├── shared/            # Reglas y catálogos comunes a frontend y backend (reglas.json)
│           └── docker-compose.yml
├── FASE 3/                # Evidencias de la Fase 3
└── README.md
```

En los pasos siguientes, las rutas `backend/` y `frontend/` son relativas a la carpeta del código. Para llegar a ella desde la raíz del repositorio:

```bash
cd "FASE 2/Evidencias Proyecto/Evidencias de sistema"
```

## Requisitos previos

- Node.js 20 LTS o superior y npm
- MySQL 8
- Docker y Docker Compose (para el despliegue en contenedores)
- Clave gratuita de Groq para el asistente IA (opcional: sin ella responde en modo de prueba). El mapa no requiere clave

## Instalación (ambiente local)

### 1. Clonar el repositorio

```bash
git clone https://github.com/rodriacr/FitSearch.git
cd FitSearch
```

### 2. Base de datos

1. Abrir `backend/prisma/crear_base_datos.sql` y reemplazar `CAMBIAR_CONTRASENA` (2 veces) por una contraseña propia. No guardar el archivo con la contraseña real.
2. Ejecutar el script con un usuario administrador de MySQL (por ejemplo, `root` en MySQL Workbench). Crea las bases `fitsearch` y `fitsearch_shadow` y el usuario `fitsearch`.

> Si `npm run db:migrate` muestra `Unknown authentication plugin 'sha256_password'`, el usuario quedó con un método de autenticación que Prisma no admite. Ejecutar en Workbench (con `root`): `ALTER USER 'fitsearch'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'tu_contraseña';` y reintentar.

### 3. Variables de entorno del backend

```bash
cd backend
cp .env.example .env
```

Completar `backend/.env`:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de la API (por defecto 3000) |
| `DATABASE_URL` | Conexión a MySQL con el usuario y la contraseña del paso 2 |
| `SHADOW_DATABASE_URL` | Base auxiliar que Prisma usa para crear migraciones (solo desarrollo) |
| `JWT_SECRET` | Cadena larga y aleatoria para firmar los tokens |
| `JWT_EXPIRES_IN` | Duración de la sesión (por defecto `8h`) |
| `BCRYPT_COST` | Costo del hash de contraseñas (por defecto 10) |
| `JWT_REMEMBER_EXPIRES_IN` | Duración de la sesión cuando se marca "Recordarme" (por defecto `30d`) |
| `FRONTEND_URL` | Dirección del frontend usada en el enlace de recuperación (por defecto `http://localhost:5173`) |
| `RECOVERY_TOKEN_MINUTES` | Vigencia del enlace de recuperación de contraseña (por defecto 60) |
| `SMTP_HOST`, `SMTP_PORT` | Servidor de correo (por defecto Gmail: `smtp.gmail.com`, 465) |
| `SMTP_USUARIO`, `SMTP_CONTRASENA` | Cuenta que envía los correos y su contraseña de aplicación de Google |
| `SMTP_REMITENTE` | Remitente visible, por ejemplo `"FitSearch <correo@gmail.com>"` |
| `IA_API_KEY` | Clave del proveedor del asistente IA (Groq: crearla gratis en https://console.groq.com/keys) |
| `IA_URL_BASE`, `IA_MODELO` | Proveedor compatible con OpenAI (por defecto Groq: `https://api.groq.com/openai/v1` y `openai/gpt-oss-120b`) |
| `IA_MENSAJES_POR_DIA` | Mensajes que cada usuario puede enviar al asistente por día (por defecto 30) |

Mientras `SMTP_CONTRASENA` esté vacía o diga `CAMBIAR`, el enlace de recuperación de contraseña se muestra en la consola del backend en lugar de enviarse por correo (útil en desarrollo). Mientras `IA_API_KEY` esté vacía, el asistente IA responde en modo de prueba, sin consultar al proveedor.

Opcional en `frontend/.env`: `VITE_GOOGLE_CLIENT_ID` con el ID de cliente OAuth de Google. Sin esta variable, el botón "Continuar con Google" aparece desactivado.

### 4. Backend

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`db:migrate` crea las tablas a partir de las migraciones versionadas y `db:seed` carga los roles (usuario, profesional, administrador). La API queda disponible en `http://localhost:3000/api` (verificación: `GET /api/salud`).

### 5. Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`. Vite reenvía las llamadas a `/api` hacia el backend.

> Si cambias `shared/reglas.json` con `npm run dev` en marcha, reinicia el frontend: Vite puede seguir usando la versión anterior del archivo.

## API disponible (Sprints 1 a 4)

### Navegación de la aplicación

Sin sesión, la raíz (`/`) muestra la portada pública. Después de registrarse (con correo o con Google), la cuenta elige una sola vez cómo usar FitSearch en `/elegir-perfil`: como usuario sigue al asistente de perfil de 4 pasos (`/perfil`) y como profesional entra a su propio espacio (`/profesional/inicio`). Cambiar el tipo de cuenta después lo hace un administrador.

- **Usuario:** el logo y la raíz llevan al Inicio (`/inicio`), que reúne accesos rápidos, objetivo, progreso, próximas citas y profesionales destacados (FS-HU-21). Desde ahí accede a Profesionales, Favoritos, Mis citas (`/citas`), Asistente IA (`/asistente`, FS-HU-07) y su perfil.
- **Profesional:** Inicio con clima, tareas y resumen semanal (`/profesional/inicio`), Mi agenda (`/profesional/agenda`), su perfil con la ficha pública (`/profesional/perfil`) y la vista previa de cómo lo ven los usuarios (`/profesional/perfil/publico`). Clientes, Mensajes, Reportes y Configuración aparecen como «Próximamente».
- **Administrador:** panel en `/admin` (Dashboard, Profesionales, Verificaciones, Usuarios y Reportes; FS-HU-12).

Las pantallas con sesión comparten encabezado (logo, notificaciones y menú de la cuenta), menú lateral y, en celular, barra inferior. Si se abre una ruta protegida sin sesión, después de iniciar sesión se vuelve a ella con sus filtros.

### Directorio de profesionales — FS-HU-03, FS-HU-05 y FS-HU-22 a FS-HU-24

La ruta `/profesionales` busca por texto (nombre, especialidad o palabra clave) y filtra por especialidad, comuna, distancia máxima, calificación mínima y modalidad, con orden por nombre, cercanía, calificación o cantidad de reseñas. Los filtros quedan en la dirección de la página para compartir la búsqueda; la ubicación del navegador se redondea a unos 100 m, se usa solo en memoria y nunca va en la dirección. Cada profesional tiene su ficha (`/profesionales/:id`) con reseñas, y la página `/favoritos` lista los guardados.

Después de actualizar esta rama, ejecutar en backend `npm run db:generate` y `npm run db:migrate`. Para cargar **datos ficticios opcionales** (12 profesionales con comuna y modalidad, y reseñas de demostración), ejecutar primero `npm run db:seed` y luego `npm run db:seed:profesionales` (solo desarrollo; no crea credenciales de acceso).

Detalle de la entrega original del listado: [FS-HU-03 — Listado de profesionales](FASE%202/Evidencias%20Proyecto/Evidencias%20de%20documentaci%C3%B3n/Sprint%202/FS-HU-03_Listado_profesionales.md).

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/salud` | No | Estado de la API |
| POST | `/api/auth/registro` | No | Crea la cuenta (siempre con el rol `usuario`) y devuelve el token; el tipo de cuenta se elige después en `/elegir-perfil` |
| POST | `/api/auth/login` | No | Inicia sesión y devuelve el token (`recordar: true` para una sesión de 30 días) |
| POST | `/api/auth/google` | No | Inicia sesión o crea la cuenta con el token de Google Identity Services (exige correo verificado; FS-HU-16) |
| POST | `/api/auth/recuperar` | No | Envía el enlace para restablecer la contraseña (responde lo mismo exista o no el correo) |
| POST | `/api/auth/restablecer` | No | Cambia la contraseña con el código del enlace (vence en 60 minutos y sirve una vez) |
| POST | `/api/auth/logout` | Bearer JWT | Cierra la sesión |
| GET | `/api/perfil` | Bearer JWT | Datos del usuario, perfil completo, pasos pendientes del asistente y requerimiento calórico estimado |
| PUT | `/api/perfil/tipo-cuenta` | Bearer JWT | Guarda el tipo de cuenta elegido en `/elegir-perfil` (`usuario` o `profesional`) y devuelve un token nuevo con el rol confirmado; responde 409 si ya se había elegido (FS-HU-02) |
| PUT | `/api/perfil` | Bearer JWT (rol usuario) | Guarda peso, altura, edad, sexo y actividad física |
| PUT | `/api/perfil/objetivos` | Bearer JWT (rol usuario) | Guarda objetivo principal, comidas al día y horas de sueño (FS-HU-18) |
| PUT | `/api/perfil/salud` | Bearer JWT (rol usuario) | Guarda condiciones médicas, medicamentos y alergias (FS-HU-19; solo valores de `shared/reglas.json`) |
| GET | `/api/profesionales/mi-ficha` | Bearer JWT (rol profesional) | Ficha propia del profesional (FS-HU-04) |
| PUT | `/api/profesionales/mi-ficha` | Bearer JWT (rol profesional) | Crea o actualiza la ficha propia: especialidad, comuna, dirección de atención (obligatoria salvo que atienda solo online), modalidad, ubicación dentro de Chile y descripción (FS-HU-04, SC-24) |
| GET | `/api/clima` | Bearer JWT (rol profesional) | Clima actual para el Inicio del profesional (Open-Meteo, con las coordenadas de su ficha y caché de 30 minutos) |
| GET | `/api/profesionales` | Bearer JWT (rol usuario) | Listado paginado (12 por página) con `q`, `especialidad`, `comuna`, `modalidad`, `calificacionMin`, `distanciaKm` (2, 5, 10 o 25, requiere `lat` y `lng`), `orden` (`nombre`, `cercania`, `calificacion`, `resenas`), `pagina` y `limite`; devuelve `profesionales`, `total`, `totalPaginas` y `hayMas` |
| GET | `/api/profesionales/filtros` | Bearer JWT (rol usuario) | Especialidades y comunas disponibles para los filtros |
| GET | `/api/profesionales/:id` | Bearer JWT | Ficha pública, resumen de calificaciones, reseña propia y si la persona puede calificar |
| PATCH | `/api/profesionales/:id/verificar` | Bearer JWT (rol administrador) | Compatibilidad FS-HU-12: requiere solicitud pendiente, cuenta activa, RUT e identidad/título actuales; responde `{ id, verificado: true }`, 409 sin requisitos o 404 si no existe |
| GET | `/api/profesionales/:id/resenas` | Bearer JWT | Reseñas paginadas (5 por página) con el autor abreviado |
| PUT | `/api/profesionales/:id/resenas` | Bearer JWT (rol usuario) | Crea o reemplaza la reseña propia: `puntaje` de 1 a 5 y `comentario` opcional de 10 a 500 caracteres (FS-HU-24) |
| DELETE | `/api/profesionales/:id/resenas` | Bearer JWT (rol usuario) | Elimina la reseña propia |
| GET | `/api/favoritos` | Bearer JWT (rol usuario) | Profesionales favoritos del usuario (FS-HU-23) |
| PUT | `/api/favoritos/:profesionalId` | Bearer JWT (rol usuario) | Guarda un favorito (idempotente) |
| DELETE | `/api/favoritos/:profesionalId` | Bearer JWT (rol usuario) | Quita un favorito (idempotente) |

Las rutas de la agenda y las reservas (`/api/disponibilidades`, `/api/profesionales/:id/disponibilidades` y `/api/reservas`) se describen en su sección, más abajo. Las del panel del administrador están bajo `/api/administrador` y las solicitudes y documentos de verificación del profesional bajo `/api/verificaciones` (FS-HU-12).

Los errores se responden como `{ "error": "mensaje", "detalles": { "campo": "mensaje" } }`.

### Verificación básica de profesionales — FS-HU-12

Implementada en el Sprint 3 (PR #15, #19 y #20). Estaba prevista para el Sprint 5 «si hay capacidad»; el 12-10-2026 el Product Owner la reubicó en el Sprint 3, y falta su aceptación. El endpoint solo admite administradores con sesión; usuario y profesional reciben 403, sin sesión responde 401 y un id inválido devuelve 400. La ficha propia no permite modificar `verificado`. Las fichas aprobadas muestran el ícono de escudo y «Verificado» en el listado, el Inicio y el perfil profesional.

El panel autorizado incluye Dashboard, Profesionales, Verificaciones, Usuarios y Reportes; Configuración y Contenido quedan fuera. Las cuentas administrativas se preparan con `npm run admin:promover -- --correo correo-de-la-cuenta --confirmar`. Una ficha comienza en `sin_solicitud`; solo el envío explícito con documentos vigentes entra a Pendientes. Rechazo, revocación y cambio de especialidad exigen documentos y solicitud nuevos. Los PR #19 y #20 están fusionados; la aceptación de la historia sigue pendiente del PO. Se admiten diez cargas por tipo y trámite y la vigencia se determina por IDs. Detalle y evidencia: [FS-HU-12 — Verificación](FASE%202/Evidencias%20Proyecto/Evidencias%20de%20documentaci%C3%B3n/Plan%20de%20Pruebas/FS-HU-12_Verificacion.md).

### Disponibilidad, reservas y mapa — FS-HU-13, FS-HU-14 y FS-HU-06

El profesional publica bloques en Mi agenda; el usuario reserva desde la ficha con un mensaje de 10 a 500 caracteres. El profesional confirma y cualquiera de los participantes cancela. Se conserva el historial. La API protege la propiedad y una transacción impide dos reservas activas simultáneas para el mismo bloque. Además, cada usuario puede tener como máximo una reserva activa (pendiente o confirmada) de un horario futuro con cada profesional; si no, la API responde 409 con `detalles.motivo = limite_por_profesional` (decisión del PO del 12-10-2026). Las fechas y horas se interpretan en `America/Santiago`.

Antes de iniciar el backend, ejecutar `npm run db:generate` y `npm run db:migrate`. La nueva migración agrega `disponibilidades` y `reservas` sin borrar datos existentes. Las rutas principales son `/api/disponibilidades`, `/api/profesionales/:id/disponibilidades` y `/api/reservas`.

Lista/Mapa conserva filtros y página. El mapa usa MapLibre GL JS y las teselas de OpenFreeMap, que no requieren clave; si no carga, continúa disponible el listado. Para SMTP, configurar las credenciales en `backend/.env` y ejecutar `npm run smtp:comprobar`. La dirección de un destinatario no sustituye las credenciales del remitente.

Los PR #21 y #22 están fusionados en `main` (12-10-2026); el PO aceptó FS-HU-13 y FS-HU-14 el 12-10-2026 y FS-HU-06 sigue pendiente de CP-078. El 12-10-2026 se comprobaron el envío real de correos (SMTP) y Google Maps real con una Demo Key, sin facturación; desde el 15-10-2026 el mapa usa MapLibre GL JS con OpenFreeMap, sin clave (SC-18, PR #27). [Alcance, API, instalación y pruebas](FASE%202/Evidencias%20Proyecto/Evidencias%20de%20documentaci%C3%B3n/Sprint%203/Disponibilidad_Reservas_Mapa.md). El DAS (versión 1.25) y sus diagramas están en el Drive del equipo.

### Asistente IA — FS-HU-07

La usuaria o el usuario conversa en `/asistente` con un asistente de orientación general en salud, alimentación y actividad física: historial de conversaciones (las fijadas primero), sugerencias, acciones rápidas y un aviso permanente de que no reemplaza a un profesional. Ante señales de emergencia la API agrega a la respuesta el número del SAMU (131) o el *4141, sin depender del modelo. Cada cuenta puede enviar 30 mensajes por día (hora de Chile); borrar una conversación no devuelve el cupo.

El proveedor es Groq, con plan gratuito y una API compatible con OpenAI (DAS 1.25, D33, SC-25). El backend usa un cliente genérico, así que otro proveedor compatible se configura solo con `IA_URL_BASE`, `IA_MODELO` e `IA_API_KEY`. Al proveedor solo viajan las instrucciones del asistente y los últimos 10 mensajes de la conversación: nunca el perfil ni la información de salud. Sin `IA_API_KEY` el asistente responde en modo de prueba.

Antes de iniciar el backend, ejecutar `npm run db:generate` y `npm run db:migrate`: la migración `20261021120000_asistente_ia` agrega `conversaciones`, `mensajes` y `uso_asistente` sin borrar datos existentes.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/asistente/estado` | Bearer JWT (rol usuario) | Modo (`ia` o `simulado`), límite diario y mensajes restantes hoy |
| GET | `/api/asistente/conversaciones` | Bearer JWT (rol usuario) | Conversaciones propias (las fijadas primero) con la vista previa del último mensaje |
| POST | `/api/asistente/conversaciones` | Bearer JWT (rol usuario) | Inicia una conversación con el primer `mensaje` (1 a 1000 caracteres) y devuelve la respuesta (201) |
| GET | `/api/asistente/conversaciones/:id` | Bearer JWT (rol usuario) | Conversación propia con sus mensajes (404 si no existe o es de otra cuenta) |
| POST | `/api/asistente/conversaciones/:id/mensajes` | Bearer JWT (rol usuario) | Envía un `mensaje` y devuelve la respuesta (201); 429 al llegar al límite diario y 503 si el proveedor falla (el mensaje no se guarda) |
| PATCH | `/api/asistente/conversaciones/:id` | Bearer JWT (rol usuario) | Fija o desfija con `fijada` (máximo 5 fijadas; 409 al superar) |
| DELETE | `/api/asistente/conversaciones/:id` | Bearer JWT (rol usuario) | Elimina la conversación y sus mensajes (204) |

## Ejecución con Docker

_Pendiente (FS-HU-11, Sprint 5)._

## Pruebas

```bash
cd backend && npm test      # Jest + Supertest (unitarias e integración de la API)
cd frontend && npm test     # Vitest + Testing Library (validaciones y pantallas)
npm run lint                # en cada carpeta: ESLint sin errores (DoD-05)
npm audit                   # en cada carpeta: sin vulnerabilidades críticas ni altas (DoD-12)
```

Las pruebas de integración del backend simulan el acceso a datos, por lo que no requieren MySQL. Para la agenda y las reservas hay además una comprobación contra MySQL real, que crea sus propios datos temporales y los elimina al terminar:

```bash
cd backend && npm run test:mysql:agenda
```

## Convenciones de trabajo

- Metodología Scrum con sprints de 2 semanas (Sprint 5 de 3 semanas).
- Una historia de usuario se considera terminada solo si cumple la Definition of Done del proyecto.
- Todo el proyecto (código, documentación y evidencias) se entrega en español.
