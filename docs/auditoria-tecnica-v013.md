# Auditoría técnica de Salvia — 2026-11-09

## Alcance
Revisión estática de index.html, navigation-v06.js, calendar-v04.js, analytics-v08.js, goals-v09.js, planning-v10.js, daily-cashflow-v11.js, salary-v12.js y salary-compare-v13.js. No se ha ejecutado una batería automatizada de navegador ni se ha verificado el despliegue de GitHub Pages. Las observaciones son hallazgos de código, no resultados de pruebas end-to-end.

## Riesgos prioritarios

### P0 — Integridad de datos y copias
- index.html exporta únicamente el estado `salvia-v03`. Las claves `salvia-plan-v10`, `salvia-daily-v11` y `salvia-salary-v12` quedan fuera de la copia. El estado del menú también es independiente, aunque menos crítico.
- La importación y el restablecimiento de `salvia-v03` no limpian las tres configuraciones externas; pueden sobrevivir supuestos antiguos y combinarse con cuentas o movimientos importados.
- La validación de importación comprueba principalmente formas superficiales; requiere validación estricta de fechas, IDs únicos, referencias a cuentas, frecuencias y coherencia de importes.

### P1 — Exactitud financiera
- El indicador `riskCount` de salary-compare-v13.js cuenta fechas con eventos por debajo del umbral, NO días naturales completos en riesgo. Etiquetar claramente o calcular duración diaria.
- En daily-cashflow-v11.js el mínimo es tras eventos, no un saldo reconciliado. Gastos variables se imputan íntegramente en una fecha configurada.
- planning-v10.js aproxima los compromisos recurrentes por mes; las fechas exactas se modelan en daily-cashflow-v11.js. Ambos resultados pueden parecer divergentes sin explicación.
- En salary-v12.js los cobros se repiten por patrón anual y no se adaptan a cambios de salario ni al calendario laboral real.
- La opción «Estimar con movimientos registrados» de planning-v10.js puede descontar compromisos dos veces si los gastos registrados no corresponden al mismo conjunto de compromisos.
- La evolución del balance acumulado de analytics-v08.js no representa patrimonio ni valoraciones de inversiones.

### P1 — Arquitectura y sincronización
- Los módulos incorporados a partir de v0.8 añaden botones de navegación mediante scripts propios y no comparten un registro de rutas central. `navigation-v06.js` solo conoce títulos y subtítulos de rutas iniciales.
- Las actualizaciones de `salviaStore.save()` no notifican automáticamente a todos los módulos; varias vistas se actualizan únicamente al abrirlas o interactuar con sus controles.
- El código de UI y cálculo está acoplado; faltan funciones puras compartidas y pruebas de regresión.

### P2 — Accesibilidad, seguridad y UX
- Se necesitan pruebas de teclado, foco y cierre de menú/modal en móvil.
- Los datos permanecen en localStorage, sin autenticación, cifrado de aplicación ni sincronización; usar únicamente datos ficticios.
- La interfaz contiene secciones y mensajes acumulados por versiones; conviene revisar coherencia visual, duplicación y responsive.

## Plan de corrección recomendado
1. Crear un formato único de exportación/importación versionado que incluya datos principales y configuraciones financieras; validar antes de sustituir nada y ofrecer copia de seguridad previa.
2. Centralizar motor financiero con funciones puras para calendario de eventos, recurrencias, saldos, reserva y comparación de escenarios.
3. Introducir pruebas unitarias de calendario: febrero bisiesto, día 31, dos pagas en el mismo día, cobros después de pagos, cambio de año, gastos trimestrales y meses sin datos.
4. Unificar navegación, estado activo y actualizaciones entre módulos.
5. Ejecutar pruebas end-to-end en escritorio y móvil con datos ficticios, exportación/importación, reset y controles de accesibilidad.
6. Solo entonces marcar una versión como candidata estable.

## Criterio de salida
No declarar Salvia apta para datos financieros reales ni fiable para decisiones hasta superar pruebas automatizadas y manuales, reconciliación de casos de prueba y revisión de privacidad.
