/* ============================================================
   agent.js — AI onboarding agent
   ============================================================ */

const QUESTIONS = [
  { key: 'navn',      text: 'Hva heter du? 🌸' },
  { key: 'premie',    text: 'Hva er premien din — hva jobber du mot? Det kan være en drømmereise, en luksusveske, konsert, flytte hjemmefra, spare til noe stort, eller noe helt annet!' },
  { key: 'dato',      text: 'Når vil du nå premien? Skriv f.eks. "desember 2027" eller "mars 2026" 📅' },
  { key: 'sparing',   text: 'Hvor mye kan du spare per måned? Skriv et tall i kroner (f.eks. 3000) 💰' },
  { key: 'situasjon', text: 'Jobber du, studerer du, eller begge deler? Fortell gjerne litt om hverdagen din 😊' },
];

const agentAnswers  = {};
let currentQuestion = 0;
let waitingForInput = false;

// ── API-nøkkel ────────────────────────────────────────────────
function saveApiKey() {
  const inp = document.getElementById('api-key-input');
  const key = (inp.value || '').trim();
  if (!key || !key.startsWith('sk-')) {
    inp.classList.add('error');
    inp.placeholder = 'Nøkkelen ser ikke riktig ut — sjekk og prøv igjen';
    setTimeout(() => inp.classList.remove('error'), 2000);
    return;
  }
  localStorage.setItem('lp_api_key', key);
  document.getElementById('api-key-section').style.display = 'none';
  document.getElementById('chat-container').style.display  = 'flex';
  startChat();
}

// ── Chat-hjelpere ─────────────────────────────────────────────
function addMessage(html, role) {
  const box    = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-' + role;
  bubble.innerHTML = html.replace(/\n/g, '<br>');
  box.appendChild(bubble);
  box.scrollTop = box.scrollHeight;
  return bubble;
}

function showTyping() {
  const box = document.getElementById('chat-messages');
  const el  = document.createElement('div');
  el.className = 'chat-bubble chat-bubble-ai';
  el.id        = 'typing-indicator';
  el.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function setChatLocked(locked) {
  const inp = document.getElementById('chat-input');
  const btn = document.querySelector('#chat-input-row button');
  if (inp) inp.disabled = locked;
  if (btn) btn.disabled = locked;
}

// ── Chat-flyt ─────────────────────────────────────────────────
function startChat() {
  currentQuestion = 0;
  setTimeout(() => {
    addMessage(
      'Hei! Jeg er din personlige livsplanlegger 🌺\n\n' +
      'Jeg stiller deg 5 raske spørsmål, så genererer jeg en helt personlig tidslinje, budsjett og målliste — tilpasset akkurat deg og premien din.\n\n' +
      'La oss starte!',
      'ai'
    );
    setTimeout(askNext, 1200);
  }, 400);
}

function askNext() {
  if (currentQuestion >= QUESTIONS.length) {
    generatePlan();
    return;
  }
  showTyping();
  setTimeout(() => {
    removeTyping();
    addMessage(QUESTIONS[currentQuestion].text, 'ai');
    setChatLocked(false);
    const inp = document.getElementById('chat-input');
    if (inp) inp.focus();
    waitingForInput = true;
  }, 700);
}

function sendAnswer() {
  if (!waitingForInput) return;
  const inp    = document.getElementById('chat-input');
  const answer = (inp.value || '').trim();
  if (!answer) return;

  waitingForInput = false;
  inp.value = '';
  setChatLocked(true);

  addMessage(answer, 'user');
  agentAnswers[QUESTIONS[currentQuestion].key] = answer;
  currentQuestion++;
  setTimeout(askNext, 500);
}

// ── Generer plan ──────────────────────────────────────────────
async function generatePlan() {
  document.getElementById('chat-input-row').style.display = 'none';

  addMessage('Perfekt! Nå lager jeg din personlige livsplan basert på svarene dine ✨', 'ai');
  setTimeout(() => {
    document.getElementById('chat-generating').style.display = 'flex';
  }, 600);

  const apiKey = localStorage.getItem('lp_api_key') || '';
  const today  = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

  const prompt = `Du er en personlig livsplanlegger. Lag en komplett personlig livsplan basert på disse svarene:

Navn: ${agentAnswers.navn}
Premie (hva de jobber mot): ${agentAnswers.premie}
Ønsket dato for premien: ${agentAnswers.dato}
Sparing per måned: ${agentAnswers.sparing} kr
Livssituasjon: ${agentAnswers.situasjon}
Dagens dato: ${today}

Returner KUN et JSON-objekt med denne nøyaktige strukturen — ingen tekst rundt, ingen markdown:

{
  "navn": "...",
  "premie": "...",
  "avreisedato": "YYYY-MM-DD",
  "sparemaal": 30000,
  "months": [
    {
      "id": "jan2026",
      "name": "Januar 2026",
      "color": "#5CAD8A",
      "phase": "saving",
      "badgeText": "🎯 Sparer",
      "location": "Hjemme",
      "jobb": "...",
      "status": "Planlegging",
      "notes": "",
      "context": "En motiverende, personlig beskrivelse av denne måneden og hva som er viktig nå for å nå premien.",
      "todos": [
        {"text": "Konkret, spesifikk og handlingsorientert oppgave", "done": false}
      ]
    }
  ],
  "budgetSections": [
    {
      "title": "💰 Sparefase",
      "rows": [
        {"cat": "Månedlig sparing mot premien", "budget": 3000, "spent": 0}
      ]
    }
  ],
  "goals": [
    {
      "icon": "🎯",
      "title": "Tittel på delmål mot premien",
      "desc": "Beskrivelse med konkrete, praktiske tips og steg for å nå dette delmålet.",
      "pct": 0
    }
  ]
}

Regler:
- Lag månedskort fra neste måned og frem til premiedatoen (maks 12 måneder)
- Hvert månedskort skal ha 4–6 konkrete, spesifikke todos som er relevante for akkurat denne premien
- Todos skal ikke være generiske — de skal passe til nettopp det denne personen jobber mot
- Budsjett skal reflektere hva det faktisk koster å nå premien
- sparemaal = estimert totalbeløp brukeren trenger
- Lag 5–7 personlige premier/delmål
- Bruk ordet "premie" konsekvent — ikke "drøm" eller "mål"
- Månedsfarge-logikk: tidlig fase="#5CAD8A", midtfase="#C9A8E0", sluttfase="#F4A97A", premiedato="#E8619A"
- phase-verdier: "saving", "planning", "final", "goal"
- Alt innhold skal være på norsk
- Returner KUN JSON — ingen annen tekst`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API-feil (${res.status})`);
    }

    const result = await res.json();
    const raw    = result.content[0].text;

    let data;
    try {
      const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const match    = stripped.match(/\{[\s\S]*\}/);
      data = JSON.parse(match ? match[0] : stripped);
    } catch {
      throw new Error('Klarte ikke å lese svaret fra AI. Prøv igjen.');
    }

    document.getElementById('chat-generating').style.display = 'none';
    loadFromAgentData(data);

  } catch (err) {
    document.getElementById('chat-generating').style.display = 'none';
    addMessage(
      `Noe gikk galt: <strong>${err.message}</strong>\n\nSjekk at API-nøkkelen er riktig og at du har internettilgang.\n\n` +
      `<button onclick="retryGenerate()" class="retry-btn">🔄 Prøv igjen</button>`,
      'ai'
    );
    document.getElementById('chat-input-row').style.display = 'flex';
    setChatLocked(true);
  }
}

function retryGenerate() {
  document.getElementById('chat-input-row').style.display = 'none';
  generatePlan();
}

// ── Bytt API-nøkkel ───────────────────────────────────────────
function changeApiKey() {
  localStorage.removeItem('lp_api_key');
  document.getElementById('chat-container').style.display  = 'none';
  document.getElementById('api-key-section').style.display = 'flex';
  document.getElementById('api-key-input').value = '';
}

// ── Init ─────────────────────────────────────────────────────
(function initAgent() {
  if (localStorage.getItem('lp_onboarding_done')) return;

  document.getElementById('onboarding').style.display = 'block';

  const savedKey = localStorage.getItem('lp_api_key');
  if (savedKey) {
    document.getElementById('api-key-section').style.display = 'none';
    document.getElementById('chat-container').style.display  = 'flex';
    startChat();
  } else {
    document.getElementById('api-key-section').style.display = 'flex';
    document.getElementById('chat-container').style.display  = 'none';
  }
})();
