# Regresión del cupo diario del asistente — PR #29

Comprobación del 23-10-2026 con Express, Prisma y MySQL reales. El proveedor de IA se simula: no envía conversaciones a Groq ni requiere una clave. La prueba crea una cuenta temporal propia y la elimina con sus conversaciones y contador al terminar.

Desde `backend`, después de generar Prisma y aplicar las migraciones:

```text
npm run test:mysql:asistente
```

Se comprobaron 23 condiciones: iniciar, continuar y combinar solicitudes simultáneas cuando queda un mensaje (201/429/429 y contador 30); un solo llamado al proveedor; primer uso y reinicio de día concurrentes; devolución de cupo tras fallo del proveedor o del guardado; reintento; cupo agotado sin llamada externa; y devolución de un día anterior sin afectar el nuevo.

Durante la revisión se reprodujo un caso adicional: si el contador ya correspondía al día siguiente con siete consumos, una solicitud del día anterior lo retrocedía y lo reiniciaba en uno. La condición de reinicio ahora solo permite avanzar a un día posterior (`fecha < día solicitado`). La regresión comprueba que se rechaza la solicitud tardía y se conservan fecha y siete consumos.

Resultado: las 23 condiciones pasaron. Evidencia: `Asistente_Cupo_MySQL_2026-10-23.json`. No acredita una llamada real a Groq ni la aceptación del Product Owner.
