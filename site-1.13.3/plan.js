'use strict';
/* План обслуживания в окне сервера (сайт 1.13.3, программа с 1.10.54 присылает поле sched).
   sched: задания через «;», поля через «|»: имя|1/0|триггеры|последний запуск|код|следующий запуск.
   Триггеры: dЧЧ:ММ — каждый день, wМАСКА@ЧЧ:ММ — дни недели (1=вс, 2=пн … 64=сб), b — при включении, l — при входе, +PT30M — повтор.
   Время ггггММддЧЧмм по часам сервера. Пока сервер не прислал sched — блока нет. */
const PLN={'Backup-Full':'Полная копия','Backup-Diff':'Ночная разностная копия','Backup-DiffDay':'Дневные разностные копии','Maint-Weekly':'Проверка баз и индексы',
  'Maint-Stats':'Статистика SQL','Check-Health':'Ежедневная проверка','Check-Verify':'Проверка копий','Check-Services':'Присмотр за службами',
  'Restart-1C':'Перезапуск службы 1С','Backup-Copy':'Вторая копия','Backup-Cloud':'Выгрузка в облако','Update':'Обновление программы',
  'Report':'Отчёт на сайт','Helper-Server':'Связь с помощником кассы'};
const PLD=['вс','пн','вт','ср','чт','пт','сб'];
const plT=v=>{const m=String(v||'').match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)$/);return m?new Date(+m[1],m[2]-1,+m[3],+m[4],+m[5]):null};
const plHM=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
function plDay(d,ref){const a=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate()),b=new Date(d.getFullYear(),d.getMonth(),d.getDate()),n=Math.round((b-a)/864e5);
  return n===0?'сегодня':n===-1?'вчера':n===1?'завтра':PLD[d.getDay()]+' '+String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')}
function plIv(x){const m=String(x||'').match(/PT?(?:(\d+)H)?(?:(\d+)M)?/);if(!m)return '';const h=+(m[1]||0),mi=+(m[2]||0);return 'каждые '+(h?h+' ч':'')+(h&&mi?' ':'')+(mi?mi+' мин':'')}
function plDays(mask){const on=[1,2,3,4,5,6,0].filter(i=>mask&(1<<i));if(on.length===7)return 'каждый день';
  if(on.length===6){const off=[0,1,2,3,4,5,6].find(i=>!(mask&(1<<i)));return 'кроме '+PLD[off]}
  return on.map(i=>PLD[i]).join(', ')}
/* разбор: [{id,name,on,trg:[{k,hm,mask,iv}],last,res,next}] */
function plParse(s){
  return String(s.sched||'').split(';').filter(Boolean).map(r=>{const f=r.split('|');
    const trg=String(f[2]||'').split(',').filter(Boolean).map(x=>{const [a,iv]=x.split('+');
      if(a[0]==='d')return {k:'d',hm:a.slice(1),mask:127,iv};
      if(a[0]==='w'){const [m,hm]=a.slice(1).split('@');return {k:'w',hm,mask:+m||0,iv}}
      return {k:a[0],hm:a.slice(1),mask:0,iv}});
    return {id:f[0],name:PLN[f[0]]||f[0],on:f[1]!=='0',trg,last:plT(f[3]),res:+f[4]||0,next:plT(f[5])}});
}
/* код результата Планировщика → [текст, класс] */
function plRes(t){
  if(!t.on)return ['выключено','pl-off'];
  if(t.res===0x41301)return ['выполняется','pl-run'];
  if(!t.last||t.res===0x41303)return ['ещё не запускалось','pl-off'];
  if(t.res===0)return ['успешно','pl-ok'];
  if(t.res===0x41306)return ['прервано','pl-bad'];
  if(t.res===0x41300||t.res===0x41302)return ['успешно','pl-ok'];
  return ['ошибка, код '+t.res,'pl-bad'];
}
function plWhen(t){
  const p=t.trg.map(g=>g.k==='b'?'при включении ПК'+(g.iv?', '+plIv(g.iv):''):g.k==='l'?'при входе':g.k==='o'?'один раз '+g.hm:g.iv&&g.k==='d'?plIv(g.iv):(g.k==='w'?plDays(g.mask):'каждый день')+' '+g.hm+(g.iv?', '+plIv(g.iv):''));
  /* несколько времён в одни и те же дни — одной строкой: «каждый день 12:00, 16:00, 20:00» */
  const tm=t.trg.filter(g=>(g.k==='d'||g.k==='w')&&!g.iv);
  if(tm.length>1&&tm.length===t.trg.length&&tm.every(g=>g.mask===tm[0].mask))return (tm[0].mask===127?'каждый день':plDays(tm[0].mask))+' '+tm.map(g=>g.hm).sort().join(', ');
  return p.join('; ')||'—';
}
function vPlan(s){
  const T=plParse(s);if(!T.length)return '';
  const ref=srvAt(s)||new Date(),now=new Date(),dow=now.getDay();
  /* по времени суток; то, что работает постоянно (при включении, каждые N минут), — в конце */
  const first=t=>{if(t.trg.some(g=>g.iv||g.k==='b'||g.k==='l'))return '~';const h=t.trg.filter(g=>/^\d\d:\d\d$/.test(g.hm||'')).map(g=>g.hm).sort();return h.length?h[0]:'~'};
  T.sort((a,b)=>{const x=first(a),y=first(b);return x<y?-1:x>y?1:a.name.localeCompare(b.name,'ru')});
  /* полоса суток: сегодняшние запуски по времени */
  const marks=[];
  T.filter(t=>t.on).forEach(t=>t.trg.forEach(g=>{if(!(g.k==='d'||g.k==='w')||!(g.mask&(1<<dow))||g.iv||!/^\d\d:\d\d$/.test(g.hm))return;
    const [h,m]=g.hm.split(':').map(Number),at=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m);
    const r=plRes(t),done=t.last&&t.last>=at,cls=at>now?'pl-off':done?r[1]:'pl-bad';
    marks.push(`<i class="pl-dot ${cls}" style="left:${((h*60+m)/1440*100).toFixed(2)}%" title="${esc(g.hm+' · '+t.name)}"></i>`)}));
  const nowX=((now.getHours()*60+now.getMinutes())/1440*100).toFixed(2);
  const bar=marks.length?`<div class="pl-bar"><div class="pl-ax"></div>${marks.join('')}<div class="pl-now" style="left:${nowX}%"><b>${plHM(now)}</b></div>
    ${[0,6,12,18,24].map(h=>`<span class="pl-h" style="left:${h/24*100}%">${String(h).padStart(2,'0')}:00</span>`).join('')}</div>`:'';
  const rows=T.map(t=>{const r=plRes(t);
    return `<div class="pl-row${t.on?'':' pl-dis'}"><span class="pl-n"><i class="${r[1]}"></i>${esc(t.name)}<small>${esc(plWhen(t))}</small></span>
      <span class="${r[1]}">${t.last&&t.on&&t.res!==0x41303?esc(plDay(t.last,ref)+' '+plHM(t.last)+' · '):''}${esc(r[0])}</span>
      <span class="mut">${t.on&&t.next?'дальше: '+esc(plDay(t.next,ref)+' '+plHM(t.next)):''}</span></div>`}).join('');
  return `<details class="sv-box pl" open><summary class="sv-h">📅 План обслуживания<span class="mut">по Планировщику Windows на сервере · отчёт ${esc(srvWhen(s))}</span></summary>${bar}<div class="pl-list">${rows}</div></details>`;
}
/* блок встаёт в окно сервера под «Службы…», над «Подробнее» */
(function(){const base=window.srvView;window.srvView=function(s,st){return base(s,st)+vPlan(s)}})();
(function(){const st=document.createElement('style');st.textContent=`
.pl summary{list-style:none;cursor:pointer;display:flex;flex-direction:column;gap:2px}.pl summary::-webkit-details-marker{display:none}
.pl summary .mut{font-weight:400;font-size:12px}
.pl-bar{position:relative;height:52px;margin:14px 10px 4px}
.pl-ax{position:absolute;left:0;right:0;top:20px;height:6px;border-radius:3px;background:var(--chip)}
.pl-dot{position:absolute;top:15px;width:16px;height:16px;margin-left:-8px;border-radius:50%;border:3px solid var(--card);background:var(--c)}
.pl-now{position:absolute;top:8px;width:2px;height:30px;margin-left:-1px;background:var(--tx)}
.pl-now b{position:absolute;top:-15px;left:-15px;font-size:11px}
.pl-h{position:absolute;top:36px;font-size:11px;color:var(--mut);transform:translateX(-50%)}
.pl-list{display:grid}
.pl-row{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) minmax(0,.8fr);gap:10px;padding:8px 0;border-top:1px solid var(--line);align-items:center;font-size:14px}
.pl-n{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px}.pl-n small{flex-basis:100%;color:var(--mut);font-size:12px;padding-left:18px}
.pl-n>i{width:10px;height:10px;border-radius:50%;background:var(--c);flex:none}
.pl-dis{opacity:.55}
.pl-ok{--c:#22a55a;color:#22a55a}.pl-bad{--c:#e5484d;color:#e5484d}.pl-run{--c:#2563eb;color:#4c86f0}.pl-off{--c:#8c97ad;color:var(--mut)}
.pl-row .pl-n{color:var(--tx)}
@media(max-width:600px){.pl-row{grid-template-columns:1fr;gap:2px}.pl-row>span:not(.pl-n){padding-left:18px;font-size:13px}.pl-bar{margin:14px 14px 4px}}
`;document.head.appendChild(st)})();
