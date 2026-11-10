(()=>{'use strict';
const finite=x=>Number.isFinite(Number(x))?Number(x):0;
const balance=(account,transactions=[])=>finite(account.opening)+transactions.reduce((sum,t)=>sum+(t.to===account.id?finite(t.amount):0)-(t.from===account.id?finite(t.amount):0),0);
const classify=(accounts=[],transactions=[],meta={})=>accounts.map(account=>({account,balance:balance(account,transactions),available:account.kind!=='investment'&&meta[account.id]?.available!==false}));
const snapshot=(data={},meta={})=>{
const accounts=Array.isArray(data.accounts)?data.accounts:[],tx=Array.isArray(data.tx)?data.tx:[],assets=Array.isArray(data.assetsDetailed)?data.assetsDetailed:[],debts=Array.isArray(data.debts)?data.debts:[];
const rows=classify(accounts,tx,meta),cash=rows.reduce((s,r)=>s+r.balance,0),available=rows.filter(r=>r.available).reduce((s,r)=>s+r.balance,0);
const financial=assets.filter(a=>['fund','stock','bond','pension'].includes(a.kind)).reduce((s,a)=>s+finite(a.value),0),physical=assets.filter(a=>!['fund','stock','bond','pension'].includes(a.kind)).reduce((s,a)=>s+finite(a.value),0);
const debt=debts.reduce((s,d)=>s+finite(d.balance),0),assetTotal=financial+physical;
const issues=[];
if(accounts.some(a=>a.kind==='investment')&&financial>0)issues.push('Revisa que las cuentas antiguas de inversión representen solo efectivo y no incluyan valores duplicados.');
if(accounts.some(a=>!meta[a.id]?.updated&&finite(a.opening)!==0))issues.push('Hay saldos iniciales sin fecha de referencia: los movimientos previos podrían estar contabilizados dos veces.');
if(debts.some(d=>!Number.isFinite(Number(d.balance))||Number(d.balance)<0))issues.push('Hay deudas con saldos pendientes inválidos.');
if(assets.some(a=>!Number.isFinite(Number(a.value))||Number(a.value)<0))issues.push('Hay activos con valoraciones inválidas.');
return {rows,cash,available,restricted:cash-available,financial,physical,debt,assetTotal,financialCapital:cash+financial,netWorth:cash+assetTotal-debt,issues};
};
window.salviaFinancialSnapshot={balance,classify,snapshot};
})();