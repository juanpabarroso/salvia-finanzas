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
// Compare only months before the current one; a calendar-complete month is not proof that every receipt was entered.
const monthTransactions=month=>tx.filter(t=>t.date.slice(0,7)===month);
const extraordinary=t=>{const label=String([t.concept,t.category,t.description].filter(Boolean).join(' ')).toLowerCase();return /extraordinari|paga extra|bonus|bonificaci[oó]n|atrasos|incentivo|prima anual|devoluci[oó]n|reembolso|venta puntual|indemnizaci[oó]n/.test(label)||t.salviaExtraordinary===true||t.extraordinary===true};
const annualExpense=t=>{const label=String([t.concept,t.category,t.description].filter(Boolean).join(' ')).toLowerCase();return /anual|impuesto|ibi|seguro|matr[ií]cula|renovaci[oó]n|suscripci[oó]n anual/.test(label)||t.salviaFrequency==='yearly'||t.frequency==='yearly'||t.salviaAnnual===true};
const classified=rows.map(r=>{const all=monthTransactions(r.month),inExtra=round(all.filter(t=>t.type==='income'&&extraordinary(t)).reduce((a,t)=>a+t.amount,0)),outAnnual=round(all.filter(t=>t.type==='expense'&&annualExpense(t)).reduce((a,t)=>a+t.amount,0));return{month:r.month,extraordinaryIncome:inExtra,annualExpenses:outAnnual,ordinaryIncome:round(r.income-inExtra),ordinaryExpense:round(r.expense-outAnnual)}});
// Source-linked recurrence is evidence; similar amounts alone never establish an obligation.
const recurringExpense=t=>t.type==='expense'&&(t.origin==='recurring'||t.origin==='debt');
const classifiedRecurring=rows.map(r=>{const expenses=monthTransactions(r.month).filter(t=>t.type==='expense'),linked=round(expenses.filter(recurringExpense).reduce((a,t)=>a+t.amount,0)),annual=round(expenses.filter(annualExpense).reduce((a,t)=>a+t.amount,0)),oneOff=round(expenses.filter(t=>!recurringExpense(t)&&!annualExpense(t)).reduce((a,t)=>a+t.amount,0));return{month:r.month,linkedRecurringExpense:linked,otherRegisteredExpense:round(r.expense-linked),potentialOneOffExpense:oneOff,annualExpense:annual,linkedShare:r.expense?round(linked/r.expense*100):null}});
const history=rows.filter(r=>r.month<today.slice(0,7)&&r.hasData);
const stability=type=>{const key=type==='income'?'ordinaryIncome':'ordinaryExpense',values=history.map(r=>classified.find(c=>c.month===r.month)[key]);if(values.length<3||values.some(v=>v<=0))return{status:'insufficient_data',months:values.length,reason:'Se requieren al menos tres meses anteriores al actual, con importes ordinarios positivos registrados.'};const mean=values.reduce((a,v)=>a+v,0)/values.length,variance=values.reduce((a,v)=>a+(v-mean)**2,0)/values.length,variation=round(Math.sqrt(variance)/mean*100);return{status:variation<=10?'low_variation':variation<=25?'moderate_variation':'high_variation',variationPercent:variation,months:values.length,average:round(mean),basis:'Variabilidad de movimientos ordinarios registrados; no acredita que todos los meses estén completos.'}};
const incomeStability=stability('income'),expenseStability=stability('expense');
if(incomeStability.status==='high_variation')signal('income_volatility','info','Ingresos ordinarios variables','Los ingresos registrados varían entre meses; no se considera automáticamente una pérdida de ingresos recurrentes.',{variationPercent:incomeStability.variationPercent,months:incomeStability.months});
if(expenseStability.status==='high_variation')signal('expense_volatility','info','Gastos ordinarios variables','Los gastos registrados muestran variaciones; comprueba pagos puntuales o movimientos todavía no clasificados.',{variationPercent:expenseStability.variationPercent,months:expenseStability.months});
// Possible unlinked recurring charges are suggestions only; never create or debit obligations automatically.
const normalizeConcept=t=>String(t.concept||t.description||'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b\d{4}[-/]\d{1,2}\b/g,'').replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
const candidates=new Map();
for(const t of tx){if(t.type!=='expense'||recurringExpense(t)||annualExpense(t)||t.date.slice(0,7)<start||t.date.slice(0,7)>end||t.date.slice(0,7)>=today.slice(0,7))continue;const name=normalizeConcept(t);if(name.length<5)continue;const key=name+'|'+(t.category||'');if(!candidates.has(key))candidates.set(key,[]);candidates.get(key).push(t)}
const unlinkedRecurringCandidates=[...candidates].flatMap(([key,list])=>{const byMonth=new Map();for(const t of list){const m=t.date.slice(0,7);if(!byMonth.has(m))byMonth.set(m,[]);byMonth.get(m).push(t)}if(byMonth.size<3)return[];const singles=[...byMonth.values()];if(singles.some(x=>x.length!==1))return[];const amounts=singles.map(x=>x[0].amount),mean=amounts.reduce((a,v)=>a+v,0)/amounts.length;if(mean<=0||amounts.some(v=>Math.abs(v-mean)>Math.max(1,mean*.05)))return[];return[{concept:list[0].concept||list[0].description,category:list[0].category||'Sin categoría',months:[...byMonth.keys()].sort(),averageAmount:round(mean),count:byMonth.size,confidence:'possible',reason:'Concepto y cuantía similares en al menos tres meses distintos; requiere confirmación del usuario.'}]});
if(unlinkedRecurringCandidates.length)signal('unlinked_recurring_candidates','info','Posibles gastos habituales sin vincular','Se han encontrado patrones repetidos que conviene revisar. No se crearán cuotas automáticamente.',{count:unlinkedRecurringCandidates.length});
const todayMonth=today.slice(0,7),todayDay=today;
const balances=core.cashBalances?.(state)||[];
const activeAccounts=(state?.accounts||[]).filter(a=>a.kind!=='investment'&&!a.closedAt&&!a.salviaArchivedAt);
const accountIds=new Set(activeAccounts.map(a=>a.id));
const futureTx=tx.filter(t=>t.date>todayDay);
const futureDelta=futureTx.reduce((v,t)=>v+(accountIds.has(t.accountTo)?t.amount:0)-(accountIds.has(t.accountFrom)?t.amount:0),0);
const validBalances=balances.filter(x=>Number.isFinite(x.balance));
const liquid=round(validBalances.reduce((a,x)=>a+x.balance,0)-futureDelta);
const horizon=Number(opts.horizon||3);
if(![3,6,12].includes(horizon))throw Error('Horizonte inválido');
const projection=Array.from({length:horizon},(_,i)=>{
 const month=shift(todayMonth,i),year=Number(month.slice(0,4)),m=Number(month.slice(5,7));
 const forecast=core.forecastMonth?.(state,year,m,{includeScheduledIncome:true});
 const pending=(forecast?.pending||[]).filter(e=>e.date>=todayDay);
 const futureRecorded=futureTx.filter(t=>t.date.slice(0,7)===month);
 const obligations=pending.filter(e=>e.kind==='expense'&&['recurring','debt','planned'].includes(e.source)).concat(futureRecorded.filter(t=>t.type==='expense').map(t=>({date:t.date,amount:t.amount,concept:t.concept||'Gasto con fecha futura',source:'future_recorded'})));
 const income=pending.filter(e=>e.kind==='income'&&e.source==='scheduled').concat(futureRecorded.filter(t=>t.type==='income').map(t=>({date:t.date,amount:t.amount,concept:t.concept||'Ingreso con fecha futura',source:'future_recorded'})));
 return{month,knownCommitments:round(obligations.reduce((a,e)=>a+e.amount,0)),scheduledIncome:round(income.reduce((a,e)=>a+e.amount,0)),commitmentCount:obligations.length,scheduledIncomeCount:income.length,obligations:obligations.map(e=>({date:e.date,amount:e.amount,concept:e.concept,source:e.source}))};
});
const totalCommitments=round(projection.reduce((a,r)=>a+r.knownCommitments,0));
const scheduledIncome=round(projection.reduce((a,r)=>a+r.scheduledIncome,0));
const available=round(liquid-totalCommitments);
const capacity={
 status:validBalances.length?'partial_estimate':'insufficient_data',
 liquidBalance:validBalances.length?liquid:null,
 committedPayments:validBalances.length?projection[0].knownCommitments:null,
 afterKnownCommitments:validBalances.length?round(liquid-projection[0].knownCommitments):null,
 horizonMonths:horizon,projection,totalKnownCommitments:validBalances.length?totalCommitments:null,
 afterHorizonCommitments:validBalances.length?available:null,scheduledIncome:validBalances.length?scheduledIncome:null,
 asOf:today,knownPending:projection[0].obligations,
 limitations:'Saldo calculado hasta la fecha seleccionada, excluyendo movimientos posteriores. Los compromisos incluyen obligaciones identificadas y gastos con fecha futura registrados. No incluye gastos variables, cuotas sin configurar ni restricciones de liquidez; no equivale a dinero libre.'
};
// Historical expense proxy is a scenario, not an obligation: it excludes recorded linked
// installments and annual payments, which are already handled separately where configured.
const historical=rows.filter(r=>r.month<todayMonth&&r.hasData);
const historicalExpense=historical.map(r=>({month:r.month,ordinaryExpense:classified.find(c=>c.month===r.month).ordinaryExpense,unlinked:classifiedRecurring.find(c=>c.month===r.month).potentialOneOffExpense}));
const expenseSample=historicalExpense.filter(r=>r.ordinaryExpense>0);
const median=values=>{const a=[...values].sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2};
const variableBaseline=expenseSample.length>=3?round(median(expenseSample.map(r=>r.unlinked))):null;
const variableProjection=variableBaseline===null?null:projection.map(r=>({month:r.month,low:round(variableBaseline*.8),central:variableBaseline,high:round(variableBaseline*1.2)}));
const historicalNet=historical.map(r=>r.net);
const savingsForecast={
 status:variableBaseline===null?'insufficient_data':'illustrative_only',amount:null,monthlyAverage:null,
 reason:variableBaseline===null?'Se necesitan al menos tres meses con gastos registrados para estimar gastos variables.':'Se ha estimado un gasto variable de referencia a partir de la mediana histórica. No se puede certificar ahorro futuro sin verificar ingresos y gastos completos.',
 variableExpenseBaseline:variableBaseline,variableProjection,
 scenarios:variableBaseline===null?null:{
 conservative:round(scheduledIncome-totalCommitments-variableBaseline*horizon*1.2),
 central:round(scheduledIncome-totalCommitments-variableBaseline*horizon),
 optimistic:round(scheduledIncome-totalCommitments-variableBaseline*horizon*.8)
 },
 historicalMonthlyAverage:historical.length>=3?round(historicalNet.reduce((a,v)=>a+v,0)/historicalNet.length):null,
 historicalMonths:historical.length,
 conditionalNetFromScheduled:round(scheduledIncome-totalCommitments),
 disclaimer:'Escenarios condicionados a ingresos explícitamente programados, cuotas conocidas y gastos variables históricos. No representan ahorro disponible ni garantizado; si faltan nóminas programadas, los escenarios pueden ser negativos pese a tener ingresos habituales.'
};
if(capacity.status==='partial_estimate'&&available<0)signal('known_commitments_exceed_cash','warning','Compromisos conocidos superiores al saldo registrado','Los pagos identificados en el horizonte seleccionado superan el saldo actual sin contar futuros ingresos. Verifica saldos y obligaciones.',{liquid:capacity.liquidBalance,committed:totalCommitments,horizonMonths:horizon,shortfall:round(-available)});
if(variableBaseline!==null)signal('variable_expense_baseline','info','Referencia de gastos no vinculados','Estimación orientativa a partir de meses anteriores; no es una obligación futura ni incluye necesariamente todos los gastos.',{monthlyMedian:variableBaseline,sampleMonths:expenseSample.length});
if(complete.length>=2){const prev=complete.at(-2),last=complete.at(-1),p=classified.find(r=>r.month===prev.month),c=classified.find(r=>r.month===last.month);
if(prev.expense>0){const change=round((last.expense-prev.expense)/prev.expense*100),ordinaryChange=p.ordinaryExpense>0?round((c.ordinaryExpense-p.ordinaryExpense)/p.ordinaryExpense*100):null;
if(Math.abs(change)>=15){if(ordinaryChange!==null&&Math.abs(ordinaryChange)<15&&p.annualExpenses+c.annualExpenses>0)signal('annual_expense_effect','info','Variación influida por gastos anuales','El cambio del gasto total se explica en parte por pagos clasificados como anuales; no se interpreta como aumento habitual.',{from:prev.month,to:last.month,totalPercent:change,ordinaryPercent:ordinaryChange,annualExpensesPrevious:p.annualExpenses,annualExpensesCurrent:c.annualExpenses});
else signal('expense_change',change>0?'warning':'info','Variación del gasto registrado','Cambio entre meses anteriores al actual. Revisa los gastos puntuales y confirma que ambos meses están completos.',{from:prev.month,to:last.month,previous:prev.expense,current:last.expense,percent:change,ordinaryPercent:ordinaryChange,annualExpensesPrevious:p.annualExpenses,annualExpensesCurrent:c.annualExpenses})}}
if(prev.income>0){const change=round((last.income-prev.income)/prev.income*100),ordinaryChange=p.ordinaryIncome>0?round((c.ordinaryIncome-p.ordinaryIncome)/p.ordinaryIncome*100):null;
if(Math.abs(change)>=15&&ordinaryChange!==null&&Math.abs(ordinaryChange)<15&&p.extraordinaryIncome+c.extraordinaryIncome>0)signal('extraordinary_income_effect','info','Cambio de ingresos explicado por cobros extraordinarios','Las pagas extras u otros ingresos identificados como puntuales se separan de los ingresos ordinarios.',{from:prev.month,to:last.month,totalPercent:change,ordinaryPercent:ordinaryChange,extraordinaryPrevious:p.extraordinaryIncome,extraordinaryCurrent:c.extraordinaryIncome});
else if(Math.abs(change)>=20)signal('income_change','info','Variación de ingresos registrada','El cambio puede incluir cobros pendientes o extraordinarios sin clasificar; verifica el origen antes de interpretarlo como tendencia.',{from:prev.month,to:last.month,totalPercent:change,ordinaryPercent:ordinaryChange})}}
if(classified.some(r=>r.extraordinaryIncome>0))signal('extraordinary_income_detected','info','Cobros extraordinarios identificados','Estos cobros se muestran separados en el análisis y no se consideran automáticamente ingresos mensuales recurrentes.',{months:classified.filter(r=>r.extraordinaryIncome>0).map(r=>({month:r.month,amount:r.extraordinaryIncome}))});
if(classified.some(r=>r.annualExpenses>0))signal('annual_expense_detected','info','Pagos anuales identificados','Un pago anual registrado no implica que se repita cada mes. Se muestra su impacto sin inventar próximos vencimientos.',{months:classified.filter(r=>r.annualExpenses>0).map(r=>({month:r.month,amount:r.annualExpenses}))});
const recurringCount=tx.filter(t=>t.type==='expense'&&t.date.slice(0,7)>=start&&t.date.slice(0,7)<=end&&t.origin==='recurring').length;
return{version:6,unlinkedRecurringCandidates,capacity,savingsForecast,classification:classified,recurrence:classifiedRecurring,stability:{income:incomeStability,expense:expenseStability},period:{start,end,count,monthsWithActivity:coverage,completeMonthsWithActivity:complete.length},rows,totals,categories:ranked,signals,quality:{warnings:report.warnings,transactions:tx.length,recurringExpenseTransactions:recurringCount,limitedCoverage:coverage<Math.min(3,count)},methodology:'Solo movimientos registrados normalizados; traspasos excluidos. Recurrencia confirmada solo mediante vínculos de movimientos a obligaciones; otros gastos no se presumen puntuales. Clasificación de extras y pagos anuales basada en etiquetas o marcas explícitas: es orientativa, no una confirmación. Mes anterior al actual no implica registro completo. Sin estimaciones ni rentabilidad implícita.'}}
return{analyze,shift,monthOK};
});