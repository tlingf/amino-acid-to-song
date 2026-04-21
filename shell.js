/* ─────────────────────────────────────────────────────────────────
   Shell — hero scroll + tabs + UX refinements
   ───────────────────────────────────────────────────────────────── */

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
  return '<span class="mode-help-step"><b>1.</b> Press piano keys: each key is an amino acid</span>'
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
  function install() {
    const cap = document.getElementById('bindingCaption');
    if (!cap) { setTimeout(install, 100); return; }
    if (cap.dataset.friendlyWired === '1') return;
    cap.dataset.friendlyWired = '1';
    let rewriting = false;
    const rewrite = () => {
      if (rewriting) return;
      if (cap.style.display === 'none') return;
      if (typeof activeComplex === 'undefined' || !activeComplex) return;
      // Only rewrite if the caption doesn't already contain our friendly copy
      if (cap.innerHTML.includes('stick together')) return;
      rewriting = true;
      const a = activeComplex.chainA.name, b = activeComplex.chainB.name;
      cap.classList.add('friendly');
      cap.innerHTML =
        `<strong>These two proteins stick together.</strong> `
      + `The rows below show which letters of <em>${a}</em> touch which letters of <em>${b}</em> — `
      + `the spots where they physically clasp on to each other. `
      + `When you play, both melodies sound at once: they <em>harmonize</em> at the contact points.`;
      setTimeout(() => { rewriting = false; }, 0);
    };
    const mo = new MutationObserver(rewrite);
    mo.observe(cap, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    // Run once in case content is already there
    rewrite();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();

/* ---------- Mapping panel: collapsible disclosure ---------- */
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

/* ---------- Auto-play on preset click ---------- */
/* Player.js binds onclick handlers via lexical references (btn.onclick = () => loadPresetClear(p)),
   so a window.loadPresetClear override doesn't reach them. Use click
   delegation on the preset containers instead, and trigger playback
   shortly after the underlying handler runs. */
(function wireAutoPlay() {
  function install() {
    const containers = ['presets', 'harmonyBtns'];
    let attached = 0;
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.autoplayWired === '1') return;
      el.dataset.autoplayWired = '1';
      // Use capture phase: player.js re-renders the container on click
      // (detaching the clicked button), so we need to observe the click
      // BEFORE the native onclick handler fires and mutates the DOM.
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        let tries = 0;
        const maxTries = 20; // ~2 seconds
        const poll = () => {
          tries++;
          if (typeof playing !== 'undefined' && !playing
              && typeof seq !== 'undefined' && seq && seq.length
              && typeof togglePlay === 'function') {
            togglePlay();
            return;
          }
          if (tries < maxTries) setTimeout(poll, 100);
        };
        setTimeout(poll, 150);
      }, true);
      attached++;
    });
    window.__autoPlayAttached = attached;
  }
  // Run immediately if containers already exist (script is at end of body so
  // player.js has already populated them); also listen for DOMContentLoaded as a fallback.
  if (document.getElementById('presets') || document.getElementById('harmonyBtns')) {
    install();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    // DOM is ready but containers missing — retry shortly (player.js may be mid-render)
    setTimeout(install, 50);
    setTimeout(install, 200);
  }
})();

/* ---------- MIDI banner: only show when a device is connected ---------- */
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

/* ---------- Folding progress state ---------- */
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
      // Build the AI-blurb HTML once so we can write it both now AND after
      // orig.foldSequence clobbers innerHTML with its own "folding..." placeholder.
      const aiBlurbHTML = `
          <div class="info-panel-title">Folding your protein</div>
          <div class="info-panel-subtitle">${seqLen} amino acids · powered by AI</div>
          <div class="fold-progress">
            <div class="fold-progress-row">
              <div class="fold-progress-spinner" aria-hidden="true"></div>
              <div class="fold-progress-title">Predicting a 3D shape…</div>
            </div>
            <div class="fold-progress-body">
              This is a small miracle of modern AI. For 50 years, figuring out
              how a protein folds from its sequence was biology's grand
              challenge — a single structure could take a PhD student years in
              the lab. In 2020, DeepMind's <strong>AlphaFold</strong> cracked
              it with deep learning; in 2024 its creators won the
              <strong>Nobel Prize in Chemistry</strong>.
              <br/><br/>
              Right now, <strong>ESMFold</strong> (Meta AI's open-source
              cousin) is reading your sequence and predicting its shape in
              seconds — something unthinkable before 2020.
            </div>
            <div class="fold-progress-aside" id="foldProgressTip">This usually takes 10–30 seconds…</div>
          </div>
        `;

      const el = document.getElementById('infoPanelContent');
      if (el) {
        el.innerHTML = aiBlurbHTML;
      }

      // Rotate a friendly tip every few seconds so the wait doesn't feel dead
      const tips = [
        'This usually takes 10–30 seconds…',
        'A decade ago, this took a PhD student years in a lab…',
        'Exploring billions of possible 3D conformations…',
        'The AI has seen ~200 million known protein structures…',
        'Almost there — finalizing the atoms…',
        'Still working — some sequences are trickier than others…'
      ];
      function startTipTimer() {
        if (window.__foldTipTimer) clearInterval(window.__foldTipTimer);
        let i = 0;
        window.__foldTipTimer = setInterval(() => {
          i = (i + 1) % tips.length;
          const tipEl = document.getElementById('foldProgressTip');
          if (!tipEl) { clearInterval(window.__foldTipTimer); window.__foldTipTimer = null; return; }
          tipEl.style.opacity = '0';
          setTimeout(() => {
            tipEl.textContent = tips[i];
            tipEl.style.opacity = '';
          }, 180);
        }, 4000);
      }
      startTipTimer();

      try {
        // Kick off the original (it synchronously overwrites #infoPanelContent
        // with its own "folding..." placeholder, then awaits fetch). We start
        // it first, then re-apply the AI blurb in a microtask so it wins.
        const p = orig.apply(this, arguments);
        // Microtask queues before the fetch resolves, after orig's sync write.
        Promise.resolve().then(() => {
          const el2 = document.getElementById('infoPanelContent');
          if (el2) el2.innerHTML = aiBlurbHTML;
          // Tip timer references #foldProgressTip by ID; after re-rendering,
          // the node is fresh but the interval still works.
          startTipTimer();
        });
        await p;
        // Fold succeeded — append the AI blurb below the results so it persists
        const elAfter = document.getElementById('infoPanelContent');
        if (elAfter && document.getElementById('matchResults')) {
          const blurbDiv = document.createElement('div');
          blurbDiv.className = 'fold-marvel-blurb';
          blurbDiv.innerHTML = `
            <div style="margin-top:12px;padding-top:10px;border-top:0.5px solid var(--color-border-tertiary);font-size:10px;color:var(--color-text-tertiary);line-height:1.5">
              This is a small miracle of modern AI. For 50 years, figuring out how a protein folds from
              its sequence was biology's grand challenge: a single structure could take years in the lab to figure out.
               In 2020, DeepMind's <strong>AlphaFold</strong> cracked it with deep
              learning; Right now, <strong>ESMFold</strong> (Meta AI's open-source cousin) predicted your shape in
              seconds.
            </div>`;
          elAfter.appendChild(blurbDiv);
        }
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
