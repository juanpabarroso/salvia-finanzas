# Salvia — infraestructura segura (diseño, no desplegada)

## Estado
La demo actual se publica en GitHub Pages, es estática y guarda los datos en localStorage. **No introducir información financiera sensible**. No existe backend, login, cifrado de datos almacenados por usuario ni sincronización.

## Arquitectura objetivo
- Frontend estático sin secretos.
- Autenticación Supabase Auth (PKCE, verificación de correo y recuperación de sesión).
- PostgreSQL con políticas RLS obligatorias para cada tabla privada.
- API de Cloudflare Workers para validación de importaciones y lógica sensible, verificando el JWT y autorización por usuario.
- Secretos exclusivamente en variables de entorno del servidor; nunca en GitHub ni JavaScript público.
- Registros monetarios en céntimos enteros (o NUMERIC en base de datos), con divisa ISO 4217 y fechas explícitas.
- Libro mayor de transferencias con dos apuntes relacionados; transacción atómica, no dos movimientos independientes.
- Cuentas, movimientos, deudas, posiciones de inversión, reglas recurrentes y presupuestos con owner_id.
- Backups, borrado de cuenta, exportación y política de retención; auditoría de accesos y modificaciones.
- Importación bancaria por CSV inicialmente; cualquier integración bancaria posterior requiere revisión de proveedor, seguridad y obligaciones regulatorias.

## Controles previos a datos reales
1. Login y cierre de sesión comprobados.
2. RLS probada con dos usuarios: un usuario no puede leer ni modificar filas ajenas.
3. Validación server-side de importes, moneda, fechas, transferencias y duplicados.
4. Pruebas de idempotencia y conciliación; tests de importación malformada.
5. Política de privacidad, RGPD, minimización de datos, consentimiento y análisis de riesgos.
6. Copias de seguridad cifradas, restauración ensayada y gestión de incidentes.
7. Desactivar cualquier almacenamiento de datos financieros reales en localStorage.

## Restricciones de la demo v0.4
El calendario y el libro de movimientos aún usan dos claves locales separadas. Las previsiones no son pagos confirmados. El saldo inicial del calendario se introduce manualmente. No hay sincronización ni acceso multiusuario.

## Roadmap técnico
- v0.4: diseño visual y calendario local.
- v0.5: motor de recurrencias unificado, importación/exportación completa, pruebas.
- v0.6: Auth + DB + RLS + API, migración guiada.
- v0.7: conciliación y seguridad auditada antes de introducir finanzas reales.
