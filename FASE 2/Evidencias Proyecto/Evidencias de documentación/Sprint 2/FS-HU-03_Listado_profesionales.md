# FS-HU-03: listado de profesionales

Entrega corregida el 28-09-2026 a partir del PR #8, commit `7efe7607cdabdbcbdd347ecb1294806c670f0474`.

## Alcance

El usuario con sesión iniciada consulta profesionales almacenados en FitSearch, filtra por especialidad y comuna y navega por páginas de hasta 12 fichas. Cada ficha muestra nombre, especialidad, descripción y lugar de atención. No se publican correo de acceso, contraseña ni información de salud.

La vista `/profesionales` está dentro de `RutaProtegida`. El cliente HTTP envía el token en las dos consultas del directorio. El middleware `autenticar` protege tanto el listado como el catálogo de especialidades. Los tokens ausentes, inválidos o vencidos reciben 401. Una sesión vencida devuelve al usuario a la pantalla de acceso.

## API

- `GET /api/profesionales?especialidad=Nutrición&comuna=Melipilla&pagina=1`, Bearer JWT obligatorio.
- `GET /api/profesionales/especialidades`, Bearer JWT obligatorio.

Se conserva la separación rutas → controladores → servicios → modelos. La validación de filtros se realiza en el backend. Prisma accede a MySQL.

## Correcciones de alcance y coste

Esta entrega no incluye `/api/google/profesionales`, búsqueda en Places ni un mapa incorporado. No necesita `GOOGLE_MAPS_API_KEY` ni activar facturación de Places. Se conserva el enlace externo para consultar la ubicación de una ficha y el acceso con Google de FS-HU-16, que es una funcionalidad distinta.

El DAS sí menciona Maps, Geocoding y Places como parte de la arquitectura prevista. La corrección consiste en separar esas funciones de esta entrega de HU-03; no se modifica la planificación ni se da por aprobada la integración futura de FS-HU-05/06.

## Preparación y pruebas

Seguir el README para instalar dependencias, configurar MySQL y el entorno y ejecutar las migraciones. El seed de profesionales es opcional y contiene datos ficticios; no se carga automáticamente.

Validación ejecutada el 28-09-2026 en esta copia:

- Backend: 91 pruebas aprobadas, 10 suites (Jest y Supertest).
- Frontend: 56 pruebas aprobadas, 8 archivos (Vitest y Testing Library).
- ESLint de backend y frontend: sin errores.
- Compilación del frontend con Vite: correcta.
- Cliente Prisma generado con el esquema de esta entrega.

Las pruebas del backend simulan el acceso a datos. No sustituyen una ejecución manual contra MySQL ni las pruebas de acceso real con Google. Se comprueban explícitamente la autenticación del directorio, privacidad de sus respuestas, filtros, paginación, errores, reintento y ausencia de la antigua ruta de Places.

## Planilla y evidencias

La planilla contiene 35 casos (CP-001 a CP-035). Los resultados históricos registrados son 33 OK y 2 sin ejecutar (CP-024 y CP-025). La hoja Totales se calcula desde las marcas de la hoja Casos de Prueba. Esos registros no significan que se hayan repetido hoy las 35 pruebas manuales.

Las capturas del 24-09-2026 son evidencia histórica y pueden diferir de esta corrección. No se presentan como nuevas capturas de la versión corregida. La revisión y aceptación del equipo siguen pendientes.

Esta entrega corrige el PR #8. No declara terminado todo Sprint 2: las historias FS-HU-04 y FS-HU-13 mantienen su estado en el backlog del equipo.
