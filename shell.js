/* ─────────────  Shell: hero scroll + tab switching  ───────────── */

/* Smooth scroll to app from hero. If target='compose', also switch tab. */
function scrollToApp(target) {
  const app = document.getElementById('app');
  if (!app) return;
  if (target === 'compose') {
    // schedule tab switch after scroll starts so transition lands right
    setTimeout(() => switchTab('compose'), 100);
  }
  app.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Current mode ('listen' | 'compose'). */
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

    help.innerHTML =
      '<span class="mode-help-step"><b>1.</b> Press piano keys — each key is an amino acid</span>'
      + '<span class="mode-help-sep">→</span>'
      + '<span class="mode-help-step"><b>2.</b> Optionally follow <span style="color:#534AB7;font-weight:600">glowing</span> suggestions</span>'
      + '<span class="mode-help-sep">→</span>'
      + '<span class="mode-help-step"><b>3.</b> Reach 20+ residues, then <kbd>fold it!</kbd></span>';

    // Enter compose mode in the underlying app
    if (typeof composing !== 'undefined' && !composing) toggleCompose();
    updateComposeEmpty();
  } else {
    tabCompose.classList.remove('active'); tabCompose.setAttribute('aria-selected', 'false');
    tabListen.classList.add('active'); tabListen.setAttribute('aria-selected', 'true');
    document.body.classList.remove('compose-mode');

    help.innerHTML =
      '<span class="mode-help-step"><b>1.</b> Pick a protein or binding pair below</span>'
      + '<span class="mode-help-sep">→</span>'
      + '<span class="mode-help-step"><b>2.</b> Press <kbd>🎵 play sequence</kbd></span>'
      + '<span class="mode-help-sep">→</span>'
      + '<span class="mode-help-step"><b>3.</b> Watch it light up in 3D</span>';

    // Exit compose mode in the underlying app
    if (typeof composing !== 'undefined' && composing) toggleCompose();
    // Restore a sensible default if no protein is loaded
    if ((typeof seq === 'undefined' || !seq.length) && typeof COMPLEXES !== 'undefined') {
      loadComplex(COMPLEXES[0]);
    }
  }
}

/* Toggle 'has-compose-seq' body class to hide the onboarding card as user builds. */
function updateComposeEmpty() {
  if (typeof compSeq === 'undefined') return;
  document.body.classList.toggle('has-compose-seq', compSeq.length > 0);
}

/* Observe changes via a MutationObserver on composeSeq. */
document.addEventListener('DOMContentLoaded', () => {
  const cs = document.getElementById('composeSeq');
  if (cs) {
    const mo = new MutationObserver(updateComposeEmpty);
    mo.observe(cs, { childList: true });
  }
  updateComposeEmpty();
});

/* If the underlying app flips into compose mode via a key press (user types
   an amino acid letter while in Listen), sync our tab state. */
const _origToggleCompose = typeof toggleCompose === 'function' ? toggleCompose : null;
if (_origToggleCompose) {
  window.toggleCompose = function() {
    _origToggleCompose.apply(this, arguments);
    // After toggling, sync tabs to composing state
    if (typeof composing !== 'undefined') {
      const shouldBeCompose = composing;
      if (shouldBeCompose && currentTab !== 'compose') {
        currentTab = 'compose';
        document.getElementById('tabListen').classList.remove('active');
        document.getElementById('tabCompose').classList.add('active');
        document.body.classList.add('compose-mode');
        const help = document.getElementById('modeHelp');
        if (help) help.innerHTML =
          '<span class="mode-help-step"><b>1.</b> Press piano keys — each key is an amino acid</span>'
          + '<span class="mode-help-sep">→</span>'
          + '<span class="mode-help-step"><b>2.</b> Optionally follow <span style="color:#534AB7;font-weight:600">glowing</span> suggestions</span>'
          + '<span class="mode-help-sep">→</span>'
          + '<span class="mode-help-step"><b>3.</b> Reach 20+ residues, then <kbd>fold it!</kbd></span>';
      } else if (!shouldBeCompose && currentTab !== 'listen') {
        currentTab = 'listen';
        document.getElementById('tabCompose').classList.remove('active');
        document.getElementById('tabListen').classList.add('active');
        document.body.classList.remove('compose-mode');
      }
      updateComposeEmpty();
    }
  };
}
