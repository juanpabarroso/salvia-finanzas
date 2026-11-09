(()=>{'use strict';
const store=window.salviaStore,host=document.getElementById('dashboard');if(!store||!host)return;
const old=document.createElement('div');old.id='salvia-legacy-dashboard';old.hidden=true;while(host.firstChild)old.appendChild(host.firstChild);host.appendChild(old);
const root=document.createElement('div');root.id='salvia-dashboard-v17';host.insertBefore(root,old);
const accountsSection=document.getElementById('accounts');
if(accountsSection){const box=document.createElement('div');box.className='sd17-account-confirm';box.innerHTML='<strong>¿Tus saldos actuales son correctos?</strong><p>Salvia incluye cuentas iniciales con saldo cero como ejemplo. Confirma sus importes, incluso si realmente son 0 €, para que la liquidez se considere declarada.</p><button type="button" class="btn secondary" id="sd17-confirm-accounts">Confirmar saldos de mis cuentas</button>';accountsSection.insertBefore(box,accountsSection.firstChild);box.querySelector('button').addEventListener('click',()=>{const d=store.get();if(!Array.isArray(d.accounts)||!d.accounts.length)return;localStorage.setItem('salvia-dashboard-v17',JSON.stringify({...config(),confirmedAccounts:true}));render();box.querySelector('button').textContent='Saldos confirmados ✓'})}

const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const safe=n=>Number(n)||0;
const month=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const baseNames=['Cuenta principal','Cartera','Cuenta remunerada','Inversiones'];
const isSeed=a=>baseNames.includes(a.name)&&Number(a.opening)===0&&['main','cash','saving','invest'].includes(a.id);
const balance=(a,tx)=>safe(a.opening)+tx.reduce((s,t)=>s+(t.to===a.id?safe(t.amount):0)-(t.from===a.id?safe(t.amount):0),0);
const config=()=>{try{return JSON.parse(localStorage.getItem('salvia-dashboard-v17'))||{}}catch{return {}}};
const tile=(name,value,desc,route,ready,cta)=>'<article class="sd17-tile"><div class="sd17-top"><span>'+name+'</span><span class="sd17-status '+(ready?'sd17-ok':'')+'">'+(ready?'Registrado':'Pendiente')+'</span></div><div class="sd17-value '+(ready?'':'sd17-empty')+'">'+(ready?value:'Sin datos suficientes')+'</div><p>'+desc+'</p><button type="button" data-sd17-go="'+route+'">'+(ready?'Ver detalle':'Completar: '+cta)+' <span aria-hidden="true">↗</span></button></article>';
function render(){
const d=store.get(),tx=Array.isArray(d.tx)?d.tx:[],accounts=Array.isArray(d.accounts)?d.accounts:[],rec=Array.isArray(d.recurring)?d.recurring:[],goals=Array.isArray(d.goals)?d.goals:[],income=Array.isArray(d.scheduledIncome)?d.scheduledIncome:[],conf=config();
const m=month(),mt=tx.filter(t=>String(t.date||'').startsWith(m)),ins=mt.filter(t=>t.type==='income'),outs=mt.filter(t=>t.type==='expense');
const configured=accounts.some(a=>!isSeed(a))||tx.length>0||!!conf.confirmedAccounts;
const liquid=accounts.filter(a=>a.kind!=='investment').reduce((s,a)=>s+balance(a,tx),0);
const hasMovement=ins.length>0||outs.length>0;
const monthlyIn=ins.reduce((s,t)=>s+safe(t.amount),0),monthlyOut=outs.reduce((s,t)=>s+safe(t.amount),0);
const hasRecurring=rec.some(r=>safe(r.amount)>0&&r.due);
let salaryConfigured=false;try{const s=JSON.parse(localStorage.getItem('salvia-salary-v12'));salaryConfigured=Array.isArray(s?.entries)&&s.entries.some(x=>safe(x.amount)>0)}catch{}const hasIncome=income.some(x=>safe(x.amount)>0)||salaryConfigured;
const hasPlan=hasIncome&&hasRecurring&&configured;
const goal=goals.find(g=>safe(g.target)>0)||goals.find(g=>safe(g.amount)>0);
const goalTarget=goal?safe(goal.target||goal.amount):0;
const goalCurrent=goal?safe(goal.saved||goal.current||goal.progress):0;
const ready=[configured,hasMovement,hasRecurring,hasPlan,!!goal,hasMovement&&configured];
const count=ready.filter(Boolean).length;
const attention=[];
if(!configured)attention.push(['Para empezar','Confirma tus saldos actuales. Las cuentas iniciales de ejemplo no se consideran datos tuyos.','accounts']);
else if(!hasMovement)attention.push(['Actividad pendiente','Registra movimientos para conocer el balance real del mes.','movements']);
if(!hasRecurring)attention.push(['Pagos previstos','Añade tus compromisos para anticipar vencimientos.','recurring']);
if(!hasIncome)attention.push(['Ingresos habituales','Configura tus cobros para preparar una previsión.','planning']);
if(!goal)attention.push(['Ahorro','Si tienes una meta, puedes registrarla y seguir su progreso.','goals']);
if(configured&&hasMovement&&monthlyOut>monthlyIn)attention.unshift(['Revisa tu balance','Los gastos registrados del mes superan los ingresos registrados. Comprueba si faltan operaciones.','movements']);
const label='<div class="sd17-head"><div><span class="sd17-eyebrow">CENTRO DE CONTROL</span><h2>Tu economía, de un vistazo.</h2><p>Una visión que se completa con la información que registras en Salvia.</p></div><div class="sd17-progress"><strong>'+count+' de '+ready.length+'</strong><span>indicadores con datos</span><div class="sd17-track"><i style="width:'+(100*count/ready.length)+'%"></i></div></div></div>';
const cards='<div class="sd17-grid">'+
tile('Liquidez registrada',money(liquid),'Suma de saldos declarados y movimientos, excluyendo inversiones. No está conciliada con el banco.','accounts',configured,'cuentas y saldos')+
tile('Balance del mes',money(monthlyIn-monthlyOut),'Ingresos menos gastos registrados en el mes. No representa necesariamente el balance completo.','movements',hasMovement,'movimientos')+
tile('Próximos compromisos',rec.length+' compromiso'+(rec.length===1?'':'s'),'Pagos recurrentes registrados; consulta sus fechas e importes en el calendario.','recurring',hasRecurring,'pagos previstos')+
tile('Previsión de liquidez','Disponible en Plan financiero','La proyección se calcula en su apartado con hipótesis editables; aquí no duplicamos el motor.','planning',hasPlan,'saldo, ingresos y compromisos')+
tile('Objetivo de ahorro',goalTarget>0?money(goalCurrent)+' / '+money(goalTarget):'Objetivo registrado','Seguimiento de tu meta prioritaria según los datos aportados.','goals',!!goal,'objetivo')+
tile('Análisis financiero','Ver observaciones','Lectura de movimientos registrados; no es un informe autónomo generado por IA.','analytics',hasMovement&&configured,'datos de actividad')+'</div>';
const list=attention.slice(0,3).map(a=>'<div class="sd17-action"><div><strong>'+a[0]+'</strong><p>'+a[1]+'</p></div><button type="button" data-sd17-go="'+a[2]+'">Revisar ↗</button></div>').join('');
root.innerHTML=label+cards+'<section class="sd17-next"><div class="sd17-section-head"><h3>Lo que merece tu atención</h3><span>Hasta 3 próximos pasos</span></div>'+(list||'<p>Sin avisos con las reglas actuales. Esto no significa que todos los datos estén completos o actualizados.</p>')+'</section><p class="sd17-note">Los indicadores muestran información declarada, no datos bancarios verificados. Un indicador registrado no garantiza que hayas incorporado todas las operaciones.</p>';
if(!configured){const action=root.querySelector('[data-sd17-go="accounts"]');if(action)action.textContent='Añadir o confirmar saldos ↗'}
}
root.addEventListener('click',e=>{const b=e.target.closest('[data-sd17-go]');if(b)window.salviaGo?.(b.dataset.sd17Go)});
const style=document.createElement('style');style.textContent=`
#salvia-legacy-dashboard{display:none!important}.sd17-account-confirm{border:1px solid #38655e;border-radius:12px;background:#183c3c;padding:17px;margin-bottom:18px}.sd17-account-confirm strong{color:#e8fff5}.sd17-account-confirm p{font-size:13px;line-height:1.6;color:#b7d4d1}#salvia-dashboard-v17{max-width:1300px;margin:auto}.sd17-head{display:flex;justify-content:space-between;gap:24px;align-items:center;margin:0 0 25px}.sd17-eyebrow{font-size:11px;color:#71dfb9;letter-spacing:.14em;font-weight:800}.sd17-head h2{font-size:clamp(26px,2.8vw,36px);letter-spacing:-.035em;margin:8px 0;color:#f5fcff}.sd17-head p,.sd17-tile p,.sd17-action p,.sd17-note{color:#9fb9c9;line-height:1.6}.sd17-head p{margin:0}.sd17-progress{min-width:175px;border:1px solid #355261;border-radius:12px;padding:15px;background:#132c3b}.sd17-progress strong{display:block;color:#80e6c2;font-size:20px}.sd17-progress span{font-size:11px;color:#a5bdc9}.sd17-track{height:6px;background:#294657;border-radius:20px;overflow:hidden;margin-top:10px}.sd17-track i{display:block;height:100%;background:#65deb6;border-radius:20px}.sd17-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.sd17-tile{display:flex;flex-direction:column;gap:13px;min-height:210px;background:#132a3a;border:1px solid #2d4c5b;border-radius:16px;padding:21px}.sd17-top{display:flex;justify-content:space-between;gap:8px;align-items:start}.sd17-top>span:first-child{font-size:13px;color:#d5e6eb;font-weight:750}.sd17-status{font-size:10px;border-radius:50px;background:#354453;color:#cfdae0;padding:5px 8px;white-space:nowrap}.sd17-status.sd17-ok{background:#204d43;color:#93f2cc}.sd17-value{font-size:clamp(18px,1.7vw,25px);font-weight:800;color:#eafaf5;line-height:1.2}.sd17-value.sd17-empty{font-size:17px;color:#adc0cd}.sd17-tile p{font-size:12px;margin:0;flex:1}.sd17-tile button,.sd17-action button{border:0;background:none;padding:4px 0;text-align:left;color:#7ce9c4;font-weight:750;cursor:pointer}.sd17-tile button:hover,.sd17-action button:hover{text-decoration:underline}.sd17-tile button:focus-visible,.sd17-action button:focus-visible{outline:2px solid #7ce9c4;outline-offset:3px}.sd17-next{margin-top:20px;border:1px solid #315363;border-radius:16px;padding:22px;background:#102637}.sd17-section-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.sd17-section-head h3{color:#fff;margin:0 0 14px;font-size:19px}.sd17-section-head>span{font-size:11px;color:#92b0bf}.sd17-action{display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:1px solid #284452;padding:13px 0}.sd17-action strong{color:#eaf7f4;font-size:13px}.sd17-action p{margin:5px 0 0;font-size:12px}.sd17-action button{white-space:nowrap}.sd17-note{font-size:11px;margin:15px 0}@media(max-width:1050px){.sd17-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.sd17-grid{grid-template-columns:1fr}.sd17-head{align-items:stretch;flex-direction:column}.sd17-progress{min-width:0}.sd17-tile{min-height:175px}.sd17-section-head{align-items:start;flex-direction:column}.sd17-action{align-items:start;flex-direction:column;gap:6px}}
`;document.head.appendChild(style);
window.salviaDashboardRefresh=render;
window.addEventListener('salvia:data-changed',render);window.addEventListener('storage',e=>{if(['salvia-salary-v12','salvia-dashboard-v17','salvia-v03'].includes(e.key))render()});
window.addEventListener('salvia:go',e=>{if(e.detail==='dashboard')render()});
render();
})();