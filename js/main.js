// Theme: default to system, allow manual override for this session
const html = document.documentElement;
const toggle = document.getElementById('themeToggle');
html.setAttribute('data-theme', 'auto');
toggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveDark = current === 'dark' || (current === 'auto' && systemDark);
  html.setAttribute('data-theme', effectiveDark ? 'light' : 'dark');
});


// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(other => {
      if (other !== item) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      }
    });
    if (isOpen) {
      item.classList.remove('open');
      a.style.maxHeight = null;
    } else {
      item.classList.add('open');
      a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
});


// Privacy policy toggle
const policyToggle = document.getElementById('policyToggle');
const policyBody   = document.getElementById('policyBody');

policyToggle.addEventListener('click', () => {
  const isOpen = policyToggle.getAttribute('aria-expanded') === 'true';
  policyToggle.setAttribute('aria-expanded', String(!isOpen));
  policyBody.style.maxHeight = isOpen ? '0' : policyBody.scrollHeight + 'px';
});


// OSS Licenses section
(function () {
  const toggle = document.getElementById('licensesToggle');
  const body = document.getElementById('licensesBody');
  const status = document.getElementById('licensesStatus');
  const librariesEl = document.getElementById('libraries');
  const licenseDetailsEl = document.getElementById('licenseDetails');
  const licenseDetailsTitle = document.getElementById('licenseDetailsTitle');
  if (!toggle || !body || !librariesEl) return;

  let loaded = false;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!isOpen));
    body.style.maxHeight = isOpen ? '0' : body.scrollHeight + 'px';

    if (!loaded) {
      loaded = true;
      loadLicenses();
    }
  });

  async function loadLicenses() {
    try {
      const res = await fetch('/assets/data/licenses.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const jsonData = await res.json();
      render(jsonData);
      status.style.display = 'none';
      body.style.maxHeight = body.scrollHeight + 'px'; // recalc after content injected
    } catch (err) {
      status.textContent = 'Could not load license data. Try again later.';
      console.error('Licenses load error:', err);
    }
  }

  function render(jsonData) {
    const libraries = jsonData.libraries || [];

    // Libraries
    let librariesOutput = '';
    libraries
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(library => {
        librariesOutput += `
          <div class="library">
            <h3>${escapeHtml(library.name)} <span class="lib-version">v${escapeHtml(library.artifactVersion || '')}</span></h3>
            ${library.description ? `<p>${escapeHtml(library.description)}</p>` : ''}
            <p class="lib-meta"><strong>License:</strong> ${escapeHtml((library.licenses || []).join(', ') || 'Unknown')}</p>
            ${library.licenseDetails ? `<p class="lib-meta"><strong>License details:</strong> <a href="${escapeHtml(library.licenseDetails)}" target="_blank" rel="noopener">${escapeHtml(library.licenseDetails)}</a></p>` : ''}
            ${library.dynamicLinkingInstructions ? `<p class="lib-meta"><strong>Dynamic linking:</strong> ${escapeHtml(library.dynamicLinkingInstructions)}</p>` : ''}
            ${library.website ? `<p><a href="${escapeHtml(library.website)}" target="_blank" rel="noopener">Learn more →</a></p>` : ''}
          </div>
        `;
      });
    librariesEl.innerHTML = librariesOutput;

    // License texts (only if jsonData.licenses present, e.g. --fetchRemoteLicense export)
    if (jsonData.licenses && Object.keys(jsonData.licenses).length) {
      let licenseDetailsOutput = '';
      for (const key in jsonData.licenses) {
        const license = jsonData.licenses[key];
        licenseDetailsOutput += `
          <div class="license">
            <h4>${escapeHtml(license.name || key)}</h4>
            ${license.url ? `<p><strong>URL:</strong> <a href="${escapeHtml(license.url)}" target="_blank" rel="noopener">${escapeHtml(license.url)}</a></p>` : ''}
            ${license.content ? `<pre class="license-content">${escapeHtml(license.content)}</pre>` : ''}
          </div>
        `;
      }
      licenseDetailsEl.innerHTML = licenseDetailsOutput;
      licenseDetailsTitle.style.display = '';
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();