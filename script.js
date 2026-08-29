
const screen = document.getElementById("screen");
const progressBar = document.getElementById("progressBar");

const TOTAL_STEPS = 7;
let step = 0;

const LOG_ENDPOINT = "https://script.google.com/macros/s/AKfycbyOPk54xZe9HKeekrpCcuIMf9Me8gujKpi4_wwPpgTZleDuTzVRd6mt1GVvAQouUrF-/exec";

const sessionId =
  sessionStorage.getItem("biljana-session") ||
  (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`);

sessionStorage.setItem("biljana-session", sessionId);

function nowIso() {
  return new Date().toISOString();
}

function logEvent(type, data = {}) {
  const entry = {
    besucher: sessionId,
    frage: data.page || data.field || `Schritt ${step}`,
    aktion: type,
    antwort: data.value || "",
    status: data.status || data.transformedTo || "",
    sessionId,
    timestamp: nowIso(),
    type,
    step,
    ...data
  };

  const local = JSON.parse(localStorage.getItem("biljana-events") || "[]");
  local.push(entry);
  localStorage.setItem("biljana-events", JSON.stringify(local));

  if (LOG_ENDPOINT) {
    fetch(LOG_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(entry),
      keepalive: true
    }).catch(() => {});
  }

  console.log("[log]", entry);
}

function setProgress() {
  const pct = Math.max(0, Math.min(100, (step / TOTAL_STEPS) * 100));
  progressBar.style.width = `${pct}%`;
}

function mount(html) {
  screen.innerHTML = html;
  setProgress();
}

function next(renderFn, delay = 320) {
  setTimeout(() => {
    step++;
    renderFn();
  }, delay);
}

function choiceButton(label, cls = "soft", attrs = "") {
  return `<button class="btn ${cls}" ${attrs}>${label}</button>`;
}

function attachNormalChoices(onChosen) {
  screen.querySelectorAll("[data-choice]").forEach(btn => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.choice;
      logEvent("choice", { value, status: "gewählt" });
      btn.classList.add("pop");
      onChosen(value, btn);
    });
  });
}

function makeEscapingButton(btn, label) {
  let attempts = 0;

  const escape = (ev) => {
    ev.preventDefault();
    attempts++;
    logEvent("blocked_attempt", { value: label, attempt: attempts, status: "gesperrt" });

    const maxX = Math.max(0, Math.min(140, screen.clientWidth - btn.offsetWidth - 20));
    const maxY = 90;
    const x = (Math.random() * 2 - 1) * maxX;
    const y = (Math.random() * 2 - 1) * maxY;
    btn.style.transform = `translate(${x}px, ${y}px)`;

    const helper = screen.querySelector(".helper");
    if (helper) {
      helper.textContent =
        attempts === 1 ? "Netter Versuch 😏" :
        attempts === 2 ? "Der Button hat heute andere Pläne." :
        "Hartnäckig. Gefällt mir. 😄";
    }
  };

  ["pointerdown", "mouseenter", "touchstart"].forEach(evt =>
    btn.addEventListener(evt, escape, { passive: false })
  );
}

function renderIntro() {
  step = 0;
  const template = document.getElementById("introTemplate");
  screen.replaceChildren(template.content.cloneNode(true));
  setProgress();
  logEvent("page_view", { page: "intro", status: "angezeigt" });

  attachNormalChoices(() => {
    next(renderMood);
  });
}

function renderMood() {
  mount(`
    <div class="content fade-in">
      <p class="eyebrow">Kurzer Check</p>
      <h2 class="question">Wie geht es dir heute?</h2>
      <div class="actions">
        ${choiceButton("Wunderbar 😊", "primary", 'data-choice="Wunderbar"')}
        ${choiceButton("Ja, geht so 🙂", "soft", 'data-choice="Ja geht so"')}
        ${choiceButton("Eher nicht so gut 😕", "danger-ish escape", 'id="badMood"')}
      </div>
      <p class="helper"></p>
    </div>
  `);
  logEvent("page_view", { page: "mood", status: "angezeigt" });

  attachNormalChoices(() => next(renderPerson));
  makeEscapingButton(document.getElementById("badMood"), "Eher nicht so gut");
}

function renderPerson() {
  mount(`
    <div class="content fade-in">
      <p class="eyebrow">Jetzt wird's wichtig</p>
      <h2 class="question">Wie findest du eigentlich den Menschen, der dir diesen Link geschickt hat?</h2>
      <div class="actions">
        ${choiceButton("Schon ziemlich toll ❤️", "primary", 'data-choice="Schon ziemlich toll"')}
        ${choiceButton("Man kann ihn aushalten 😏", "soft", 'id="tolerable"')}
        ${choiceButton("Frag lieber nicht 🙄", "danger-ish escape", 'id="dontAsk"')}
      </div>
      <p class="helper"></p>
    </div>
  `);
  logEvent("page_view", { page: "person", status: "angezeigt" });

  screen.querySelector('[data-choice="Schon ziemlich toll"]').addEventListener("click", () => {
    logEvent("choice", { value: "Schon ziemlich toll", status: "gewählt" });
    next(renderAttention);
  });

  const tolerable = document.getElementById("tolerable");
  tolerable.addEventListener("click", () => {
    logEvent("choice", {
      value: "Man kann ihn aushalten",
      transformedTo: "Schon ziemlich toll",
      status: "umgewandelt"
    });
    tolerable.textContent = "Schon ziemlich toll ❤️";
    tolerable.classList.remove("soft");
    tolerable.classList.add("primary", "pop");
    const helper = screen.querySelector(".helper");
    helper.textContent = "Ich wusste, was du eigentlich sagen wolltest. 😌";
    next(renderAttention, 900);
  });

  makeEscapingButton(document.getElementById("dontAsk"), "Frag lieber nicht");
}

function renderAttention() {
  mount(`
    <div class="content fade-in">
      <p class="eyebrow">Sehr wissenschaftlich</p>
      <h2 class="question">Wie hoch ist heute dein Bedürfnis nach Aufmerksamkeit?</h2>
      <div class="actions">
        ${choiceButton("Sehr hoch 🥰", "primary", 'data-choice="Sehr hoch"')}
        ${choiceButton("Ein bisschen geht immer 😌", "soft", 'data-choice="Ein bisschen geht immer"')}
        ${choiceButton("Ich brauche keine 🚫", "danger-ish", 'id="noAttention"')}
      </div>
      <p class="helper"></p>
    </div>
  `);
  logEvent("page_view", { page: "attention", status: "angezeigt" });

  attachNormalChoices(() => next(renderGoodThing));

  const noAttention = document.getElementById("noAttention");
  noAttention.addEventListener("click", (ev) => {
    ev.preventDefault();
    logEvent("blocked_attempt", { value: "Ich brauche keine", status: "gesperrt" });
    screen.querySelector(".helper").textContent =
      "Diese Antwort wurde wegen offensichtlicher Unglaubwürdigkeit gesperrt. 😌";
    noAttention.classList.add("pop");
  });
}

function renderGoodThing() {
  mount(`
    <div class="content fade-in">
      <p class="eyebrow">Rein hypothetisch natürlich</p>
      <h2 class="question">Angenommen, jemand würde dir heute etwas Gutes tun wollen …</h2>
      <div class="actions">
        ${choiceButton("Blumen wären akzeptabel 💐", "soft", 'data-choice="Blumen"')}
        ${choiceButton("Mit Essen kann man mich bestechen 🍫", "soft", 'data-choice="Essen"')}
        ${choiceButton("Eine Umarmung wäre toll 🤗", "primary", 'data-choice="Umarmung"')}
      </div>
    </div>
  `);
  logEvent("page_view", { page: "good_thing", status: "angezeigt" });

  attachNormalChoices(() => next(renderMakeDayBetter));
}

function renderMakeDayBetter() {
  mount(`
    <div class="content fade-in">
      <p class="eyebrow">Nur noch ein kleines bisschen neugierig</p>
      <h2 class="question">Was könnte deinen Tag heute noch ein kleines bisschen schöner machen?</h2>
      <div class="actions">
        ${choiceButton("Eine kleine Überraschung ☕", "soft", 'data-choice="Überraschung"')}
        ${choiceButton("Jemand, der mich zum Lachen bringt 😂", "soft", 'data-choice="Zum Lachen bringen"')}
        ${choiceButton("Ich hätte da schon eine Idee … 😏", "primary", 'id="ownIdea"')}
      </div>
      <div id="ideaArea"></div>
    </div>
  `);
  logEvent("page_view", { page: "make_day_better", status: "angezeigt" });

  screen.querySelectorAll("[data-choice]").forEach(btn => {
    btn.addEventListener("click", () => {
      logEvent("choice", { value: btn.dataset.choice, status: "gewählt" });
      next(renderAnnoying);
    });
  });

  document.getElementById("ownIdea").addEventListener("click", () => {
    logEvent("choice", { value: "Ich hätte da schon eine Idee", status: "Textvariante gewählt" });

    screen.querySelectorAll("[data-choice]").forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = "0.45";
      btn.style.cursor = "not-allowed";
    });

    const ownIdea = document.getElementById("ownIdea");
    ownIdea.disabled = true;
    ownIdea.textContent = "Ich hätte da schon eine Idee … 😏 ✓";

    document.getElementById("ideaArea").innerHTML = `
      <div class="text-wrap fade-in">
        <label for="ideaText">Na dann raus damit … 😏</label>
        <textarea id="ideaText" maxlength="500" placeholder="Hier kannst du deine Idee verraten …"></textarea>
        <button class="btn primary" id="sendIdea">Idee abschicken ❤️</button>
      </div>
    `;
    document.getElementById("ideaText").focus();

    document.getElementById("sendIdea").addEventListener("click", () => {
      const text = document.getElementById("ideaText").value.trim();
      if (!text) {
        document.getElementById("ideaText").placeholder = "Ein bisschen mutiger bitte 😏";
        return;
      }
      logEvent("free_text", { field: "own_idea", value: text, status: "gesendet" });
      next(renderAnnoying);
    });
  });
}

function renderAnnoying() {
  mount(`
    <div class="content fade-in">
      <p class="eyebrow">Letzte Kontrollfrage</p>
      <h2 class="question">Wie anstrengend ist der Mensch, der dir diesen Link geschickt hat, eigentlich?</h2>
      <div class="actions">
        ${choiceButton("Überhaupt nicht 😇", "primary", 'data-choice="Überhaupt nicht"')}
        ${choiceButton("Er hat seine Momente 😏", "soft", 'data-choice="Er hat seine Momente"')}
        ${choiceButton("Unfassbar anstrengend 🙄", "danger-ish", 'id="veryAnnoying"')}
      </div>
      <p class="helper"></p>
    </div>
  `);
  logEvent("page_view", { page: "annoying", status: "angezeigt" });

  screen.querySelectorAll("[data-choice]").forEach(btn => {
    btn.addEventListener("click", () => {
      logEvent("choice", { value: btn.dataset.choice, status: "gewählt" });
      next(renderFinal);
    });
  });

  const very = document.getElementById("veryAnnoying");
  very.addEventListener("click", () => {
    logEvent("choice", {
      value: "Unfassbar anstrengend",
      transformedTo: "… aber irgendwie mag ich ihn trotzdem",
      status: "umgewandelt"
    });

    very.innerHTML = `<span class="strike">Unfassbar anstrengend 🙄</span><br><span>… aber irgendwie mag ich ihn trotzdem ❤️</span>`;
    very.classList.add("pop");
    screen.querySelector(".helper").textContent = "So. Jetzt stimmt's. 😌";
    next(renderFinal, 1200);
  });
}

function renderFinal() {
  mount(`
    <div class="content fade-in">
      <p class="eyebrow">Okay Biljana, eine letzte Sache noch …</p>
      <h2 class="question">Ich wollte dir eigentlich nur sagen, dass ich froh bin, dass es dich gibt. ❤️</h2>
      <p class="lead">Das war's.</p>
      <p class="final-note">Du kannst jetzt aufhören auf den Bildschirm zu schauen und mich anlächeln. 😏❤️</p>
    </div>
  `);
  logEvent("page_view", { page: "final", status: "angezeigt" });
  logEvent("completed", { status: "abgeschlossen" });
  progressBar.style.width = "100%";
}

renderIntro();
