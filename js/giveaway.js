(() => {
  const API = "https://giveaway.fr4nkb.workers.dev";
  const SITE_KEY = "0x4AAAAAAFPFhSOIHU_jAXiO";

  const TAP_WINDOW_MS = 2500;
  const HOLD_MS = 1500;
  const TOKEN_WAIT_MS = 6000;

  const POOL = [
    { sel: ".hero h1 .accent", how: "hold" },
    { sel: ".stats .stat:nth-child(1)", how: "hold" },
    { sel: ".stats .stat:nth-child(2)", how: "hold" },
    { sel: "#features .feature h3", how: "hold" },
    { sel: ".chips .chip:nth-child(1)", how: "hold" },
    { sel: ".chips .chip:nth-child(7)", how: "hold" },
    { sel: "#features h2", how: "hold" },
    { sel: "#press h2", how: "hold" },
  ]
    .map(t => ({ ...t, el: document.querySelector(t.sel) }))
    .filter(t => t.el);
  if (!POOL.length) return;

  function pickIndex() {
    const rand = () => Math.floor(Math.random() * POOL.length);
    try {
      const saved = parseInt(localStorage.getItem("gw_t"), 10);
      if (saved >= 0 && saved < POOL.length) return saved;
      const i = rand();
      localStorage.setItem("gw_t", String(i));
      return i;
    } catch {
      return rand();
    }
  }

  // hidden trigger
  const idx = pickIndex();
  const { el: trigger, how, n } = POOL[idx];
  // Decoys must not look clickable: neutralise any cursor the site CSS gives them.
  POOL.forEach((t, i) => {
    if (i !== idx && !t.el.closest("a")) t.el.style.cursor = "default";
  });
  trigger.classList.add("gw-t");
  const light = v => trigger.style.setProperty("--gw-lit", v);

  if (how === "taps") {
    let taps = 0, timer = null;
    trigger.addEventListener("click", e => {
      e.preventDefault();
      taps++;
      clearTimeout(timer);
      light(0.4 + 0.6 * taps / n); // visible from the first tap
      if (taps >= n) {
        taps = 0;
        setTimeout(() => light(0), 400);
        openModal();
        return;
      }
      timer = setTimeout(() => { taps = 0; light(0); }, TAP_WINDOW_MS);
    });
  } else {
    let timer = null;
    trigger.style.touchAction = "none"; // stop the browser cancelling the press to scroll
    const stop = () => {
      clearTimeout(timer);
      trigger.style.transition = "";
      light(0);
    };
    trigger.addEventListener("pointerdown", e => {
      if (e.button > 0) return;
      trigger.style.transition = `text-shadow ${HOLD_MS}ms linear, filter ${HOLD_MS}ms linear`;
      light(1);
      timer = setTimeout(() => { stop(); openModal(); }, HOLD_MS);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => trigger.addEventListener(ev, stop));
    trigger.addEventListener("contextmenu", e => e.preventDefault());
  }

  // modal
  let dlg, cf, msg, claimBtn, deadBtn, redeemLink, after;
  let token = null, widgetId = null, tokenWatch = null;

  const MESSAGES = {
    empty: "All codes are claimed :(\nThank you for participating!",
    captcha_failed: "Captcha failed. Wait a moment and try again.",
    not_allowed: "No replacements left. Each person gets one replacement code.",
    busy: "Too many requests right now. Try again later.",
    error: "Network error. Try again.",
  };

  function build() {
    if (dlg) return;
    dlg = document.createElement("dialog");
    dlg.className = "gw";
    dlg.setAttribute("aria-labelledby", "gw-title");
    dlg.innerHTML = `
      <button class="gw-x" type="button" aria-label="Close">&times;</button>
      <h2 id="gw-title">You found it</h2>
      <p class="gw-lead">You've just unlocked the true power of Glyphs.<br>Claim your Glyphify promo code for Google Play!</p>
      <div class="gw-cf"></div>
      <button class="gw-btn gw-primary" type="button" data-act="claim" disabled>Get my code</button>
      <div class="gw-after" hidden>
        <a class="gw-btn gw-primary" data-act="redeem" target="_blank" rel="noopener">Redeem on Google Play</a>
        <button class="gw-btn gw-ghost" type="button" data-act="dead" hidden>Code didn't work</button>
      </div>
      <p class="gw-msg" role="status" aria-live="polite"></p>`;
    document.body.appendChild(dlg);

    cf = dlg.querySelector(".gw-cf");
    msg = dlg.querySelector(".gw-msg");
    claimBtn = dlg.querySelector('[data-act="claim"]');
    deadBtn = dlg.querySelector('[data-act="dead"]');
    redeemLink = dlg.querySelector('[data-act="redeem"]');
    after = dlg.querySelector(".gw-after");

    dlg.querySelector(".gw-x").onclick = () => dlg.close();
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); // backdrop

    claimBtn.onclick = onClaim;
    deadBtn.onclick = onDead;
    // The Worker marks the code as clicked on /go; only then is a reroll allowed.
    redeemLink.addEventListener("click", () => { deadBtn.hidden = false; });
  }

  function openModal() {
    build();
    if (!dlg.open) dlg.showModal();
    if (widgetId === null) {
      loadTurnstile()
        .then(ts => {
          if (widgetId !== null) return;
          widgetId = ts.render(cf, {
            sitekey: SITE_KEY,
            theme: "auto",
            callback: t => { token = t; clearTimeout(tokenWatch); refresh(); },
            "expired-callback": () => { token = null; refresh(); watchToken(); },
            "error-callback": () => {
              token = null;
              refresh();
              showCaptcha();
              setMsg("Captcha error. Reload the page and try again.");
            },
          });
        })
        .catch(() => setMsg("Could not load the captcha. Disable blockers and reload."));
    }
  }

  let tsPromise;
  function loadTurnstile() {
    if (tsPromise) return tsPromise;
    tsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => { tsPromise = null; reject(new Error("turnstile load failed")); };
      document.head.appendChild(s);
    });
    return tsPromise;
  }

  function hideCaptcha() { cf.classList.add("gw-cf-quiet"); }
  function showCaptcha() { cf.classList.remove("gw-cf-quiet"); }
  function watchToken() {
    clearTimeout(tokenWatch);
    tokenWatch = setTimeout(() => { if (!token) showCaptcha(); }, TOKEN_WAIT_MS);
  }

  // Worker calls
  function setMsg(t) { msg.textContent = t || ""; }
  function refresh() {
    claimBtn.disabled = !token;
    deadBtn.disabled = !token;
  }

  async function call(path, btn) {
    const label = btn.textContent;
    btn.textContent = "Working…";
    claimBtn.disabled = deadBtn.disabled = true;
    setMsg("");
    try {
      const res = await fetch(API + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      return await res.json();
    } catch {
      return { status: "error" };
    } finally {
      btn.textContent = label;
      token = null;
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      refresh();
    }
  }

  async function onClaim() {
    const r = await call("/claim", claimBtn);
    if (r.status === "ok") {
      claimBtn.hidden = true;
      redeemLink.href = API + "/go";
      after.hidden = false;
      setMsg("");
      hideCaptcha();
      watchToken();
    } else {
      if (r.status === "empty") { // nothing left to claim: remove the button and captcha
        claimBtn.hidden = true;
        hideCaptcha();
      }
      setMsg(MESSAGES[r.status] || "Something went wrong.");
    }
  }

  async function onDead() {
    const r = await call("/dead", deadBtn);
    if (r.status === "ok") {
      deadBtn.hidden = true; // one reroll only
      setMsg("New code assigned. Tap Redeem again.");
    } else {
      if (r.status === "not_allowed" || r.status === "empty") deadBtn.hidden = true;
      setMsg(
        r.status === "empty"
          ? "No spare codes are left to swap in. Thank you for participating!"
          : MESSAGES[r.status] || "Something went wrong."
      );
    }
  }
})();