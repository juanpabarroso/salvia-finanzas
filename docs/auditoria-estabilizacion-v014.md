# Salvia — Auditoría de estabilización v0.14 (2026-11-09)

## Estado de salida
**Candidato técnico, no versión estable certificada.** Se han aplicado correcciones en los cinco frentes solicitados, pero no existe todavía evidencia de que el flujo automatizado de navegador haya finalizado correctamente en GitHub Actions. No afirmar que las pruebas end-to-end pasaron sin consultar el resultado de la ejecución.

## 1. Datos, copias, importación y reset — CORREGIDO EN CÓDIGO
- `backup-v14.js` exporta un paquete versionado que incluye `salvia-v03`, `salvia-plan-v10`, `salvia-daily-v11` y `salvia-salary-v12`.
- La importación valida estructura, cuentas, referencias, movimientos, fechas, recurrencias, presupuestos y configuraciones. Admite copias antiguas de la estructura principal v3, restableciendo supuestos externos.
- La sustitución usa `salviaStore.replace` y dispone de reversión ante errores de escritura. El reset elimina configuraciones y el legado `salvia-v04-income`, para impedir reaparición de cobros.
- Limitación: no hay transacciones atómicas de localStorage ni almacenamiento remoto; el navegador sigue siendo la única fuente.

## 2. Motor de cálculo y pruebas — CORREGIDO EN CÓDIGO, PRUEBAS PARCIALES
- `finance-core-v14.js` centraliza calendario de recurrencias, vencimientos, orden de eventos y simulación diaria.
- `planning-v10.js` usa las mismas reglas de recurrencias que tesorería diaria.
- `daily-cashflow-v11.js` y `salary-compare-v13.js` usan el mismo motor para mínimos, cierres y días naturales bajo reserva.
- Separación explícita entre mínimo intradía tras evento y días naturales cuyo cierre queda bajo la reserva.
- 13 verificaciones directas del motor superadas en la sesión, además de una comprobación de paridad del neto anual entre 12 y 17 pagas.
- Tests reproducibles: `tests/finance-core.test.cjs` y `tests/integration-static.test.cjs`.

## 3. Navegación, sincronización y móvil — CORREGIDO EN CÓDIGO
- Eliminado el botón duplicado del calendario financiero.
- `navigation-v06.js` reconoce rutas de análisis, objetivos y planificación, con títulos, subtítulos y refrescos.
- Notificación `salvia:data-changed` sincroniza vistas tras cambios del estado principal.
- Mejorado foco y navegación con teclado del modal de movimiento rápido.
- Fechas locales en formato ISO independientes del idioma del navegador.

## 4. Pruebas integrales — INFRAESTRUCTURA CREADA; EJECUCIÓN E2E PENDIENTE DE CONFIRMAR
- `.github/workflows/validation.yml` ejecuta tests Node y smoke tests con Chromium/Playwright.
- `tests/browser-smoke.mjs` cubre escritorio (1365 px) y móvil (390 px): navegación, 17 pagas, comparación, tesorería diaria, exportación, importación y reset.
- Revisión sintáctica de 11 archivos y referencias de scripts: 0 errores detectados en la sesión.
- **No se ha observado el resultado final de GitHub Actions ni se ha inspeccionado visualmente el navegador desplegado.** Debe revisarse en Actions, corregir cualquier fallo y repetir.

## 5. Publicación — CANDIDATO, NO ESTABLE
- Los cambios están en la rama principal del repositorio, pero no se ha etiquetado una versión estable.
- Requisitos para marcar estable: workflow verde, inspección visual en móvil y escritorio, verificación de datos de ejemplo, importación/restablecimiento sin pérdidas y revisión de accesibilidad.

## Errores corregidos
1. Exportación omitía configuraciones salariales y de tesorería.
2. Reset/import dejaban supuestos antiguos y posible reimportación de cobros legacy.
3. Calendario financiero duplicaba entrada de navegación.
4. Comparativa salarial tenía un error sintáctico introducido al integrar el motor.
5. Conteo de «fechas con riesgo» no representaba días naturales de saldo insuficiente.
6. Los módulos calculaban recurrencias mediante implementaciones distintas.
7. La navegación carecía de metadatos y refrescos de vistas nuevas.
8. El modal no restituía correctamente el foco al cerrarse.
9. Las fechas locales dependían de un formato regional potencialmente variable.

## Riesgos residuales
- Sin backend, autenticación ni sincronización; no introducir datos bancarios reales.
- Los gastos variables diarios siguen siendo hipótesis concentradas en un día.
- Las 17 pagas se repiten anualmente como patrón y pueden cambiar.
- El saldo no está conciliado con bancos ni movimientos futuros.
- Falta la evidencia final de la ejecución automatizada en navegador y su revisión visual.

## Criterio operativo
Hasta que GitHub Actions esté verde y exista revisión visual, clasificar la versión como **v0.14 RC / pendiente de validación E2E**, nunca como producción estable.
