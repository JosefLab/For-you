const screen = document.getElementById("screen");
const progressBar = document.getElementById("progressBar");

const TOTAL_STEPS = 9;
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
  mount(`<div class="content fade-in"><p class="eyebrow">Rein hypothetisch natürlich</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Blumen wären akzeptabel 💐","soft",'id="flowers"')}${choiceButton("Mit Essen kann man mich bestechen 🍫","soft",'id="food"')}${choiceButton("Eine Umarmung wäre toll 🤗","primary",'id="hug"')}</div><div id="foodArea"></div></div>`);
  logEvent("page_view");

  const flowers = document.getElementById("flowers");
  const food = document.getElementById("food");
  const hug = document.getElementById("hug");

  flowers.addEventListener("click",()=>{logEvent("choice",{value:"Blumen wären akzeptabel 💐",status:"Gewählt"});next(renderMakeDayBetter);});
  hug.addEventListener("click",()=>{logEvent("choice",{value:"Eine Umarmung wäre toll 🤗",status:"Gewählt"});next(renderMakeDayBetter);});

  food.addEventListener("click",()=>{
    logEvent("choice",{value:"Mit Essen kann man mich bestechen 🍫",status:"Textvariante gewählt"});

    flowers.disabled = true;
    hug.disabled = true;
    food.disabled = true;
    flowers.style.opacity = ".45";
    hug.style.opacity = ".45";
    food.textContent = "Mit Essen kann man mich bestechen 🍫 ✓";

    document.getElementById("foodArea").innerHTML = `
      <div class="text-wrap fade-in">
        <label for="foodText">Womit genau kann man dich bestechen? 😏</label>
        <textarea id="foodText" maxlength="300" placeholder="Jetzt musst du dich entscheiden … 🍕🍫🍝"></textarea>
        <button class="btn primary" id="sendFood">Antwort abschicken ❤️</button>
        <p class="helper" id="foodHelper"></p>
      </div>`;

    const foodText = document.getElementById("foodText");
    foodText.focus();
    document.getElementById("sendFood").addEventListener("click",()=>{
      const text = foodText.value.trim();
      if (!text) {
        document.getElementById("foodHelper").textContent = "Ohne Bestechungsmittel geht's nicht 😏";
        foodText.focus();
        return;
      }
      logEvent("free_text",{value:text,status:"Gesendet – Essen"});
      next(renderMakeDayBetter);
    });
  });
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
  logEvent("page_view");screen.querySelectorAll("[data-choice]").forEach(btn=>btn.addEventListener("click",()=>{logEvent("choice",{value:btn.dataset.choice,status:"Gewählt"});next(renderWhy);}));
  const very=document.getElementById("veryAnnoying");very.addEventListener("click",()=>{logEvent("choice",{value:"Unfassbar anstrengend 🙄",transformedTo:"… aber irgendwie mag ich ihn trotzdem ❤️",status:"Umgewandelt"});very.innerHTML=`<span class="strike">Unfassbar anstrengend 🙄</span><br><span>… aber irgendwie mag ich ihn trotzdem ❤️</span>`;screen.querySelector(".helper").textContent="So. Jetzt stimmt's. 😌";next(renderWhy,1200);});
}

function renderWhy() {
  currentQuestion = "Was glaubst du eigentlich, warum ich diese Seite gemacht habe? 😏";
  mount(`<div class="content fade-in"><p class="eyebrow">Eine Sache interessiert mich noch</p><h2 class="question">${currentQuestion}</h2><div class="actions">${choiceButton("Weil dir langweilig war 😂","soft",'data-choice="Weil dir langweilig war 😂"')}${choiceButton("Weil du mich zum Lächeln bringen wolltest ❤️","primary",'data-choice="Weil du mich zum Lächeln bringen wolltest ❤️"')}${choiceButton("Weil du eindeutig zu viel Zeit hast 🙄","danger-ish",'id="tooMuchTime"')}</div><p class="helper"></p></div>`);
  logEvent("page_view");
  screen.querySelectorAll("[data-choice]").forEach(btn=>btn.addEventListener("click",()=>{
    logEvent("choice",{value:btn.dataset.choice,status:"Gewählt"});
    next(renderCompliment);
  }));

  const tooMuchTime = document.getElementById("tooMuchTime");
  tooMuchTime.addEventListener("click",()=>{
    logEvent("choice",{value:"Weil du eindeutig zu viel Zeit hast 🙄",transformedTo:"Weil du dir offensichtlich Mühe gegeben hast 😌",status:"Umgewandelt"});
    tooMuchTime.innerHTML = `<span class="strike">Weil du eindeutig zu viel Zeit hast 🙄</span><br><span>Weil du dir offensichtlich Mühe gegeben hast 😌</span>`;
    screen.querySelector(".helper").textContent = "So klingt das schon viel besser. 😌";
    next(renderCompliment,1200);
  });
}

function renderCompliment() {
  currentQuestion = "Kurze Unterbrechung";
  mount(`<div class="content fade-in"><p class="eyebrow">Moment mal … ✋</p><h2 class="question">Bevor wir weitermachen:</h2><p class="lead">Du siehst übrigens immer noch wunderschön aus. ❤️</p><div class="actions"><button class="btn primary" id="continueAfterCompliment">Okay. Weitermachen. 😌</button></div></div>`);
  logEvent("page_view");
  document.getElementById("continueAfterCompliment").addEventListener("click",()=>{
    logEvent("choice",{value:"Okay. Weitermachen. 😌",status:"Gewählt"});
    next(renderFinal);
  });
}

function renderFinal() {
  currentQuestion="Abschluss";
  mount(`<div class="content fade-in"><p class="eyebrow">Okay Biljana, eine letzte Sache noch …</p><h2 class="question">Ich wollte dir eigentlich nur sagen, dass ich froh bin, dass es dich gibt. ❤️</h2><p class="lead">Das war's.</p><p class="final-note">Du kannst jetzt aufhören auf den Bildschirm zu schauen und mich anlächeln. 😏❤️</p><div class="actions"><button class="btn primary" id="smiled">Hab ich gemacht 😊</button></div><div id="finalReveal"></div></div>`);
  logEvent("page_view");
  document.getElementById("smiled").addEventListener("click",()=>{
    logEvent("choice",{value:"Hab ich gemacht 😊",status:"Gewählt"});
    const smiled = document.getElementById("smiled");
    smiled.disabled = true;
    smiled.style.display = "none";
    document.getElementById("finalReveal").innerHTML = `<p class="lead fade-in">Gut. Genau das war eigentlich der ganze Sinn dieser Seite. ❤️</p>`;
    logEvent("completed",{status:"Abgeschlossen"});
    progressBar.style.width="100%";
  });
}

renderIntro();