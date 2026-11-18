(function(root,factory){const api=factory(root?.SalviaFinance);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SalviaAnalysis=api})(typeof window!=='undefined'?window:null,function(finance){'use strict';
const monthOK=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(m));
const shift=(m,n)=>{const [y,k]=m.split('-').map(Number);const d=new Date(Date.UTC(y,k-1+n,1));return d.toISOString().slice(0,7)};
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
function analyze(state,opts={},core=finance){if(!core?.normalizedTransactions||!core?.reconciliationReport)throw Error('Motor financiero no disponible');
const end=opts.end,count=Number(opts.count||6);if(!monthOK(end)||![3,6,12].includes(count))throw Error('Periodo inválido');
const months=Array.from({length:count},(_,i)=>shift(end,i-count+1)),start=months[0],today=opts.today||new Date().toISOString().slice(0,10);
const tx=core.normalizedTransactions(state),rows=months.map(month=>{const t=tx.filter(x=>x.date.slice(0,7)===month),income=round(t.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0)),expense=round(t.filter(x=>x.type==='expense').reduce((a,x)=>a+x.amount,0));return{month,income,expense,net:round(income-expense),hasData:t.some(x=>x.type!=='transfer'),incomeCount:t.filter(x=>x.type==='income').length,expenseCount:t.filter(x=>x.type==='expense').length}});
const totals={income:round(rows.reduce((a,r)=>a+r.income,0)),expense:round(rows.reduce((a,r)=>a+r.expense,0))};totals.net=round(totals.income-totals.expense);
const categories=new Map();for(const t of tx)if(t.type==='expense'&&t.date.slice(0,7)>=start&&t.date.slice(0,7)<=end){const c=String(t.category||'Sin categoría');categories.set(c,round((categories.get(c)||0)+t.amount))}
const ranked=[...categories].map(([name,amount])=>({name,amount,share:totals.expense>0?round(amount/totals.expense*100):0})).sort((a,b)=>b.amount-a.amount);
const report=core.reconciliationReport(state),complete=rows.filter(r=>r.month<today.slice(0,7)&&r.hasData),coverage=rows.filter(r=>r.hasData).length,signals=[];
const signal=(code,level,title,detail,evidence)=>signals.push({code,level,title,detail,evidence});
if(!coverage)signal('no_data','info','Sin movimientos suficientes','Registra ingresos y gastos para empezar a analizar.',{months:count});
else if(coverage<Math.min(3,count))signal('low_coverage','info','Historial limitado','No se pueden establecer tendencias sólidas con tan pocos meses de actividad.',{monthsWithActivity:coverage,monthsRequested:count});
if(end>=today.slice(0,7))signal('partial_period','info','Periodo posiblemente incompleto','El último mes seleccionado puede contener movimientos pendientes de registrar.',{end,today});
if(report.warnings.length)signal('data_quality','warning','Revisa la coherencia de tus datos','Se han detectado referencias o automatizaciones que necesitan comprobación.',{warnings:report.warnings.length,codes:[...new Set(report.warnings.map(w=>w.code))]});
if(coverage>=2&&totals.net<0)signal('negative_balance','warning','Gastos superiores a ingresos','El balance de movimientos registrados es negativo; no equivale necesariamente a una caída del patrimonio.',{income:totals.income,expense:totals.expense,net:totals.net});
if(ranked.length&&ranked[0].share>=40&&totals.expense>0)signal('category_concentration','info','Gasto concentrado en una categoría',ranked[0].name+' representa una parte elevada de los gastos registrados.',{category:ranked[0].name,share:ranked[0].share,amount:ranked[0].amount});
if(complete.length>=2){const a=complete.at(-2),b=complete.at(-1);if(a.expense>0){const change=round((b.expense-a.expense)/a.expense*100);if(Math.abs(change)>=15)signal('expense_change',change>0?'warning':'info','Variación relevante del gasto','Comparación de dos meses completos con actividad; verifica si hay pagos extraordinarios.',{from:a.month,to:b.month,previous:a.expense,current:b.expense,percent:change})}}
const recurringCount=tx.filter(t=>t.type==='expense'&&t.date.slice(0,7)>=start&&t.date.slice(0,7)<=end&&t.origin==='recurring').length;
return{version:1,period:{start,end,count,monthsWithActivity:coverage,completeMonthsWithActivity:complete.length},rows,totals,categories:ranked,signals,quality:{warnings:report.warnings,transactions:tx.length,recurringExpenseTransactions:recurringCount,limitedCoverage:coverage<Math.min(3,count)},methodology:'Solo movimientos registrados normalizados; traspasos excluidos; sin estimaciones ni rentabilidad implícita.'}}
return{analyze,shift,monthOK};
});