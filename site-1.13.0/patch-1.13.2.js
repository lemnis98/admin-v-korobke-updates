// Сайт «Клиенты 1С» 1.13.2: «без сервера» у точек, «5 точек». Запуск: node patch-1.13.2.js (в папке сайта)
const fs=require('fs');
const R=[
 ['app.js',"const VERSION='1.13.1';","const VERSION='1.13.2';"],
 ['app.js',"np>1?np+' точки'","np>1?np+(np%100>=5&&np%100<=20||np%10>=5||np%10===0?' точек':np%10===1?' точка':' точки')"],
 ['app.js',"${esc(s.server||s.id)}</span> ${SRVI[st.lv]}</span></div>`}).join('')}",
  "${esc(s.server||s.id)}</span> ${SRVI[st.lv]}</span></div>`}).join('')}${!srvOfPt(c,p).length&&srvOf(c.id).length?'<div class=\"kv\"><span>🖥 Сервер</span><span class=\"mut\">без сервера</span></div>':''}"],
 ['i18n.js',"[/(\\d+) точки/g,'$1 нүкте']","[/(\\d+) точ(?:ки|ек|ка)\\b/g,'$1 нүкте']"],
 ['i18n.js',"['Точка','Нүкте'],['точка','нүкте'],","['Точка','Нүкте'],['точка','нүкте'],['без сервера','серверсіз'],"],
 ['sw.js',"klienty-1c-v7","klienty-1c-v8"],
];
const src={};let bad=0;
for(const [f,a,b] of R){src[f]=src[f]||fs.readFileSync(f,'utf8');const n=src[f].split(a).length-1;if(n!==1){console.log('НЕ НАЙДЕНО ('+n+'):',f,a.slice(0,60));bad++}else src[f]=src[f].replace(a,()=>b)}
if(bad){console.log('Ничего не записано.');process.exit(1)}
for(const f in src){new Function(src[f]);fs.writeFileSync(f,src[f])}
console.log('OK: app.js, i18n.js, sw.js изменены');
