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
| `SMTP_USUARIO`, `SMTP_CONTRASENA` | Cuenta que envía los correos (la del proyecto: `fitsearchoficial@gmail.com`) y su contraseña de aplicación de Google, con o sin los espacios con que Google la muestra |
| `SMTP_REMITENTE` | Remitente visible: `"FitSearch <fitsearchoficial@gmail.com>"` (si se deja vacío, se usa `FitSearch <SMTP_USUARIO>`) |
| `IA_API_KEY` | Clave del proveedor del asistente IA (Groq: crearla gratis en https://console.groq.com/keys) |
| `IA_URL_BASE`, `IA_MODELO` | Proveedor compatible con OpenAI (por defecto Groq: `https://api.groq.com/openai/v1` y `openai/gpt-oss-120b`) |
| `IA_MENSAJES_POR_DIA` | Mensajes que cada usuario puede enviar al asistente por día (por defecto 30) |

Mientras falte `SMTP_USUARIO` o `SMTP_CONTRASENA` esté vacía o diga `CAMBIAR`, ningún correo sale: el enlace de recuperación de contraseña y los avisos de la agenda se muestran en la consola del backend (útil en desarrollo), y al arrancar el backend avisa qué falta. Para enviarlos de verdad, la cuenta de Gmail del proyecto necesita la verificación en dos pasos y una contraseña de aplicación (16 letras) en `SMTP_CONTRASENA`; `cd backend && npm run smtp:comprobar` comprueba la conexión sin enviar nada. Todos los correos (recuperación de contraseña y avisos de la agenda) usan la misma plantilla, con el diseño definido por el PO el 11-11-2026: encabezado con el logo y el lema, ícono según el aviso, saludo, panel con el detalle de la cita (fecha, horario, modalidad, tipo de atención y estado), «¿Qué debes hacer?», botón, el enlace escrito por si el botón no se ve, nota, despedida y aviso de mensaje automático, más una versión de solo texto. Está hecha con tablas y estilos en línea para Gmail, Outlook y el celular, y sus imágenes (`backend/src/recursos/correo`) van adjuntas dentro del correo, porque la app no tiene todavía una dirección pública desde donde cargarlas; `npm run smtp:plantillas -- --guardar <carpeta>` los guarda como HTML para revisarlos y `npm run smtp:plantillas -- --destinatario <correo> --enviar` envía una muestra de cada uno (8 correos, con datos de ejemplo y «[Muestra]» en el asunto). Al publicar la app, `FRONTEND_URL` debe ser su dirección pública, porque con ella se arman los enlaces; Gmail permite unos 500 destinatarios por día. Al restablecer la contraseña se cierran todas las sesiones abiertas de la cuenta, y `npm run test:mysql:acceso` comprueba con MySQL real el registro, el inicio de sesión, la recuperación, las cuentas creadas con Google y el acceso con Google (33 comprobaciones, con el correo simulado). Mientras `IA_API_KEY` esté vacía, el asistente IA responde en modo de prueba, sin consultar al proveedor.

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

- **Usuario:** el logo y la raíz llevan al Inicio (`/inicio`), que reúne accesos rápidos, objetivo, progreso, próximas citas y profesionales destacados (FS-HU-21). En celular, los accesos rápidos, las especialidades y los profesionales destacados son carruseles: se deslizan con el dedo y tienen flechas a los costados, que aparecen solo cuando hay más tarjetas hacia ese lado; desde 640 px vuelven a su grilla. Las pestañas de Comidas funcionan igual cuando no caben en la pantalla. Desde ahí accede a Profesionales, Centros de salud (`/centros-salud`) y Gimnasios (`/gimnasios`) con su lista, mapa y ficha (FS-HU-25), Favoritos, Mis citas (`/citas`), Asistente IA (`/asistente`, FS-HU-07), Comidas (`/comidas`, FS-HU-09 y FS-HU-10), Mensajes (`/mensajes`, FS-HU-31) y su perfil.
- **Profesional:** Inicio con clima, tareas y resumen semanal (`/profesional/inicio`), Mi agenda con el calendario de la semana (`/profesional/agenda`), Clientes (`/profesional/clientes`, FS-HU-27), Mensajes (`/profesional/mensajes`, FS-HU-31), Reportes (`/profesional/reportes`, FS-HU-28), Configuración (`/profesional/configuracion`, FS-HU-29), su perfil con la ficha pública (`/profesional/perfil`) y la vista previa de cómo lo ven los usuarios (`/profesional/perfil/publico`).
- **Administrador:** panel en `/admin` (Dashboard, Profesionales, Verificaciones, Usuarios y Reportes; FS-HU-12).

Las pantallas con sesión comparten encabezado (logo, notificaciones y menú de la cuenta), menú lateral blanco (el mismo en el usuario, el profesional y el administrador) y, en celular, barra inferior. En escritorio el menú queda pegado al borde izquierdo y el contenido se centra en el espacio libre, sin franjas vacías en pantallas anchas. En pantallas grandes, el menú lateral del usuario, del profesional y del administrador se puede compactar con «Contraer menú» para ver solo los íconos (el nombre de cada opción aparece al pasar el mouse o al enfocarla, y el asistente queda como un acceso con ícono); la elección se recuerda en el navegador y en celular el menú siempre se abre completo. Si se abre una ruta protegida sin sesión, después de iniciar sesión se vuelve a ella con sus filtros.

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
| PUT | `/api/profesionales/mi-ficha` | Bearer JWT (rol profesional) | Crea o actualiza la ficha propia: especialidad, comuna, dirección de atención (obligatoria salvo que atienda solo online), modalidad, ubicación dentro de Chile (el formulario la obtiene con la ruta siguiente y el profesional puede ajustar el marcador; SC-28) y descripción (FS-HU-04, SC-24) |
| GET | `/api/profesionales/mi-ficha/ubicacion` | Bearer JWT (rol profesional) | Coordenadas de la `comuna` y la `direccion` de atención, buscadas en Nominatim (OpenStreetMap) con una consulta por segundo y caché de 24 horas; responde `lat`, `lng`, la `precision` (`exacta`, `calle` o `comuna`) y lo que encontró; 404 si la comuna no existe en Chile y 503 si Nominatim no responde (FS-HU-04, SC-28) |
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
| GET | `/api/establecimientos` | Bearer JWT (rol usuario) | Centros de salud o gimnasios activos (FS-HU-25): `categoria` obligatoria (`centro_salud` o `gimnasio`), `comuna`, `distanciaKm` (2, 5, 10 o 25, requiere `lat` y `lng`), `orden` (`nombre` o `cercania`), `pagina` y `limite`; cada uno trae su dirección, ubicación, `distanciaKm` y `totalProfesionales` |
| GET | `/api/establecimientos/filtros` | Bearer JWT (rol usuario) | Comunas con establecimientos activos de la `categoria` |
| GET | `/api/establecimientos/:id` | Bearer JWT (rol usuario) | Ficha de un establecimiento activo con sus profesionales asociados (nombre, especialidad, modalidad y si está verificado); 404 si no existe o se desactivó |

Las rutas de la agenda y las reservas (`/api/disponibilidades`, `/api/profesionales/:id/disponibilidades` y `/api/reservas`) se describen en su sección, más abajo. Las del panel del administrador están bajo `/api/administrador` y las solicitudes y documentos de verificación del profesional bajo `/api/verificaciones` (FS-HU-12).

Los errores se responden como `{ "error": "mensaje", "detalles": { "campo": "mensaje" } }`.

### Verificación básica de profesionales — FS-HU-12

Implementada en el Sprint 3 (PR #15, #19 y #20). Estaba prevista para el Sprint 5 «si hay capacidad»; el 12-10-2026 el Product Owner la reubicó en el Sprint 3 y la aceptó. El endpoint solo admite administradores con sesión; usuario y profesional reciben 403, sin sesión responde 401 y un id inválido devuelve 400. La ficha propia no permite modificar `verificado`. Las fichas aprobadas muestran el ícono de escudo y «Verificado» en el listado, el Inicio y el perfil profesional.

El panel autorizado incluye Dashboard, Profesionales, Verificaciones, Usuarios y Reportes; Configuración queda fuera y Contenido está planificado para el Sprint 5 (FS-HU-30). Las cuentas administrativas se preparan con `npm run admin:promover -- --correo correo-de-la-cuenta --confirmar`. Una ficha comienza en `sin_solicitud`; solo el envío explícito con documentos vigentes entra a Pendientes. Rechazo, revocación y cambio de especialidad exigen documentos y solicitud nuevos. Los PR #19 y #20 están fusionados. Se admiten diez cargas por tipo y trámite y la vigencia se determina por IDs. Detalle y evidencia: [FS-HU-12 — Verificación](FASE%202/Evidencias%20Proyecto/Evidencias%20de%20documentaci%C3%B3n/Plan%20de%20Pruebas/FS-HU-12_Verificacion.md).

### Panel del administrador (11-11-2026)

El administrador usa el mismo encabezado, menú lateral (compactable) y barra inferior que los otros espacios. Su menú de cuenta dice «Administrador» y la campana avisa las verificaciones pendientes. Cada pantalla tiene un propósito y no repite a otra:

- **Dashboard** (operativo): la cola de verificaciones por antigüedad (con días de espera y documentos), cuatro cifras de los últimos 7 días frente a los 7 anteriores (cuentas nuevas, reservas, reseñas y preguntas al asistente), la actividad diaria de 14 días, las últimas cuentas y el estado de la plataforma.
- **Reportes** (análisis de 30 días, 90 días o 12 meses frente al período anterior): crecimiento por tipo de cuenta, demanda (reservas por estado, cancelación, profesionales con reservas y especialidades más pedidas), oferta (estado de verificación, especialidades, comunas y días para verificar), calidad de las reseñas y uso de las funciones. Se descarga en CSV.
- **Verificaciones** es la cola de trabajo (de la solicitud más antigua a la más reciente) y **Profesionales** el directorio, con calificación y reservas.

Los gráficos (cifras con comparación, columnas apiladas y barras) están en `frontend/src/components/graficos`, con colores validados para daltonismo, detalle al pasar el mouse o enfocar y una tabla para lectores de pantalla. Los días se cortan en la hora de Chile.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/administrador/dashboard` | Bearer JWT (rol administrador) | Cola de verificación, cifras de 7 días, actividad de 14 días, últimas cuentas y estado de la plataforma |
| GET | `/api/administrador/reportes` | Bearer JWT (rol administrador) | Reportes de `dias` = 30, 90 o 365 (por semana o por mes) frente al período anterior |
| GET | `/api/administrador/alertas` | Bearer JWT (rol administrador) | Verificaciones pendientes, para la campana |
| GET | `/api/administrador/profesionales` | Bearer JWT (rol administrador) | Con `vista=cola` (por antigüedad, días de espera y documentos) o `vista=directorio` (por nombre, calificación y reservas) |

### Contenido del administrador — FS-HU-30

En `/admin/contenido` el administrador agrega, edita, desactiva y elimina las especialidades, los alimentos de Comidas y los establecimientos (centros de salud y gimnasios, con su comuna y su ubicación). Lo que está en uso no se elimina: la API responde 409 con el uso y la pantalla ofrece desactivarlo, para que no aparezca en elementos nuevos sin perder el historial. Las especialidades pasaron de `shared/reglas.json` a la tabla `especialidades`: las usan la ficha del profesional, el buscador de la portada y el asistente IA, siempre solo las activas, y renombrar una actualiza las fichas que la usan. Un alimento desactivado deja de aparecer al registrar comidas y en el asistente.

Los establecimientos tienen además su cuenta de Instagram (opcional): se puede escribir `@usuario`, `usuario` o pegar el enlace del perfil, y se guarda solo el usuario. Las tarjetas y la ficha de Gimnasios y Centros de salud la muestran con un enlace que se abre en otra pestaña. La migración `20261111130000_gimnasios_san_antonio` agrega la columna `instagram` y 11 gimnasios de la comuna de San Antonio (incluye Llolleo y Barrancas), con nombre y dirección del directorio público de gimnasios de San Antonio de AgendaPro (revisado el 11-11-2026), Instagram de sus perfiles públicos (4 de 11 lo tienen) y coordenadas de OpenStreetMap a nivel de calle. Es aditiva y no duplica si se vuelve a aplicar.

Antes de iniciar el backend, ejecutar `npm run db:generate` y `npm run db:migrate`: la migración `20261104120000_contenido_administrador` crea `especialidades` con las cinco del catálogo anterior y agrega `activo` a `alimentos` y a `establecimientos`, y `comuna` a `establecimientos`, sin borrar datos.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/especialidades` | Pública | Nombres de las especialidades activas, en orden alfabético |
| GET | `/api/administrador/contenido/:catalogo` | Bearer JWT (rol administrador) | `especialidades`, `alimentos` o `establecimientos`, con `q`, `estado` (`activos` o `inactivos`) y `pagina`; cada elemento trae `activo` y `enUso` |
| POST | `/api/administrador/contenido/:catalogo` | Bearer JWT (rol administrador) | Agrega un elemento (201); 409 si ya existe uno con ese nombre |
| PUT | `/api/administrador/contenido/:catalogo/:id` | Bearer JWT (rol administrador) | Edita un elemento; renombrar una especialidad actualiza las fichas que la usan |
| PATCH | `/api/administrador/contenido/:catalogo/:id/estado` | Bearer JWT (rol administrador) | Activa o desactiva el elemento con `activo` (`true` o `false`) |
| DELETE | `/api/administrador/contenido/:catalogo/:id` | Bearer JWT (rol administrador) | Elimina un elemento sin uso (204); 409 con `detalles.enUso` si está en uso |
| GET | `/api/administrador/contenido/establecimientos/ubicacion` | Bearer JWT (rol administrador) | Busca la ubicación de un establecimiento con `comuna` y `direccion` (Nominatim, igual que la ficha del profesional) |

### Disponibilidad, reservas y mapa — FS-HU-13, FS-HU-14 y FS-HU-06

El profesional publica bloques en Mi agenda; el usuario reserva desde la ficha con un mensaje de 10 a 500 caracteres. El profesional confirma y cualquiera de los participantes cancela. Se conserva el historial. La API protege la propiedad y una transacción impide dos reservas activas simultáneas para el mismo bloque. Además, cada usuario puede tener como máximo una reserva activa (pendiente o confirmada) de un horario futuro con cada profesional; si no, la API responde 409 con `detalles.motivo = limite_por_profesional` (decisión del PO del 12-10-2026). Las fechas y horas se interpretan en `America/Santiago`.

Antes de iniciar el backend, ejecutar `npm run db:generate` y `npm run db:migrate`. La nueva migración agrega `disponibilidades` y `reservas` sin borrar datos existentes. Las rutas principales son `/api/disponibilidades`, `/api/profesionales/:id/disponibilidades` y `/api/reservas`.

La lista y el mapa se ven juntos (SC-27): en escritorio la lista va a la izquierda y el mapa, fijo, a la derecha; en celular, el mapa va arriba de la lista. Elegir un marcador, o «Ver en el mapa» en una tarjeta, muestra el detalle del profesional bajo el mapa y marca su tarjeta. El mapa se puede ocultar (`?mapa=oculto`) sin perder filtros ni página. El mapa usa MapLibre GL JS y las teselas de OpenFreeMap, que no requieren clave; si no carga, continúa disponible el listado. Para SMTP, configurar las credenciales en `backend/.env` y ejecutar `npm run smtp:comprobar`. La dirección de un destinatario no sustituye las credenciales del remitente.

Los PR #21 y #22 están fusionados en `main` (12-10-2026); el PO aceptó FS-HU-13 y FS-HU-14 el 12-10-2026 y FS-HU-06 el 26-10-2026, después de aprobarse CP-078 con el mapa real. El 12-10-2026 se comprobaron el envío real de correos (SMTP) y Google Maps real con una Demo Key, sin facturación; desde el 15-10-2026 el mapa usa MapLibre GL JS con OpenFreeMap, sin clave (SC-18, PR #27). [Alcance, API, instalación y pruebas](FASE%202/Evidencias%20Proyecto/Evidencias%20de%20documentaci%C3%B3n/Sprint%203/Disponibilidad_Reservas_Mapa.md). El DAS (versión 1.30) y sus diagramas están en el Drive del equipo.

### Agenda semanal, reservas y espacio del profesional (FS-HU-27 a FS-HU-29 y FS-HU-31)

El 09-11-2026 el PO pidió mejorar la agenda, las reservas y el espacio del profesional y tomó FS-HU-27, FS-HU-28, FS-HU-29 y FS-HU-31. La migración `20261109120000_mejoras_agenda_y_profesional` solo agrega columnas opcionales o con valor por defecto y cuatro tablas (`bloqueos_agenda`, `lista_espera`, `chats` y `mensajes_chat`), y `20261110120000_reintento_de_avisos` agrega dos columnas opcionales para reintentar los avisos; ejecutar `npm run db:generate` y `npm run db:migrate` antes de iniciar el backend.

- **Mi agenda** (`/profesional/agenda`): calendario de la semana con una fila por hora y los horarios coloreados por estado (libre, por confirmar, confirmada y día bloqueado), la hora actual y, en pantallas angostas, un día a la vez. Al elegir un horario se ve su detalle (cliente, mensaje, modalidad y primera visita) para confirmar, cancelar o escribirle; un clic en un espacio libre propone publicar a esa hora. Permite publicar varios bloques de una vez (`POST /api/disponibilidades/serie`), bloquear fechas (`/api/agenda/bloqueos`; no se puede bloquear un día con reservas activas) y muestra las solicitudes por confirmar y cuántas personas esperan una hora (`GET /api/agenda/semana?desde=AAAA-MM-DD`). El formulario anterior con el calendario del mes sigue en la pestaña Horarios del perfil.
- **Reserva**: al reservar se pregunta si es la primera visita y, si el profesional atiende de ambas formas, si será presencial u online. El buscador muestra en cada tarjeta la próxima hora libre y hasta tres horas; cada una abre la ficha con esa hora elegida (`?hora=ID`). Hay un filtro «Con horas libres» (hoy, 3 o 7 días) y el orden «Disponibles antes». El buscador sugiere especialidades según el objetivo del perfil.
- **Lista de espera** (`/api/profesionales/:id/lista-espera`): si el profesional no tiene horas, el usuario puede pedir «Avísame si se libera una hora»; al publicarse un horario o cancelarse una reserva futura se le escribe una vez y sale de la lista. Si dos publicaciones coinciden, cada persona recibe un solo aviso; si el correo falla, sigue en la lista para el próximo.
- **Avisos por correo y recordatorios**: reserva nueva (al profesional), confirmación o cancelación (a la otra persona) y recordatorio 24 horas antes de la cita confirmada (el servidor revisa cada 10 minutos y envía uno por cita; si el correo falla, lo reintenta en la revisión siguiente, sin duplicarlo). Sin SMTP configurado se escriben en la consola del backend.
- **Reseñas verificadas**: una reseña nueva exige una cita confirmada con el profesional que ya ocurrió y queda marcada «Cita verificada»; las anteriores al 09-11-2026 se conservan sin el sello. La ficha filtra por positivas (4 y 5 estrellas) y negativas (1 y 2).
- **FS-HU-27 Clientes y FS-HU-28 Reportes** (PR #50, Nicolás Silva): Clientes (`/profesional/clientes` y el historial de cada persona en `/profesional/clientes/:id`; `GET /api/profesional/clientes` y `/:id`), con la cantidad de citas, las realizadas, la próxima y la última, sin correo ni información de salud; Reportes (`/profesional/reportes`, `GET /api/profesional/reportes?semanas=4..26`): reservas por semana de la cita y por estado (realizadas, confirmadas, pendientes, sin confirmar y canceladas), calificación promedio y el resumen de la semana en curso que muestra el Inicio del profesional. El 11-11-2026 el equipo eligió esta versión y retiró la que traía este PR, que duplicaba las mismas rutas.
- **FS-HU-29 Experiencia y configuración**: años de experiencia, formación, a quién atiende, número de registro en la Superintendencia de Salud (con enlace para comprobarlo) y precio referencial, que se muestran en la ficha pública (`/api/profesionales/mi-ficha/experiencia`); y la configuración (`/profesional/configuracion`, `/api/profesionales/mi-ficha/configuracion`): confirmar reservas automáticamente, avisos por correo y recordatorios a los clientes.
- **FS-HU-31 Mensajes** (`/mensajes` para el usuario y `/profesional/mensajes` para el profesional): un solo chat por usuario y profesional, con el historial de todas sus reservas (el aviso de cada reserva y su mensaje inicial aparecen dentro del chat). Solo lo ven sus dos participantes (para cualquier otra cuenta responde 404) y sigue abierto aunque una reserva se cancele. Tiene un buscador por palabras que no distingue mayúsculas ni tildes, lista los resultados y lleva al mensaje elegido. Cada uno puede eliminar el chat, con confirmación: se borra solo para quien lo elimina y, si vuelven a escribirse, reaparece solo con lo nuevo; cuando los dos lo eliminan, los mensajes que ninguno ve se borran de la base. En la lista de chats del usuario, cada profesional muestra su especialidad en una etiqueta junto al nombre (11-11-2026), que baja a la línea siguiente si el nombre es largo; en la del profesional no se repite «Cliente». La campana del encabezado avisa los mensajes sin leer. Los enlaces desde una reserva abren el chat de esa pareja (`/mensajes?reserva=ID`). Rutas `GET|POST /api/chats`, `GET /api/chats/no-leidos`, `GET|DELETE /api/chats/:id` y `POST /api/chats/:id/mensajes`.

Con esto Clientes, Mensajes, Reportes y Configuración del profesional dejan de ser «Próximamente». Comprobación con MySQL real: `cd backend && npm run test:mysql:mejoras` (85 comprobaciones, con cuentas temporales que se borran al final y con el envío de correos simulado, incluidos sus fallos).

### Asistente IA — FS-HU-07 y FS-HU-08

La usuaria o el usuario conversa en `/asistente` con un asistente de orientación general en salud, alimentación y actividad física: historial de conversaciones (las fijadas primero), sugerencias, acciones rápidas y un aviso permanente de que no reemplaza a un profesional. Solo ante una situación crítica (por ejemplo, un hueso roto o dificultad para respirar) la respuesta indica llamar al SAMU (131), y ante señales de riesgo suicida, al *4141; la API lo agrega aunque el modelo no lo diga, y las molestias leves no llevan ese aviso (SC-26). Cada cuenta puede enviar 30 mensajes por día (hora de Chile); borrar una conversación no devuelve el cupo.

El proveedor es Groq, con plan gratuito y una API compatible con OpenAI (DAS 1.25, D33, SC-25). El backend usa un cliente genérico, así que otro proveedor compatible se configura solo con `IA_URL_BASE`, `IA_MODELO` e `IA_API_KEY`. Al proveedor solo viajan las instrucciones del asistente y los últimos 10 mensajes de la conversación: nunca el perfil ni la información de salud. Sin `IA_API_KEY` el asistente responde en modo de prueba.

Cuando corresponde, el asistente recomienda una de las especialidades activas del catálogo que administra el administrador (FS-HU-30): el modelo lo marca en una línea final, el backend lo valida, lo quita del texto y lo guarda en `mensajes.especialidad`, y la pantalla muestra una tarjeta «Ver …» que abre `/profesionales` filtrado por esa especialidad (FS-HU-08, DAS D34). El banner «¿Necesitas una recomendación?» del menú abre un chat nuevo con la pregunta ya escrita (`/asistente/nuevo?inicio=profesional`).

Antes de iniciar el backend, ejecutar `npm run db:generate` y `npm run db:migrate`: la migración `20261021120000_asistente_ia` agrega `conversaciones`, `mensajes` y `uso_asistente` sin borrar datos existentes, y `20261022120000_recomendacion_profesional` agrega la columna `mensajes.especialidad`.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/asistente/estado` | Bearer JWT (rol usuario) | Modo (`ia` o `simulado`), límite diario y mensajes restantes hoy |
| GET | `/api/asistente/conversaciones` | Bearer JWT (rol usuario) | Conversaciones propias (las fijadas primero) con la vista previa del último mensaje |
| POST | `/api/asistente/conversaciones` | Bearer JWT (rol usuario) | Inicia una conversación con el primer `mensaje` (1 a 1000 caracteres) y devuelve la respuesta (201), con la `especialidad` recomendada o `null` y los alimentos agregados en `comidasAgregadas` |
| GET | `/api/asistente/conversaciones/:id` | Bearer JWT (rol usuario) | Conversación propia con sus mensajes (404 si no existe o es de otra cuenta) |
| POST | `/api/asistente/conversaciones/:id/mensajes` | Bearer JWT (rol usuario) | Envía un `mensaje` y devuelve la respuesta (201), con la `especialidad` recomendada o `null` y los alimentos agregados en `comidasAgregadas`; 429 al llegar al límite diario y 503 si el proveedor falla (el mensaje no se guarda) |
| PATCH | `/api/asistente/conversaciones/:id` | Bearer JWT (rol usuario) | Fija o desfija con `fijada` (máximo 5 fijadas; 409 al superar) |
| DELETE | `/api/asistente/conversaciones/:id` | Bearer JWT (rol usuario) | Elimina la conversación y sus mensajes (204) |

### Comidas — FS-HU-09 y FS-HU-10

En `/comidas` la persona registra lo que come: busca un alimento del catálogo (58 alimentos con sus valores por 100 g, aproximados de USDA FoodData Central), indica los gramos y el momento del día (desayuno, media mañana, almuerzo, merienda o cena) y el sistema calcula sus calorías y macronutrientes antes de guardarlo. El resumen muestra las calorías de hoy frente al objetivo diario, el progreso de la semana, las comidas de hoy por momento, los macronutrientes y su objetivo. El objetivo sale del plan de alimentación que rige ese día (ver «Plan de alimentación», más abajo); hasta el 11-11-2026 era el requerimiento del perfil con un reparto fijo de 30/45/25. La pestaña Comidas permite cambiar los gramos o el momento y quitar alimentos, también de días anteriores. Se adelantó del Sprint 5 al Sprint 4 por decisión del PO del 26-10-2026 (SC-30) y el PO la aceptó el 02-11-2026.

La pestaña Estadísticas (FS-HU-26) muestra la semana o el mes: las calorías y los macronutrientes de cada día frente al objetivo diario, y el promedio de los días con registros. Un día sin registros no baja el promedio.

Paneles de Comidas (pedido del PO del 11-11-2026): cada panel explica en una línea qué muestra. En el Resumen, la tarjeta del día dice cuánto falta para la meta («Te faltan 550 kcal», «Llegaste a tu meta» o «Te pasaste por…») y cuántos gramos faltan de cada macronutriente, y compara el día con el promedio de los otros días de la semana; el progreso semanal muestra cada día frente a la meta, con el porcentaje alcanzado, la franja de ±10 % en que un día cuenta como «cerca de la meta» y cuántos días completos quedaron cerca. Las Estadísticas agregan las cifras del período (promedio, días cerca de la meta, diferencia con la meta y días con registro, comparados con la semana o el mes anterior), la comparación del promedio de calorías y macronutrientes con el período anterior, el reparto de calorías frente al del plan y el promedio de calorías de cada comida del día; al pasar el mouse sobre una barra se ve el detalle de ese día. Hoy aún no termina: aparece en los gráficos, pero no cuenta para el promedio ni para los días cerca de la meta. El margen está en `shared/reglas.json` (`comidas.estadisticas.margenMeta`) y `npm run test:mysql:plan` (63 comprobaciones) lo verifica con MySQL real.

También se puede pedir al asistente, por ejemplo «añade 100 g de pollo a mi almuerzo». El modelo llama a la función `agregar_alimentos` y el backend busca cada alimento en el catálogo, lo registra en las comidas de hoy y arma la respuesta, sin otra consulta al proveedor (DAS 1.29, D37). Los alimentos y los mensajes se guardan en una sola transacción: si algo falla no queda ninguna comida a medias y el reintento no la duplica (DAS 1.30). Lo que no está en el catálogo no se agrega y la respuesta lo dice. El chat muestra la tarjeta «Agregado a tus comidas de hoy» con el acceso a Comidas, y el pedido usa uno de los 30 mensajes del día.

Antes de iniciar el backend, ejecutar `npm run db:generate` y `npm run db:migrate`: la migración `20261026120000_comidas` crea `alimentos` (con el catálogo) y `registro_comida` y agrega la columna `mensajes.comidas_agregadas`, sin borrar datos existentes. Solo las cuentas de usuario usan estas rutas; el profesional recibe 403.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/comidas/alimentos` | Bearer JWT (rol usuario) | Busca en el catálogo por nombre o sinónimo con `q` (2 a 60 caracteres, sin importar tildes); hasta 12 alimentos con su aporte por 100 g |
| GET | `/api/comidas` | Bearer JWT (rol usuario) | Comidas del día (`fecha` AAAA-MM-DD, por defecto hoy en Chile) agrupadas por momento, con el consumo y el objetivo diario; 400 si la fecha aún no llega |
| GET | `/api/comidas/semana` | Bearer JWT (rol usuario) | Calorías de cada día, de lunes a domingo, de la semana de `fecha`, con el objetivo calórico |
| GET | `/api/comidas/estadisticas` | Bearer JWT (rol usuario) | Estadísticas de la semana (`periodo=semana`, por defecto) o del mes (`periodo=mes`) de `fecha`: calorías y macronutrientes de cada día, el objetivo diario (con el reparto del plan), el promedio de los días con registros, cuántos quedaron cerca de la meta, el período anterior para comparar y el promedio de calorías de cada comida del día |
| POST | `/api/comidas` | Bearer JWT (rol usuario) | Registra `alimentoId`, `gramos` (1 a 2000) y `momento`, y opcionalmente `fecha`; guarda las calorías y los macronutrientes calculados (201) |
| PATCH | `/api/comidas/:id` | Bearer JWT (rol usuario) | Cambia los `gramos` (recalcula el aporte) o el `momento` de un registro propio; 404 si no existe o es de otra cuenta |
| DELETE | `/api/comidas/:id` | Bearer JWT (rol usuario) | Quita un registro propio (204) |

### Plan de alimentación y meta de peso (11-11-2026)

La pestaña «Plan de alimentación» de Comidas reemplaza el reparto fijo. Hay dos formas de plan:

- **Según tu meta** (por defecto): las calorías son el gasto estimado del perfil (Mifflin-St Jeor por la actividad física) ajustado por la meta: −15 % para bajar de peso, sin bajar de 1.200 kcal en mujeres ni de 1.500 en hombres (salvo que el gasto ya sea menor), y +10 % para ganar masa. La proteína va en gramos por kilo según la meta (bajar 1,8; mantener 1,4; ganar masa 2,0; rendimiento 1,6; hasta un 35 % de las calorías), las grasas entre 20 % y 35 % y los carbohidratos con el resto (en «Mejorar rendimiento», 5 g por kilo). Sin peso ni requerimiento se muestra el reparto de referencia (70 kg, 2.300 kcal) sin gramos.
- **Personalizados**: una lista de hasta 10 planes propios con nombre y tres porcentajes (de 5 % a 80 %, que suman 100). Se elige cuál usar; las calorías siguen la meta. La pantalla avisa lo que sale de los rangos generales (proteínas 10–35 %, carbohidratos 45–65 %, grasas 20–35 %) y cuánta proteína por kilo significa.

El plan elegido rige desde ese día y guarda una copia de los porcentajes: los días anteriores conservan el suyo aunque el plan se edite o se borre. Al borrar el plan en uso vuelve el de la meta.

La **meta de peso** (solo para «Bajar de peso» o «Aumentar masa muscular») guarda el peso al que se quiere llegar y el ritmo semanal (0,25, 0,5 o 0,75 kg para bajar; 0,25 o 0,5 para ganar). El ajuste de calorías pasa a ser el del ritmo (cerca de 7.700 kcal por kilo repartidas en la semana) con el mismo piso de seguridad. Se muestra el avance con el peso del perfil, lo que falta y una fecha estimada. No se acepta un peso bajo un IMC de 18,5 al bajar ni sobre 30 al ganar. Si la meta del perfil cambia, la meta de peso queda guardada pero deja de aplicarse.

Fuentes: Institute of Medicine (rangos AMDR), OMS (alimentación sana e IMC), ISSN 2017 (proteína y ejercicio), Morton y otros 2018, revisión 2015 sobre proteína en déficit calórico, Iraki y otros 2019, declaración conjunta 2016 sobre nutrición deportiva, guía AHA/ACC/TOS 2013 y Hall y otros 2011 (balance de energía). Los enlaces están en la misma pantalla («Cómo se calcula» → «Fuentes»). Es una orientación para adultos sanos; la pantalla lo dice y ofrece buscar nutricionistas.

La migración `20261111120000_plan_alimentacion` crea `planes_personalizados`, `planes_alimentacion` y `metas_peso` (con restricciones CHECK de porcentajes, tipos y dirección del peso). `npm run test:mysql:plan` lo comprueba contra MySQL real (58 comprobaciones) con una cuenta temporal que se borra al final.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/comidas/plan` | Bearer JWT (rol usuario) | Plan vigente, meta, recomendado, lista de personalizados, meta de peso y sus opciones |
| PUT | `/api/comidas/plan` | Bearer JWT (rol usuario) | Elige el plan desde hoy: `{ tipo: 'meta' }` o `{ tipo: 'personalizado', personalizadoId }` (404 si es ajeno) |
| POST | `/api/comidas/plan/personalizados` | Bearer JWT (rol usuario) | Crea un personalizado (`nombre`, `proteinas`, `carbohidratos`, `grasas`, `usar` opcional); 409 si el nombre se repite o ya hay 10 |
| PUT | `/api/comidas/plan/personalizados/:id` | Bearer JWT (rol usuario) | Edita uno propio; si está en uso, rige con los porcentajes nuevos desde hoy |
| DELETE | `/api/comidas/plan/personalizados/:id` | Bearer JWT (rol usuario) | Borra uno propio; si estaba en uso, desde hoy vuelve el plan de la meta |
| PUT | `/api/comidas/plan/meta-peso` | Bearer JWT (rol usuario) | Guarda `pesoObjetivoKg` y `ritmoSemanalKg`; 400 con el motivo si no corresponde a la meta o al peso actual |
| DELETE | `/api/comidas/plan/meta-peso` | Bearer JWT (rol usuario) | Quita la meta de peso |

### Agua — FS-HU-33

En «Tu progreso» del Inicio, la persona suma el agua que toma en el día:
- «1 vaso» suma 250 ml.
- «Otra cantidad» acepta entre 50 y 2.000 ml por vez.
- «Deshacer» quita la última suma.

También se agrega desde Comidas, como si fuera un alimento. En «Registrar comida», al buscar «agua» aparece primero «Agua». Al elegirla se piden mililitros en vez de gramos y no se pide el momento del día. Se guarda en el agua del día que se está viendo, que es la misma que muestra «Agua hoy», y no suma calorías. El «Resumen nutricional» de Comidas muestra el agua del día con la misma barra que los macronutrientes.

El avance se muestra frente a una meta general de 2.000 ml (`shared/reglas.json`, sección `agua`), y el total de un día no puede pasar de 10.000 ml. El día se corta a medianoche de Chile. La migración aditiva `20261105120000_registro_agua` crea la tabla `registro_agua`, con una fila por suma. Solo las cuentas de usuario usan estas rutas. Dos sumas al mismo tiempo no pueden pasar el máximo del día: cada suma bloquea la cuenta mientras cuenta y guarda. `npm run test:mysql:agua` lo comprueba contra MySQL real, junto con el corte del día en Chile y quitar agua de un día anterior desde Comidas.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| GET | `/api/agua` | Bearer JWT (rol usuario) | Agua de hoy en Chile, o de la `fecha` (AAAA-MM-DD) que pide Comidas: `totalMl`, `metaMl`, `vasoMl`, `hoy` y cada suma con su hora; 400 si el día aún no llega |
| POST | `/api/agua` | Bearer JWT (rol usuario) | Suma `ml` (entero de 50 a 2.000) al día de hoy, o a la `fecha` (AAAA-MM-DD) que envía Comidas, y responde el día actualizado con `hoy` (201); 400 con el rango permitido si la cantidad no es válida, si el día aún no llega o si el día pasaría de 10.000 ml |
| DELETE | `/api/agua/:id` | Bearer JWT (rol usuario) | Deshace una suma propia de hoy, o de la `fecha` (AAAA-MM-DD) que se ve en Comidas, y responde el día actualizado; 404 si es de otra cuenta o de otro día, y 400 si el día aún no llega |

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

Del mismo modo, `npm run test:mysql:asistente` comprueba el límite diario del asistente con solicitudes simultáneas y `npm run test:mysql:comidas` comprueba que los alimentos pedidos en el chat y los mensajes se guarden juntos o no se guarde nada. Ninguna de las dos consulta al proveedor de IA. Las dos muestran el resultado en la consola y solo reescriben su evidencia en `Plan de Pruebas` si se agrega la opción, por ejemplo `npm run test:mysql:comidas -- --guardar-evidencia`. `npm run test:mysql:plan` comprueba el plan de alimentación, la lista de personalizados, la meta de peso y las restricciones de sus tablas. `npm run test:mysql:especialidades` comprueba que guardar una ficha y eliminar su especialidad al mismo tiempo no deje la ficha con una especialidad inexistente: una de las dos operaciones espera a la otra (revisión del PR #42).

## Convenciones de trabajo

- Metodología Scrum con sprints de 2 semanas (Sprint 5 de 3 semanas).
- Una historia de usuario se considera terminada solo si cumple la Definition of Done del proyecto.
- Todo el proyecto (código, documentación y evidencias) se entrega en español.
