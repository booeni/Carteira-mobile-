const DB_NAME='fluxo-local-db', STORE='entries';
let db, period='day', selectedType='cash', records=[];
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const parseDate=s=>new Date(s+'T12:00:00');
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const store=req.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});store.createIndex('date','date')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function all(){return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function save(item){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).add(item);req.onsuccess=resolve;req.onerror=()=>reject(req.error)})}
function remove(id){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).delete(Number(id));req.onsuccess=resolve;req.onerror=()=>reject(req.error)})}
function startOfWeek(d){const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function inPeriod(item){const d=parseDate(item.date),now=parseDate(today());if(period==='day')return item.date===today();if(period==='week')return d>=startOfWeek(now)&&d<=now;if(period==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();return true}
function labelDate(s){return parseDate(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
function typeName(t){return ({cash:'Dinheiro / caixa',tip:'Gorjeta',code:'Código',other:'Outro'})[t]||'Outro'}
function typeIcon(t){return ({cash:'▣',tip:'✳',code:'⌗',other:'＋'})[t]||'＋'}
function render(){const filtered=records.filter(inPeriod),sum=a=>a.reduce((v,x)=>v+x.amount,0),total=sum(filtered);
$('periodTotal').textContent=money(total);$('entryCount').textContent=`${filtered.length} ${filtered.length===1?'lançamento':'lançamentos'}`;
$('periodLabel').textContent=({day:'Hoje',week:'Esta semana',month:'Este mês',all:'Todo o período'})[period];
$('tipsTotal').textContent=money(sum(filtered.filter(x=>x.type==='tip')));
$('otherTotal').textContent=money(sum(filtered.filter(x=>!['tip'].includes(x.type))));
const days=new Set(filtered.map(x=>x.date)).size;$('averageTotal').textContent=money(days?total/(period==='day'?1:days):0);
const chosen=filtered.filter(x=>$('filterType').value==='all'||x.type===$('filterType').value).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
$('entries').innerHTML=chosen.map(x=>`<div class="entry"><div class="entry-icon">${typeIcon(x.type)}</div><div class="entry-info"><b>${escapeHTML(x.note||typeName(x.type))}</b><small>${typeName(x.type)} · ${labelDate(x.date)}</small></div><div class="entry-amount">${money(x.amount)}</div><button class="delete" data-delete="${x.id}" aria-label="Excluir">×</button></div>`).join('');
$('empty').classList.toggle('hidden',chosen.length>0);drawChart(filtered)}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function chartData(items){const map={};items.forEach(x=>map[x.date]=(map[x.date]||0)+x.amount);let keys=[];
if(period==='day'){keys=[today()]}else if(period==='week'){const s=startOfWeek(parseDate(today()));for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);keys.push(d.toISOString().slice(0,10))}}else if(period==='month'){const n=parseDate(today());for(let i=1;i<=n.getDate();i++)keys.push(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`)}else{keys=Object.keys(map).sort().slice(-14)}
return keys.map(k=>({key:k,value:map[k]||0}))}
function drawChart(items){const canvas=$('chart'),ctx=canvas.getContext('2d'),data=chartData(items);const has=items.length>0;$('chartEmpty').classList.toggle('hidden',has);canvas.style.opacity=has?'1':'.18';
const w=canvas.clientWidth||320,h=170,dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
const pad={l:8,r:8,t:12,b:27},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b,max=Math.max(1,...data.map(x=>x.value))*1.18,step=cw/data.length;
ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillStyle='#858c95';ctx.strokeStyle='#30353b';ctx.lineWidth=1;
for(let i=0;i<3;i++){let y=pad.t+ch*i/2;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke()}
const pts=data.map((d,i)=>({x:pad.l+step*i+step/2,y:pad.t+ch-(d.value/max)*ch,value:d.value}));
if($('chartMode').value==='line'&&has){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#d9dee4';ctx.lineWidth=2.5;ctx.stroke();pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='#e4e8ec';ctx.fill()})}
else pts.forEach((p)=>{const bw=Math.max(3,Math.min(19,step*.48)),bh=pad.t+ch-p.y;ctx.fillStyle='#cbd1d8';ctx.beginPath();ctx.roundRect(p.x-bw/2,p.y,bw,Math.max(2,bh),4);ctx.fill()});
const stride=Math.max(1,Math.ceil(data.length/7));data.forEach((d,i)=>{if(i%stride===0||i===data.length-1){ctx.fillStyle='#858c95';ctx.fillText(period==='day'?'Hoje':labelDate(d.key),pad.l+step*i+step/2,h-8)}});$('chartRange').textContent=period==='all'?'Últimos 14 dias':({week:'Seg–Dom',month:'Do dia 1 até hoje',day:'Hoje'})[period]}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),1900)}
function openModal(){$('modal').classList.remove('hidden');$('amount').focus()}
function closeModal(){$('modal').classList.add('hidden')}
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');period=b.dataset.period;render()}));
document.querySelectorAll('.cat').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.cat').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedType=b.dataset.type}));
$('openForm').onclick=openModal;$('closeForm').onclick=closeModal;$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
$('date').value=today();
$('entryForm').addEventListener('submit',async e=>{e.preventDefault();const amount=Number($('amount').value);if(!(amount>0)){toast('Informe um valor válido');return}await save({amount,type:selectedType,note:$('note').value.trim(),date:$('date').value});records=await all();$('entryForm').reset();$('date').value=today();selectedType='cash';document.querySelectorAll('.cat').forEach(x=>x.classList.toggle('selected',x.dataset.type==='cash'));closeModal();render();toast('Lançamento salvo')});
$('entries').addEventListener('click',async e=>{const b=e.target.closest('[data-delete]');if(!b)return;if(confirm('Excluir este lançamento?')){await remove(b.dataset.delete);records=await all();render();toast('Registro excluído')}});
$('filterType').onchange=render;$('chartMode').onchange=()=>render();
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({app:'Fluxo',version:1,exportedAt:new Date().toISOString(),entries:records},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`fluxo-backup-${today()}.json`;a.click();URL.revokeObjectURL(url);toast('Backup exportado')};
(async()=>{try{db=await openDB();records=await all();render()}catch(e){toast('Não foi possível abrir o banco local')}})();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.addEventListener('resize',()=>drawChart(records.filter(inPeriod)));
