const screen = document.getElementById('screen');
const progressBar = document.getElementById('progressBar');
const params = new URLSearchParams(location.search);
const PREVIEW_KEY = 'joker26';
const isPreview = params.get('preview') === PREVIEW_KEY;

const LOG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyOPk54xZe9HKeekrpCcuIMf9Me8gujKpi4_wwPpgTZleDuTzVRd6mt1GVvAQouUrF-/exec';
const sessionId = sessionStorage.getItem('biljana-session') || (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`);
sessionStorage.setItem('biljana-session', sessionId);
let currentQuestion = 'Tag 2';
let step = 0;
const totalSteps = 5;

function logEvent(action, value = '', status = 'Gewählt') {
  const payload = { besucher: sessionId, frage: `Tag 2 – ${currentQuestion}`, aktion: action, antwort: value, status };
  fetch(LOG_ENDPOINT, { method:'POST', body:JSON.stringify(payload), keepalive:true }).catch(()=>{});
}
function mount(html){ screen.innerHTML = html; progressBar.style.width = `${Math.min(100,(step/totalSteps)*100)}%`; }
function next(fn, delay=350){ setTimeout(()=>{ step++; fn(); },delay); }
function btn(label,id,cls='soft'){ return `<button class="btn ${cls}" id="${id}">${label}</button>`; }
function bind(id, handler){ document.getElementById(id).addEventListener('click', handler); }

function locked(){
  mount(`<div class="content fade-in"><p class="eyebrow">Tag 2</p><h2 class="question">Noch nicht. 👀</h2><p class="lead">Dieser Tag ist noch gesperrt.</p><a class="back-link" href="./">Zurück</a></div>`);
}

function greeting(){
  currentQuestion='Guten Morgen';
  mount(`<div class="content fade-in"><p class="eyebrow">Tag 2</p><h2 class="question">Dobro jutro, Biljana. ☀️</h2><p class="lead">Ja. Ich hab extra nachgeschaut. So viel Vorbereitung muss gewürdigt werden. 😂</p><div class="actions">${btn('Weiter','greet','primary')}</div></div>`);
  bind('greet',()=>next(compliment));
}

function compliment(){
  currentQuestion='Kompliment des Tages';
  mount(`<div class="content fade-in"><p class="eyebrow">Bevor wir anfangen …</p><h2 class="question">[Kompliment für morgen]</h2><p class="lead">So. Musste gesagt werden.</p><div class="actions">${btn('Weiter zum wichtigen Unsinn. 🃏','go','primary')}</div></div>`);
  bind('go',()=>next(joker));
}

function joker(){
  currentQuestion='Wofür verwendest du deinen Joker?';
  mount(`<div class="content fade-in"><p class="eyebrow">Heute bekommst du einen Joker 🃏</p><h2 class="question">Du kannst ihn genau einmal einsetzen. Wofür verwendest du ihn?</h2><div class="actions">
    ${btn('😴 Eine Verpflichtung streichen','duty')}
    ${btn('🎁 Mir etwas gönnen','treat')}
    ${btn('🔁 Einen Moment nochmal erleben','moment')}
    ${btn('⏭️ Einen Tag überspringen','skip')}
    ${btn('🃏 Joker behalten','keep')}
  </div></div>`);
  bind('duty',()=>{logEvent('Antwort gewählt','Eine Verpflichtung streichen'); next(()=>follow('duty'));});
  bind('treat',()=>{logEvent('Antwort gewählt','Mir etwas gönnen'); next(()=>follow('treat'));});
  bind('moment',()=>{logEvent('Antwort gewählt','Einen Moment nochmal erleben'); next(()=>follow('moment'));});
  bind('skip',()=>{logEvent('Antwort gewählt','Einen Tag überspringen'); next(()=>follow('skip'));});
  bind('keep',()=>{logEvent('Antwort gewählt','Joker behalten','Joker gespeichert'); localStorage.setItem('untitled-joker','saved'); next(()=>follow('keep'));});
}

function follow(type){
  const paths = {
    duty:{q:'Welche würden wir ganz zufällig verschwinden lassen?',o:[['Arbeit','a'],['Haushalt','b'],['Einen Termin','c'],['Sag ich lieber nicht 😏','d']]},
    treat:{q:'Aha. Und womit kaufen wir uns heute Glück?',o:[['Essen','a'],['Shopping','b'],['Wellness','c'],['Etwas ganz anderes …','text']]},
    moment:{q:'Okay … damit habe ich jetzt nicht gerechnet.',o:[['Schon lange her','a'],['Erst vor Kurzem','b'],['Ich weiß genau welchen 👀','text']]},
    skip:{q:'Verständlich. Welcher darf aus dem Kalender verschwinden?',o:[['Montag','a'],['Irgendein Arbeitstag','b'],['Heute','c'],['Kann ich gleich mehrere nehmen? 😂','d']]},
    keep:{q:'Aha. Strategisch. Das könnte noch Konsequenzen haben.',o:[['Man weiß ja nie','a'],['Für später','b'],['Ich traue dir nicht 😂','c']]}
  };
  const p=paths[type]; currentQuestion=p.q;
  mount(`<div class="content fade-in"><p class="eyebrow">Interessant …</p><h2 class="question">${p.q}</h2><div class="actions">${p.o.map(([label,id])=>btn(label,id)).join('')}</div><div id="extra"></div></div>`);
  p.o.forEach(([label,id])=>bind(id,()=>{
    logEvent('Folgeantwort gewählt',label);
    if(id==='text') return freeText(type);
    next(permission);
  }));
}

function freeText(type){
  document.querySelectorAll('.actions .btn').forEach(b=>{b.disabled=true;b.style.opacity='.45'});
  const label = type==='moment' ? 'Jetzt kannst du mich nicht damit sitzen lassen. 👀' : 'Na dann raus damit. 👀';
  document.getElementById('extra').innerHTML=`<div class="text-wrap fade-in"><label for="free">${label}</label><textarea id="free" maxlength="500" placeholder="Ich höre …"></textarea><button class="btn primary" id="send">Antwort abschicken</button><p class="helper" id="help"></p></div>`;
  bind('send',()=>{const v=document.getElementById('free').value.trim(); if(!v){document.getElementById('help').textContent='So leicht kommst du da jetzt nicht raus. 😏';return;} logEvent('Freitext eingegeben',v,'Gesendet'); next(permission);});
}

function permission(){
  currentQuestion='Soll hier noch ein Tag 3 auftauchen?';
  mount(`<div class="content fade-in"><p class="eyebrow">Eine Sache noch …</p><h2 class="question">Soll hier eigentlich noch ein Tag 3 auftauchen?</h2><div class="actions">
    ${btn('👀 Ja, ich bin neugierig.','yes')}
    ${btn('🤷 Von mir aus.','maybe')}
    ${btn('🛑 Nein, zwei Tage reichen mir.','no')}
  </div><p class="helper" id="reaction"></p></div>`);
  bind('yes',()=>finish('Ja, ich bin neugierig.','Okay … jetzt muss ich tatsächlich lächeln. 😊',true));
  bind('maybe',()=>finish('Von mir aus.','Diese Begeisterung ist kaum auszuhalten. 😂',true));
  bind('no',()=>finish('Nein, zwei Tage reichen mir.','Verstanden. Dann endet Untitled hier.',false));
}

function finish(value,text,continueAllowed){
  logEvent('Antwort gewählt',value,continueAllowed?'Fortsetzung erlaubt':'Fortsetzung abgelehnt');
  localStorage.setItem('untitled-continue',continueAllowed?'yes':'no');
  document.querySelectorAll('.actions .btn').forEach(b=>b.disabled=true);
  document.getElementById('reaction').textContent=text;
  progressBar.style.width='100%';
  setTimeout(()=>{mount(`<div class="content fade-in"><p class="eyebrow">Tag 2</p><h2 class="question">${text}</h2><p class="lead">Das war's für heute.</p><a class="back-link" href="./?preview=${PREVIEW_KEY}">Zurück zu Untitled</a></div>`); progressBar.style.width='100%';},1800);
}

if(isPreview) greeting(); else locked();