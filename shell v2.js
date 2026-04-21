/* ───────────────────────────────────────────────────────────────
   Shell v2 — hero scroll + tabs + UX refinements
   (supersedes shell.js; loaded in index v2.html)
   ─────────────────────────────────────────────────────────────── */

/* Suppress the benign "[MIDI] access denied" console noise — fired by
   player.js whenever a browser denies Web MIDI (the default). Must run
   before the MIDI promise rejects, so it's at the top of the file. */
(function silenceMIDIConsole() {
  const origErr = console.error;
  const origWarn = console.warn;
  function shouldFilter(args) {
    return args.some(a => typeof a === 'string' && a.includes('[MIDI]'));
  }
  console.error = function(...args) { if (shouldFilter(args)) return; origErr.apply(console, args); };
  console.warn  = function(...args) { if (shouldFilter(args)) return; origWarn.apply(console, args); };
})();

/* ---------- Hero → App scroll + tab state ---------- */
function scrollToApp(target) {
  const app = document.getElementById('app');
  if (!app) return;
  if (target === 'compose') {
    setTimeout(() => switchTab('compose'), 100);
  }
  app.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let currentTab = 'listen';

function switchTab(target) {
  if (target === currentTab) return;
  currentTab = target;

  const tabListen = document.getElementById('tabListen');
  const tabCompose = document.getElementById('tabCompose');
  const help = document.getElementById('modeHelp');

  if (target === 'compose') {
    tabListen.classList.remove('active'); tabListen.setAttribute('aria-selected', 'false');
    tabCompose.classList.add('active'); tabCompose.setAttribute('aria-selected', 'true');
    document.body.classList.add('compose-mode');

    help.innerHTML = composeHelpHTML();

    if (typeof composing !== 'undefined' && !composing) toggleCompose();
    updateComposeEmpty();
  } else {
    tabCompose.classList.remove('active'); tabCompose.setAttribute('aria-selected', 'false');
    tabListen.classList.add('active'); tabListen.setAttribute('aria-selected', 'true');
    document.body.classList.remove('compose-mode');

    help.innerHTML = listenHelpHTML();

    if (typeof composing !== 'undefined' && composing) toggleCompose();
    if ((typeof seq === 'undefined' || !seq.length) && typeof COMPLEXES !== 'undefined') {
      loadComplex(COMPLEXES[0]);
    }
  }
}

function listenHelpHTML() {
  return '<span class="mode-help-step"><b>1.</b> Pick a protein or binding pair below</span>'
       + '<span class="mode-help-sep">→</span>'
       + '<span class="mode-help-step"><b>2.</b> Hear its melody play automatically</span>'
       + '<span class="mode-help-sep">→</span>'
       + '<span class="mode-help-step"><b>3.</b> Watch it light up in 3D</span>';
}
function composeHelpHTML() {
  return '<span class="mode-help-step"><b>1.</b> Press piano keys — each key is an amino acid</span>'
       + '<span class="mode-help-sep">→</span>'
       + '<span class="mode-help-step"><b>2.</b> Optionally follow <span style="color:#534AB7;font-weight:600">glowing</span> suggestions</span>'
       + '<span class="mode-help-sep">→</span>'
       + '<span class="mode-help-step"><b>3.</b> Reach 20+ residues, then <kbd>fold it!</kbd></span>';
}

/* ---------- Compose onboarding visibility ---------- */
function updateComposeEmpty() {
  if (typeof compSeq === 'undefined') return;
  document.body.classList.toggle('has-compose-seq', compSeq.length > 0);
}

/* Observe compose-seq mutations so the toolbar reveals as soon as a key is pressed */
document.addEventListener('DOMContentLoaded', () => {
  const cs = document.getElementById('composeSeq');
  if (cs) {
    const mo = new MutationObserver(updateComposeEmpty);
    mo.observe(cs, { childList: true });
  }
  updateComposeEmpty();

  // Set the listen-mode help copy once on load (overrides the static default)
  const help = document.getElementById('modeHelp');
  if (help) help.innerHTML = listenHelpHTML();
});

/* ---------- Keep tabs in sync if the underlying app flips compose mode ---------- */
const _origToggleCompose = typeof toggleCompose === 'function' ? toggleCompose : null;
if (_origToggleCompose) {
  window.toggleCompose = function() {
    _origToggleCompose.apply(this, arguments);
    if (typeof composing !== 'undefined') {
      const shouldBeCompose = composing;
      if (shouldBeCompose && currentTab !== 'compose') {
        currentTab = 'compose';
        document.getElementById('tabListen').classList.remove('active');
        document.getElementById('tabCompose').classList.add('active');
        document.body.classList.add('compose-mode');
        const help = document.getElementById('modeHelp');
        if (help) help.innerHTML = composeHelpHTML();
      } else if (!shouldBeCompose && currentTab !== 'listen') {
        currentTab = 'listen';
        document.getElementById('tabCompose').classList.remove('active');
        document.getElementById('tabListen').classList.add('active');
        document.body.classList.remove('compose-mode');
        const help = document.getElementById('modeHelp');
        if (help) help.innerHTML = listenHelpHTML();
      }
      updateComposeEmpty();
    }
  };
}

/* ===============================================================
   v2 — UX improvements
   =============================================================== */

/* ---------- Tempo: friendly labels ---------- */
function tempoWord(bpm) {
  bpm = +bpm;
  if (bpm < 60)  return 'very slow';
  if (bpm < 90)  return 'slow';
  if (bpm < 130) return 'medium';
  if (bpm < 170) return 'lively';
  if (bpm < 220) return 'fast';
  return 'very fast';
}
function onTempoChange(val) {
  const out = document.getElementById('tempoOut');
  if (!out) return;
  out.innerHTML = '<span class="tempo-word">' + tempoWord(val) + '</span>'
                + ' <span class="tempo-num">♪ = ' + val + '</span>';
}
window.onTempoChange = onTempoChange;

/* ---------- Binding-pair caption: plain English ---------- */
/* renderSeqMel in player.js resolves calls lexically, so a window.* override
   doesn't fire. Use a MutationObserver to rewrite the caption after each
   render (cheap; caption changes are rare). */
(function wireFriendlyCaption() {
  document.addEventListener('DOMContentLoaded', () => {
    const cap = document.getElementById('bindingCaption');
    if (!cap) return;
    let rewriting = false;
    const mo = new MutationObserver(() => {
      if (rewriting) return;
      if (cap.style.display === 'none') return;
      if (typeof activeComplex === 'undefined' || !activeComplex) return;
      if (cap.dataset.friendly === '1') return;
      rewriting = true;
      const a = activeComplex.chainA.name, b = activeComplex.chainB.name;
      cap.classList.add('friendly');
      cap.dataset.friendly = '1';
      cap.innerHTML =
        `<strong>These two proteins stick together.</strong> `
      + `The rows below show which letters of <em>${a}</em> touch which letters of <em>${b}</em> — `
      + `the spots where they physically clasp on to each other. `
      + `When you play, both melodies sound at once: they <em>harmonize</em> at the contact points.`;
      setTimeout(() => { rewriting = false; }, 0);
    });
    mo.observe(cap, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    // Also clear the friendly flag when caption hides, so next complex re-rewrites
    const clearObs = new MutationObserver(() => {
      if (cap.style.display === 'none') cap.dataset.friendly = '';
    });
    clearObs.observe(cap, { attributes: true, attributeFilter: ['style'] });
  });
})();

/* ---------- #1. Mapping panel: collapsible disclosure ---------- */
function toggleMappingPanel() {
  const panel = document.getElementById('mappingPanel');
  const btn = document.getElementById('mappingDisclosure');
  if (!panel || !btn) return;
  const collapsed = panel.classList.toggle('mapping-panel-collapsed');
  btn.setAttribute('aria-expanded', String(!collapsed));
  const title = btn.querySelector('.mapping-disclosure-title');
  const sub = btn.querySelector('.mapping-disclosure-sub');
  if (collapsed) {
    title.textContent = 'How does this work?';
    sub.textContent = 'See how amino acids become notes';
  } else {
    title.textContent = 'Hide mapping details';
    sub.textContent = 'Pick a mapping, view the legend';
  }
}
window.toggleMappingPanel = toggleMappingPanel;

/* ---------- #2. Auto-play on preset click ---------- */
/* Player.js binds onclick handlers via lexical references (btn.onclick = () => loadPresetClear(p)),
   so a window.loadPresetClear override doesn't reach them. Use capture-phase
   click delegation on the preset containers instead, and trigger playback
   shortly after the underlying handler runs. */
(function wireAutoPlay() {
  document.addEventListener('DOMContentLoaded', () => {
    const containers = ['presets', 'harmonyBtns'];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !el.contains(btn)) return;
        // Let the native handler run first, then trigger play if something loaded.
        setTimeout(() => {
          if (typeof playing !== 'undefined' && !playing
              && typeof seq !== 'undefined' && seq && seq.length
              && typeof togglePlay === 'function') {
            togglePlay();
          }
        }, 220);
      }, false);
    });
  });
})();

/* ---------- #4. MIDI banner: only show when a device is connected ---------- */
/* Replace initMIDI entirely: the original logs "access denied" to console.error
   whenever browsers block MIDI (the default state). For normal users this is
   noise — they don't have a MIDI keyboard anyway. Our replacement silently
   ignores denial and only surfaces the banner if a device is connected. */
(function wireMIDIVisibility() {
  function install() {
    if (typeof initMIDI !== 'function') return setTimeout(install, 30);

    window.initMIDI = function() {
      if (!navigator.requestMIDIAccess) return;
      navigator.requestMIDIAccess({ sysex: false }).then(access => {
        const attach = () => access.inputs.forEach(inp => { inp.onmidimessage = handleMIDIMessage; });
        attach();
        updateMIDIStatus(access);
        access.onstatechange = () => { attach(); updateMIDIStatus(access); };
      }).catch(() => { /* denied — fine, stay silent */ });
    };

    window.updateMIDIStatus = function(access) {
      const el = document.getElementById('midiStatus');
      if (!el) return;
      const names = [];
      access.inputs.forEach(inp => { if (inp.state === 'connected') names.push(inp.name); });
      if (names.length) {
        el.textContent = '🎹 ' + names.join(', ');
        el.classList.add('has-midi');
      } else {
        el.classList.remove('has-midi');
        el.textContent = '';
      }
    };
  }
  install();
})();

/* ---------- #5. Folding progress state ---------- */
/* Wrap foldSequence so we get a friendlier loading state and a button
   affordance while the request is in flight. */
(function wireFoldProgress() {
  function patch() {
    if (typeof foldSequence !== 'function') {
      return setTimeout(patch, 100);
    }
    const orig = window.foldSequence;

    window.foldSequence = async function() {
      if (typeof compSeq === 'undefined' || compSeq.length < 20) return;

      const foldBtn = document.getElementById('foldBtn');
      const seqLen = compSeq.length;

      // 1. Button state
      if (foldBtn) {
        foldBtn.classList.add('folding');
        foldBtn.disabled = true;
        foldBtn.textContent = 'folding';
      }

      // 2. Info panel overlay — replaces the plain "folding..." placeholder
      const el = document.getElementById('infoPanelContent');
      if (el) {
        el.innerHTML = `
          <div class="info-panel-title">Folding your protein</div>
          <div class="info-panel-subtitle">${seqLen} amino acids</div>
          <div class="fold-progress">
            <div class="fold-progress-row">
              <div class="fold-progress-spinner" aria-hidden="true"></div>
              <div class="fold-progress-title">Predicting a 3D shape…</div>
            </div>
            <div class="fold-progress-body">
              We're sending your sequence to <strong>ESMFold</strong>, an AI model
              that predicts how a chain of amino acids will fold up in three
              dimensions — a problem scientists spent 50 years trying to solve.
            </div>
            <div class="fold-progress-aside" id="foldProgressTip">This usually takes 10–30 seconds…</div>
          </div>
        `;

        // Rotate a friendly tip every few seconds so the wait doesn't feel dead
        const tips = [
          'This usually takes 10–30 seconds…',
          'Exploring billions of possible shapes…',
          'Asking an AI to solve a 50-year-old problem…',
          'Almost there — finalizing the structure…',
          'Still working — some proteins are stubborn…'
        ];
        let i = 0;
        const tipEl = document.getElementById('foldProgressTip');
        const tipTimer = setInterval(() => {
          i = (i + 1) % tips.length;
          if (tipEl && document.getElementById('foldProgressTip')) {
            tipEl.style.opacity = '0';
            setTimeout(() => {
              tipEl.textContent = tips[i];
              tipEl.style.opacity = '';
            }, 180);
          } else {
            clearInterval(tipTimer);
          }
        }, 4000);
        window.__foldTipTimer = tipTimer;
      }

      try {
        // Call the original (it does the fetch + success path)
        await orig.apply(this, arguments);
      } finally {
        if (window.__foldTipTimer) { clearInterval(window.__foldTipTimer); window.__foldTipTimer = null; }
        if (foldBtn) {
          foldBtn.classList.remove('folding');
          // Let updateFoldBtn() reset the label based on new state
          if (typeof updateFoldBtn === 'function') updateFoldBtn();
        }
      }
    };
  }
  patch();
})();
