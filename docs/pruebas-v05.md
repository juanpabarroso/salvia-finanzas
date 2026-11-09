# Salvia v0.5 — Plan de pruebas y criterios de cierre

Estado: código publicado en main; **pruebas de navegador pendientes**.

## Pruebas funcionales imprescindibles
1. Crear dos cuentas, una con 1.000 € y otra con 0 €. Transferir 200 €. Verificar 800 € / 200 € y activos constantes en 1.000 €.
2. Registrar gasto de 50 €. Verificar activos de 950 €.
3. Crear cobro de 1.300 € mensual, fecha día 31. En febrero debe aparecer el último día del mes.
4. Crear compromiso trimestral de 90 € con vencimiento enero. Debe aparecer en enero, abril, julio y octubre, no en febrero.
5. Crear compromiso anual de 120 € en marzo. Debe aparecer cada marzo a partir del año de inicio.
6. Exportar JSON, borrar datos, importar JSON. Deben restaurarse cuentas, movimientos, presupuestos, compromisos y cobros programados.
7. Confirmar que programar cobros y compromisos NO modifica el saldo real.
8. Revisar en iPhone la navegación, los formularios y la tabla de calendario.
9. Verificar que la migración de v0.4 no duplica cobros tras recargar la página.
10. Comprobar que no se usa la aplicación con datos financieros sensibles: sigue siendo una demo local.

## Limitaciones abiertas
- El saldo inicial de previsión se introduce manualmente, no se deriva del saldo bancario de una fecha.
- No se concilian previsiones contra movimientos confirmados; pueden coexistir como dos registros distintos.
- La clasificación de amortización de préstamos todavía es simplificada.
- El cálculo de recurrencias se basa en fecha ancla y no contempla excepciones, días laborables o cambios de importe.
- No hay autenticación, backend, sincronización ni controles multiusuario. No se debe declarar lista para producción.

## Siguiente iteración
- Motor de eventos previsto/confirmado con identificador compartido y reconciliación.
- Persistencia con importación validada y pruebas automáticas.
- Preparar backend seguro, RLS, autenticación y pruebas con dos usuarios.
