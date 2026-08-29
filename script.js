const screen = document.getElementById("screen");
const progressBar = document.getElementById("progressBar");

const TOTAL_STEPS = 7;
let step = 0;
let currentQuestion = "Heute siehst du wieder mal wunderschön aus.";

const LOG_ENDPOINT = "https://script.google.com/macros/s/AKfycbyOPk54xZe9HKeekrpCcuIMf9Me8gujKpi4_wwPpgTZleDuTzVRd6mt1GVvAQouUrF-/exec";

const sessionId = sessionStorage.getItem("biljana-session") ||
  (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`);
sessionStorage.setItem("biljana-session", sessionId);

const ACTION_NAMES = {
  choice: "Antwort gewählt",
  blocked_attempt: "Gesperrte Antwort versucht",
  free_text: "Freitext eingegeben",
  completed: "Seite abgeschlossen"
};

function logEvent(type, data = {}) {
  // Seitenaufrufe bleiben lokal, machen das Google-Sheet aber nicht unnötig voll.
  const localEntry = { sessionId, timestamp: new Date().toISOString(), type, step, frage: currentQuestion, ...data };
  const local = JSON.parse(localStorage.getItem("biljana-events") || "[]");
  local.push(localEntry);
  localStorage.setItem("biljana-events", JSON.stringify(local));

  if (type === "page_view" || !LOG_ENDPOINT) return;

  const payload = {
    besucher: sessionId,
    frage: currentQuestion,
    aktion: ACTION_NAMES[type] || type,
    antwort: data.value || "",
    status: data.status || (type === "blocked_attempt" ? "Gesperrt" : type === "completed" ? "Abgeschlossen" : "Gewählt")
  };

  if (data.attempt) payload.status += ` – Versuch ${data.attempt}`;
  if (data.transformedTo) payload.status += ` → ${data.transformedTo}`;

  fetch(LOG_ENDPOINT, { method: "POST", body: JSON.stringify(payload), keepalive: true }).catch(() => {});
}

function setProgress() {
  progressBar.style.width = `${Math.max(0, Math.min(100, (step / TOTAL_STEPS) * 100))}%`;
}
function mount(html) { screen.innerHTML = html; setProgress(); }
function next(renderFn, delay = 320) { setTimeout(() => { step++; renderFn(); }, delay); }
function choiceButton(label, cls = "soft", attrs = "") { return `<button class="btn ${cls}" ${attrs}>${label}</button>`; }

function attachNormalChoices(onChosen) {
  screen.querySelectorAll("[data-choice]").forEach(btn => btn.addEventListener("click", () => {
    const value = btn.dataset.choice;
    logEvent("choice", { value, status: "Gewählt" });
    btn.classList.add("pop");
    onChosen(value, btn);
  }));
}

function makeEscapingButton(btn, label) {
  let attempts = 0;
  const escape = ev => {
    ev.preventDefault(); attempts++;
    logEvent("blocked_attempt", { value: label, attempt: attempts, status: "Gesperrt" });
    const maxX = Math.max(0, Math.min(140, screen.clientWidth - btn.offsetWidth - 20));
    btn.style.transform = `translate(${(Math.random()*2-1)*maxX}px, ${(Math.random()*2-1)*90}px)`;
    const helper = screen.querySelector(".helper");
    if (helper) helper.textContent = attempts === 1 ? "Netter Versuch 😏" : attempts === 2 ? "Der Button hat heute andere Pläne." : "Hartnäckig. Gefällt mir. 😄";
  };
  ["pointerdown", "mouseenter", "touchstart"].forEach(evt => btn.addEventListener(evt, escape, { passive:false }));
}

function renderIntro() {
  step = 0; currentQuestion = "Heute siehst du wieder mal wunderschön aus.";
  const template = document.getElementById("introTemplate");
  screen.replaceChildren(template.content.cloneNode(true)); setProgress();
  logEvent("page_view");
  attachNormalChoices(() => next(renderMood));
}

function renderMood() {
  currentQuestion = "Wie geht es dir heute?";
  mount(`<div class="content fade-in"><p class="eyebrow">Kurzer Check</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Wunderbar 😊","primary",'data-choice="Wunderbar"')}${choiceButton("Ja, geht so 🙂","soft",'data-choice="Ja, geht so"')}${choiceButton("Eher nicht so gut 😕","danger-ish escape",'id="badMood"')}</div><p class="helper"></p></div>`);
  logEvent("page_view"); attachNormalChoices(() => next(renderPerson)); makeEscapingButton(document.getElementById("badMood"), "Eher nicht so gut 😕");
}

function renderPerson() {
  currentQuestion = "Wie findest du eigentlich den Menschen, der dir diesen Link geschickt hat?";
  mount(`<div class="content fade-in"><p class="eyebrow">Jetzt wird's wichtig</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Schon ziemlich toll ❤️","primary",'data-choice="Schon ziemlich toll ❤️"')}${choiceButton("Man kann ihn aushalten 😏","soft",'id="tolerable"')}${choiceButton("Frag lieber nicht 🙄","danger-ish escape",'id="dontAsk"')}</div><p class="helper"></p></div>`);
  logEvent("page_view");
  screen.querySelector('[data-choice]').addEventListener("click", () => { logEvent("choice", {value:"Schon ziemlich toll ❤️",status:"Gewählt"}); next(renderAttention); });
  const tolerable=document.getElementById("tolerable"); tolerable.addEventListener("click",()=>{ logEvent("choice",{value:"Man kann ihn aushalten 😏",transformedTo:"Schon ziemlich toll ❤️",status:"Umgewandelt"}); tolerable.textContent="Schon ziemlich toll ❤️"; tolerable.classList.add("pop"); screen.querySelector(".helper").textContent="Ich wusste, was du eigentlich sagen wolltest. 😌"; next(renderAttention,900); });
  makeEscapingButton(document.getElementById("dontAsk"),"Frag lieber nicht 🙄");
}

function renderAttention() {
  currentQuestion="Wie hoch ist heute dein Bedürfnis nach Aufmerksamkeit?";
  mount(`<div class="content fade-in"><p class="eyebrow">Sehr wissenschaftlich</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Sehr hoch 🥰","primary",'data-choice="Sehr hoch 🥰"')}${choiceButton("Ein bisschen geht immer 😌","soft",'data-choice="Ein bisschen geht immer 😌"')}${choiceButton("Ich brauche keine 🚫","danger-ish",'id="noAttention"')}</div><p class="helper"></p></div>`);
  logEvent("page_view"); attachNormalChoices(()=>next(renderGoodThing));
  const no=document.getElementById("noAttention"); no.addEventListener("click",ev=>{ev.preventDefault();logEvent("blocked_attempt",{value:"Ich brauche keine 🚫",status:"Gesperrt"});screen.querySelector(".helper").textContent="Diese Antwort wurde wegen offensichtlicher Unglaubwürdigkeit gesperrt. 😌";});
}

function renderGoodThing() {
  currentQuestion="Angenommen, jemand würde dir heute etwas Gutes tun wollen …";
  mount(`<div class="content fade-in"><p class="eyebrow">Rein hypothetisch natürlich</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Blumen wären akzeptabel 💐","soft",'data-choice="Blumen wären akzeptabel 💐"')}${choiceButton("Mit Essen kann man mich bestechen 🍫","soft",'data-choice="Mit Essen kann man mich bestechen 🍫"')}${choiceButton("Eine Umarmung wäre toll 🤗","primary",'data-choice="Eine Umarmung wäre toll 🤗"')}</div></div>`);
  logEvent("page_view"); attachNormalChoices(()=>next(renderMakeDayBetter));
}

function renderMakeDayBetter() {
  currentQuestion="Was könnte deinen Tag heute noch ein kleines bisschen schöner machen?";
  mount(`<div class="content fade-in"><p class="eyebrow">Nur noch ein kleines bisschen neugierig</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Eine kleine Überraschung ☕","soft",'data-choice="Eine kleine Überraschung ☕"')}${choiceButton("Jemand, der mich zum Lachen bringt 😂","soft",'data-choice="Jemand, der mich zum Lachen bringt 😂"')}${choiceButton("Ich hätte da schon eine Idee … 😏","primary",'id="ownIdea"')}</div><div id="ideaArea"></div></div>`);
  logEvent("page_view");
  screen.querySelectorAll("[data-choice]").forEach(btn=>btn.addEventListener("click",()=>{logEvent("choice",{value:btn.dataset.choice,status:"Gewählt"});next(renderAnnoying);}));
  document.getElementById("ownIdea").addEventListener("click",()=>{
    logEvent("choice",{value:"Ich hätte da schon eine Idee … 😏",status:"Textvariante gewählt"});
    screen.querySelectorAll("[data-choice]").forEach(btn=>{btn.disabled=true;btn.style.opacity=".45";});
    const own=document.getElementById("ownIdea");own.disabled=true;own.textContent="Ich hätte da schon eine Idee … 😏 ✓";
    document.getElementById("ideaArea").innerHTML=`<div class="text-wrap fade-in"><label for="ideaText">Na dann raus damit … 😏</label><textarea id="ideaText" maxlength="500" placeholder="Hier kannst du deine Idee verraten …"></textarea><button class="btn primary" id="sendIdea">Idee abschicken ❤️</button></div>`;
    document.getElementById("sendIdea").addEventListener("click",()=>{const text=document.getElementById("ideaText").value.trim();if(!text)return;logEvent("free_text",{value:text,status:"Gesendet"});next(renderAnnoying);});
  });
}

function renderAnnoying() {
  currentQuestion="Wie anstrengend ist der Mensch, der dir diesen Link geschickt hat, eigentlich?";
  mount(`<div class="content fade-in"><p class="eyebrow">Letzte Kontrollfrage</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Überhaupt nicht 😇","primary",'data-choice="Überhaupt nicht 😇"')}${choiceButton("Er hat seine Momente 😏","soft",'data-choice="Er hat seine Momente 😏"')}${choiceButton("Unfassbar anstrengend 🙄","danger-ish",'id="veryAnnoying"')}</div><p class="helper"></p></div>`);
  logEvent("page_view");screen.querySelectorAll("[data-choice]").forEach(btn=>btn.addEventListener("click",()=>{logEvent("choice",{value:btn.dataset.choice,status:"Gewählt"});next(renderFinal);}));
  const very=document.getElementById("veryAnnoying");very.addEventListener("click",()=>{logEvent("choice",{value:"Unfassbar anstrengend 🙄",transformedTo:"… aber irgendwie mag ich ihn trotzdem ❤️",status:"Umgewandelt"});very.innerHTML=`<span class="strike">Unfassbar anstrengend 🙄</span><br><span>… aber irgendwie mag ich ihn trotzdem ❤️</span>`;screen.querySelector(".helper").textContent="So. Jetzt stimmt's. 😌";next(renderFinal,1200);});
}

function renderFinal() {
  currentQuestion="Abschluss";
  mount(`<div class="content fade-in"><p class="eyebrow">Okay Biljana, eine letzte Sache noch …</p><h2 class="question">Ich wollte dir eigentlich nur sagen, dass ich froh bin, dass es dich gibt. ❤️</h2><p class="lead">Das war's.</p><p class="final-note">Du kannst jetzt aufhören auf den Bildschirm zu schauen und mich anlächeln. 😏❤️</p></div>`);
  logEvent("page_view");logEvent("completed",{status:"Abgeschlossen"});progressBar.style.width="100%";
}

renderIntro();