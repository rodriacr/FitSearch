# FitSearch

Plataforma web responsiva que conecta a personas que buscan mejorar su salud, condición física o alimentación con profesionales y establecimientos de salud, deporte y bienestar, mediante búsqueda geolocalizada, un asistente de inteligencia artificial y un gestor de alimentación por lenguaje natural.

Proyecto Capstone (PTY4614) — Duoc UC, Escuela de Informática y Telecomunicaciones, sección 003D, sede Melipilla.

> **Estado:** Fase 2 — cierre del Sprint 2 (acceso a la cuenta, perfil completo, portada y listado de profesionales) y adelanto del Sprint 3 (Inicio con sesión, búsqueda avanzada y por cercanía, favoritos y reseñas).

## Equipo

| Integrante | Rol Scrum | Foco de desarrollo |
|---|---|---|
| Rodrigo Cárcamo Rojas | Product Owner | Backend, datos e IA |
| Luis Méndez | Scrum Master | Backend, base de datos y frontend |
| Nicolás Silva | Desarrollador | Frontend |

## Alcance del MVP

- Registro, inicio de sesión y perfiles de usuario y profesional (roles: usuario, profesional, administrador).
- Directorio de profesionales y establecimientos con búsqueda geolocalizada, vista de mapa y lista.
- Asistente de orientación en salud y bienestar (API de Claude) que recomienda categorías de profesionales.
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
| Mapas | Google Maps Platform (Maps JavaScript, Geocoding, Places) |
| IA | API de Claude (Anthropic) con function calling |
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
│       ├── Evidencias de documentación/   # DAS, DoD, diagramas, sprints (con sus capturas), plan de pruebas y control
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
- Clave de API de Google Maps Platform y de la API de Claude (a partir de los Sprints 3 y 4)

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

Mientras `SMTP_CONTRASENA` esté vacía o diga `CAMBIAR`, el enlace de recuperación de contraseña se muestra en la consola del backend en lugar de enviarse por correo (útil en desarrollo).

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

## API disponible (Sprints 1 a 3)

### Navegación de la aplicación

Sin sesión, la raíz (`/`) muestra la portada pública. Con sesión, el logo y la raíz llevan al Inicio (`/inicio`), que reúne accesos rápidos, objetivo, progreso, próximas citas y profesionales destacados (FS-HU-21). Las pantallas con sesión comparten encabezado (logo, notificaciones y menú de la cuenta), menú lateral y, en celular, barra inferior; el acceso a Profesionales está en el menú lateral, la barra inferior y los accesos rápidos del Inicio. Si se abre una ruta protegida sin sesión, después de iniciar sesión se vuelve a ella con sus filtros.

### Directorio de profesionales — FS-HU-03, FS-HU-05 y FS-HU-22 a FS-HU-24

La ruta `/profesionales` busca por texto (nombre, especialidad o palabra clave) y filtra por especialidad, comuna, distancia máxima, calificación mínima y modalidad, con orden por nombre, cercanía, calificación o cantidad de reseñas. Los filtros quedan en la dirección de la página para compartir la búsqueda; la ubicación del navegador se redondea a unos 100 m, se usa solo en memoria y nunca va en la dirección. Cada profesional tiene su ficha (`/profesionales/:id`) con reseñas, y la página `/favoritos` lista los guardados.

Después de actualizar esta rama, ejecutar en backend `npm run db:generate` y `npm run db:migrate`. Para cargar **datos ficticios opcionales** (12 profesionales con comuna y modalidad, y reseñas de demostración), ejecutar primero `npm run db:seed` y luego `npm run db:seed:profesionales` (solo desarrollo; no crea credenciales de acceso).

Detalle de la entrega original del listado: [FS-HU-03 — Listado de profesionales](FASE%202/Evidencias%20Proyecto/Evidencias%20de%20documentaci%C3%B3n/Sprint%202/FS-HU-03_Listado_profesionales.md).

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/salud` | No | Estado de la API |
| POST | `/api/auth/registro` | No | Crea la cuenta (siempre con el rol `usuario`) y devuelve el token; el tipo de cuenta se elige en el perfil |
| POST | `/api/auth/login` | No | Inicia sesión y devuelve el token (`recordar: true` para una sesión de 30 días) |
| POST | `/api/auth/recuperar` | No | Envía el enlace para restablecer la contraseña (responde lo mismo exista o no el correo) |
| POST | `/api/auth/restablecer` | No | Cambia la contraseña con el código del enlace (vence en 60 minutos y sirve una vez) |
| POST | `/api/auth/logout` | Bearer JWT | Cierra la sesión |
| GET | `/api/perfil` | Bearer JWT | Datos del usuario, perfil completo, pasos pendientes del asistente y requerimiento calórico estimado |
| PUT | `/api/perfil/tipo-cuenta` | Bearer JWT | Guarda el tipo de cuenta elegido en el paso 1 del asistente (`usuario` o `profesional`) y devuelve un token nuevo con el rol confirmado (FS-HU-02) |
| PUT | `/api/perfil` | Bearer JWT | Guarda peso, altura, edad, sexo y actividad física |
| PUT | `/api/perfil/objetivos` | Bearer JWT | Guarda objetivo principal, comidas al día y horas de sueño (FS-HU-18) |
| PUT | `/api/perfil/salud` | Bearer JWT | Guarda condiciones médicas, medicamentos y alergias (FS-HU-19; solo valores de `shared/reglas.json`) |
| GET | `/api/profesionales` | Bearer JWT | Listado paginado (12 por página) con `q`, `especialidad`, `comuna`, `modalidad`, `calificacionMin`, `distanciaKm` (2, 5, 10 o 25, requiere `lat` y `lng`), `orden` (`nombre`, `cercania`, `calificacion`, `resenas`), `pagina` y `limite`; devuelve `profesionales`, `total`, `totalPaginas` y `hayMas` |
| GET | `/api/profesionales/filtros` | Bearer JWT | Especialidades y comunas disponibles para los filtros |
| GET | `/api/profesionales/:id` | Bearer JWT | Ficha pública, resumen de calificaciones, reseña propia y si la persona puede calificar |
| GET | `/api/profesionales/:id/resenas` | Bearer JWT | Reseñas paginadas (5 por página) con el autor abreviado |
| PUT | `/api/profesionales/:id/resenas` | Bearer JWT (rol usuario) | Crea o reemplaza la reseña propia: `puntaje` de 1 a 5 y `comentario` opcional de 10 a 500 caracteres (FS-HU-24) |
| DELETE | `/api/profesionales/:id/resenas` | Bearer JWT (rol usuario) | Elimina la reseña propia |
| GET | `/api/favoritos` | Bearer JWT | Profesionales favoritos del usuario (FS-HU-23) |
| PUT | `/api/favoritos/:profesionalId` | Bearer JWT | Guarda un favorito (idempotente) |
| DELETE | `/api/favoritos/:profesionalId` | Bearer JWT | Quita un favorito (idempotente) |

Los errores se responden como `{ "error": "mensaje", "detalles": { "campo": "mensaje" } }`.

## Ejecución con Docker

_Pendiente (FS-HU-11, Sprint 5)._

## Pruebas

```bash
cd backend && npm test      # Jest + Supertest (unitarias e integración de la API)
cd frontend && npm test     # Vitest + Testing Library (validaciones y pantallas)
npm run lint                # en cada carpeta: ESLint sin errores (DoD-05)
npm audit                   # en cada carpeta: sin vulnerabilidades críticas ni altas (DoD-12)
```

Las pruebas de integración del backend simulan el acceso a datos, por lo que no requieren MySQL.

## Convenciones de trabajo

- Metodología Scrum con sprints de 2 semanas (Sprint 5 de 3 semanas).
- Una historia de usuario se considera terminada solo si cumple la Definition of Done del proyecto.
- Todo el proyecto (código, documentación y evidencias) se entrega en español.
