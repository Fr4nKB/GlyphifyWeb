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