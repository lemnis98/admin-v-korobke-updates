'use strict';
/* Компьютерный вид (с 1.13.0): на широком экране (от 1100 px) меню слева,
   список клиентов в левой колонке, карточка клиента, сервер или «Требует внимания» — справа без перехода на другой экран.
   На телефоне и в узком окне всё как раньше: этот файл ничего не меняет. */
const DESKQ=matchMedia('(min-width:1100px)');
const isDesk=()=>DESKQ.matches;
const DSPLIT=['list','card','srv','alerts'];
const deskBase=window.render;
let deskOpen=null;
function deskHome(){
  const h=bkNag()+reqNag()+vSum()+vSrvTile();
  return h+`<div class="card dhint"><div class="dhi">👈</div><div><b>Выберите клиента в списке</b><p class="mut">Карточка откроется здесь. ↑ ↓ — следующий и предыдущий клиент, Esc — закрыть карточку.</p></div></div>`;
}
/* список без сводки и плашек: они справа, когда клиент не выбран */
function deskList(){
  const k={bkNag,reqNag,vSum,vSrvTile},none=()=>'';
  window.bkNag=window.reqNag=window.vSum=window.vSrvTile=none;
  try{return vList()}finally{Object.assign(window,k)}
}
window.render=function(){
  document.body.classList.toggle('desk',isDesk());
  const split=isDesk()&&DSPLIT.includes(TAB)&&!$('#shell').hidden;
  document.body.classList.toggle('dsplit',split);
  if(!split)return deskBase();
  const lp=$('#app .dpl'),ls=lp?lp.scrollTop:0,rp=$('#app .dpr'),rs=rp?rp.scrollTop:0;
  const same=deskOpen===TAB+':'+(OPEN||'');deskOpen=TAB+':'+(OPEN||'');
  const q0=document.activeElement&&document.activeElement.id==='q';
  deskBase();                               // меню, шапка, значок — как обычно
  if(!S.ready)return;
  const right=TAB==='card'?vCard():TAB==='srv'?vSrv():TAB==='alerts'?vAlerts():deskHome();
  $('#app').innerHTML=`<div class="dsp"><section class="dpl">${deskList()}</section><section class="dpr">${right}</section></div>`;
  const L=$('#app .dpl'),R=$('#app .dpr');
  if(TAB==='card')deskCols(R);
  L.scrollTop=ls;R.scrollTop=same?rs:0;
  if(TAB==='card')L.querySelectorAll('.cl').forEach(e=>{if(e.getAttribute('onclick')===`openC('${OPEN}')`){e.classList.add('on');if(!same)deskSee(e)}});
  if(q0||rFocus){const s=$('#q');if(s){s.focus();s.setSelectionRange(s.value.length,s.value.length)}rFocus=0}
};
/* очень широкий экран (от 1500 px): карточка клиента в две колонки. Блоки раскладываются по очереди в более короткую колонку.
   (CSS columns не годится: в колонке с прокруткой лишние блоки уходили в невидимую третью колонку — пропадали «Точки») */
const DWIDE=matchMedia('(min-width:1500px)');
function deskCols(R){
  if(!DWIDE.matches)return;
  const items=[...R.children],head=items.shift(),tail=items.length&&items[items.length-1].tagName==='P'?items.pop():null;
  if(items.length<2)return;
  const w=document.createElement('div');w.className='dcols';const c1=document.createElement('div'),c2=document.createElement('div');w.append(c1,c2);
  R.insertBefore(w,tail);
  let h1=0,h2=0;items.forEach(el=>{const h=el.offsetHeight||200;if(h1<=h2){c1.appendChild(el);h1+=h+12}else{c2.appendChild(el);h2+=h+12}});
}
DWIDE.addEventListener('change',()=>render());
/* выбранный клиент виден в списке, даже если открыт по ↑ ↓ */
function deskSee(e){const L=e.closest('.dpl');if(!L)return;const a=e.offsetTop-L.offsetTop,b=a+e.offsetHeight;
  if(a<L.scrollTop+60)L.scrollTop=Math.max(0,a-60);else if(b>L.scrollTop+L.clientHeight-20)L.scrollTop=b-L.clientHeight+20}
addEventListener('keydown',e=>{
  if(!document.body.classList.contains('dsplit')||$('#sheet').classList.contains('show')||e.ctrlKey||e.altKey||e.metaKey)return;
  const t=e.target,typing=t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);
  if(e.key==='Escape'&&TAB!=='list'&&!typing){e.preventDefault();go('list');return}
  if((e.key==='ArrowDown'||e.key==='ArrowUp')&&(!typing||t.id==='q')){
    const ids=[...document.querySelectorAll('.dpl .cl')].map(x=>(x.getAttribute('onclick')||'').match(/^openC\('([^']+)'\)$/)).filter(Boolean).map(m=>m[1]).filter((v,i,a)=>a.indexOf(v)===i);
    if(!ids.length)return;
    e.preventDefault();
    const i=TAB==='card'?ids.indexOf(OPEN):-1,n=e.key==='ArrowDown'?Math.min(ids.length-1,i+1):Math.max(0,i<0?0:i-1);
    if(t&&t.id==='q')t.blur();
    openC(ids[n]);
  }
});
/* Окна на компьютере: большие (сервер, документы, отчёты) — на весь экран; у всех сверху кнопка «✕ Закрыть», Esc закрывает */
const deskSheet=window.sheet;
window.sheet=function(){const r=deskSheet.apply(this,arguments);deskBox();return r};
function deskBox(){
  const b=$('#box');if(!b)return;
  b.classList.toggle('dfull',isDesk()&&!!b.querySelector('.sv-tiles,.docprev,.sv-hero,.doc-a4,.rp-sec,.pl'));
  const h=b.querySelector('h2.sh');
  if(h&&!h.querySelector('.dx'))h.insertAdjacentHTML('beforeend','<button type="button" class="dx" onclick="closeS()" title="Закрыть (Esc)">✕ Закрыть</button>');
}
addEventListener('keydown',e=>{if(e.key==='Escape'&&isDesk()&&$('#sheet').classList.contains('show')){e.preventDefault();e.stopImmediatePropagation();closeS()}},true);
DESKQ.addEventListener('change',()=>render());
DESKQ.addEventListener('change',()=>{if($('#sheet').classList.contains('show'))deskBox()});
document.body.classList.toggle('desk',isDesk());
if(!$('#shell').hidden)render();
