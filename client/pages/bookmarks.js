// ============================================================
//  Freelancer — client/pages/bookmarks.js
//  Bookmarks: websites, tools, and their login credentials.
//  Credentials stored encrypted-at-rest in Supabase (RLS).
// ============================================================

const BM_TAGS = ["Design","Dev","Marketing","Finance","Productivity","Hosting","Social","Other"];

function bookmarksHTML() {
  const { bookmarks } = STATE.data;
  const tag    = window._bmTag    || "All";
  const search = window._bmSearch || "";

  let items = tag === "All" ? bookmarks : bookmarks.filter(b => b.tag === tag);
  if (search) items = items.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.url?.toLowerCase().includes(search.toLowerCase()) ||
    b.tag?.toLowerCase().includes(search.toLowerCase())
  );

  const totalMonthlyCost = bookmarks
    .filter(b => b.monthly_cost)
    .reduce((s, b) => s + Number(b.monthly_cost), 0);

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">// bookmarks</div>
    <div class="page-sub">${bookmarks.length} saved · ${BM_TAGS.filter(t => bookmarks.some(b => b.tag === t)).length} categories${totalMonthlyCost > 0 ? ` · ${usd(totalMonthlyCost)}/mo tracked` : ""}</div>
  </div>
  <button class="btn btn-primary" onclick="openBmModal(null)">+ add</button>
</div>

<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
  <div style="position:relative;flex:1;min-width:200px;max-width:320px">
    <input id="bm-search" value="${search}" placeholder="search bookmarks…"
      oninput="window._bmSearch=this.value;render()"
      style="padding-left:32px"/>
    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px">⌕</span>
  </div>
  <div class="filter-row" style="margin:0;gap:6px">
    ${["All",...BM_TAGS].map(t =>
      `<button class="filter-btn${tag===t?" active":""}" onclick="setBmTag('${t}')">${t}</button>`
    ).join("")}
  </div>
</div>

${items.length === 0
  ? `<div class="empty"><div class="empty-icon">🔖</div><div class="empty-text">no bookmarks${search||tag!=="All"?" matching these filters":""} yet.</div></div>`
  : `<div class="bookmark-grid">
      ${items.map(b => _bookmarkCard(b)).join("")}
    </div>`}`;
}

function _bookmarkCard(b) {
  const hasCreds = b.login_email || b.login_username || b.login_password;
  return `
<div class="bookmark-card">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
    <div style="min-width:0">
      <div class="bookmark-name">${b.name}</div>
      ${b.url ? `<a class="bookmark-url" href="${b.url}" target="_blank" rel="noopener">${b.url.replace(/^https?:\/\//,"")}</a>` : ""}
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="btn btn-ghost btn-sm" onclick="openBmModal('${b.id}')" style="padding:4px 8px;font-size:10px">edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteBm('${b.id}')" style="padding:4px 8px;font-size:10px">×</button>
    </div>
  </div>

  ${b.description ? `<div style="font-size:11px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;line-height:1.5">${b.description}</div>` : ""}

  ${hasCreds ? `
  <div style="padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:10px;display:flex;flex-direction:column;gap:6px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px">
      credentials <span style="color:var(--accent);font-size:9px">◆ pin protected</span>
    </div>
    ${b.login_email    ? `<div class="bookmark-cred">@
      <span style="color:var(--text)">${b.login_email}</span>
      <button class="bookmark-cred-reveal"
        data-val="${b.login_email.replace(/"/g,'&quot;')}"
        onclick="bmCopy(this)">copy</button>
    </div>` : ""}
    ${b.login_username ? `<div class="bookmark-cred">id
      <span style="color:var(--text)">${b.login_username}</span>
      <button class="bookmark-cred-reveal"
        data-val="${b.login_username.replace(/"/g,'&quot;')}"
        onclick="bmCopy(this)">copy</button>
    </div>` : ""}
    ${b.login_password ? `<div class="bookmark-cred">pw
      <span id="pw-${b.id}" style="color:var(--text);letter-spacing:2px">••••••••</span>
      <button class="bookmark-cred-reveal"
        data-id="${b.id}"
        data-pw="${b.login_password.replace(/"/g,'&quot;')}"
        onclick="bmShowPw(this)">show</button>
      <button class="bookmark-cred-reveal"
        data-val="${b.login_password.replace(/"/g,'&quot;')}"
        onclick="bmCopy(this)">copy</button>
    </div>` : ""}
  </div>` : ""}

  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
    ${b.tag ? `<span class="bookmark-tag">${b.tag}</span>` : "<span></span>"}
    ${b.monthly_cost > 0 ? `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#3bf4a3">${usd(b.monthly_cost)}/mo</span>` : ""}
  </div>
</div>`;
}

// PIN-gated credential helpers
window.bmShowPw = function(btn) {
  const id = btn.dataset.id;
  const pw = btn.dataset.pw;
  const el = document.getElementById("pw-" + id);
  if (!el) return;

  // If already revealed, hide it
  if (el.textContent !== "••••••••") {
    el.textContent = "••••••••";
    el.style.letterSpacing = "2px";
    btn.textContent = "show";
    return;
  }

  // Require PIN before revealing
  requirePin(() => {
    el.textContent = pw;
    el.style.letterSpacing = "normal";
    btn.textContent = "hide";
    // Auto-hide after 30 seconds
    setTimeout(() => {
      if (el.textContent !== "••••••••") {
        el.textContent = "••••••••";
        el.style.letterSpacing = "2px";
        btn.textContent = "show";
      }
    }, 30000);
  });
};

window.bmCopy = function(btn) {
  const val = btn.dataset.val;
  requirePin(() => {
    navigator.clipboard.writeText(val).catch(() => {});
    const orig = btn.textContent;
    btn.textContent = "copied!";
    setTimeout(() => btn.textContent = orig, 1500);
  });
};

window.setBmTag = function(t) { window._bmTag = t; render(); };

// ── Modal ─────────────────────────────────────────────────────
window.openBmModal = function(id) {
  const b = id ? STATE.data.bookmarks.find(x => x.id === id) : null;
  showModal(`
<div class="modal-header">
  <div class="modal-title">${b ? "edit bookmark" : "new bookmark"}</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Name</label>
    <input id="bm-name" value="${b?.name||""}" placeholder="Figma"/>
  </div>
  <div class="form-group">
    <label class="form-label">Tag</label>
    <select id="bm-tag">
      ${BM_TAGS.map(t => `<option${b?.tag===t?" selected":""}>${t}</option>`).join("")}
    </select>
  </div>
</div>
<div class="form-group">
  <label class="form-label">URL</label>
  <input id="bm-url" value="${b?.url||""}" placeholder="https://figma.com" type="url"/>
</div>
<div class="form-group">
  <label class="form-label">Description</label>
  <input id="bm-desc" value="${b?.description||""}" placeholder="UI design tool"/>
</div>

<div style="margin:16px 0 12px;padding-top:14px;border-top:1px solid #24242d">
  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);letter-spacing:.6px;text-transform:uppercase;margin-bottom:12px">login credentials (optional)</div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">Email</label>
      <input id="bm-email" value="${b?.login_email||""}" placeholder="you@example.com" type="email" autocomplete="off"/>
    </div>
    <div class="form-group">
      <label class="form-label">Username</label>
      <input id="bm-username" value="${b?.login_username||""}" placeholder="@handle" autocomplete="off"/>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">Password</label>
    <div class="conn-input-wrap">
      <input id="bm-password" type="password" value="${b?.login_password||""}" placeholder="••••••••" autocomplete="new-password"/>
      <button class="conn-eye" onclick="document.getElementById('bm-password').type=document.getElementById('bm-password').type==='password'?'text':'password'">👁</button>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">Notes / 2FA info</label>
    <textarea id="bm-notes" rows="2" placeholder="2FA on Google Authenticator, recovery email is…">${b?.notes||""}</textarea>
  </div>
</div>

<div class="form-group">
  <label class="form-label">Monthly Cost ($)</label>
  <input id="bm-cost" type="number" min="0" step="0.01" value="${b?.monthly_cost||""}" placeholder="0.00"/>
  <div style="font-size:10px;color:var(--text-muted);font-family:'JetBrains Mono',monospace;margin-top:4px">if this is a paid subscription, shows in total above</div>
</div>

<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" id="bm-save-btn" onclick="saveBm('${id||""}')">
    ${b ? "save changes" : "add bookmark"}
  </button>
</div>`);
};

window.saveBm = async function(id) {
  const body = {
    name:           document.getElementById("bm-name").value.trim(),
    url:            document.getElementById("bm-url").value.trim(),
    description:    document.getElementById("bm-desc").value.trim(),
    tag:            document.getElementById("bm-tag").value,
    login_email:    document.getElementById("bm-email").value.trim(),
    login_username: document.getElementById("bm-username").value.trim(),
    login_password: document.getElementById("bm-password").value,
    notes:          document.getElementById("bm-notes").value.trim(),
    monthly_cost:   parseFloat(document.getElementById("bm-cost").value) || null,
  };
  if (!body.name) return;
  const btn = document.getElementById("bm-save-btn");
  btn.disabled = true; btn.textContent = "saving…";
  try {
    if (id) await db.update("bookmarks", id, body);
    else     await db.insert("bookmarks", body);
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); btn.disabled = false; btn.textContent = "save"; }
};

window.deleteBm = async function(id) {
  if (!confirm("Delete this bookmark?")) return;
  await db.delete("bookmarks", id); loadAll();
};

window.bookmarksHTML = bookmarksHTML;

// ============================================================
//  DESKTOP — Bookmarks vault
//  Full-page PIN gate using the real PIN system already in
//  pin.js (hasPinSet/pinSessionActive/requirePin) — no separate
//  "vault" mechanic invented, this just restyles the existing
//  15-minute session as a whole-page lock screen.
// ============================================================
function bookmarksDesktopHTML() {
  const locked = typeof hasPinSet === "function" && hasPinSet() && !(typeof pinSessionActive === "function" && pinSessionActive());
  if (locked) return _vaultLockScreenHTML();
  return _vaultUnlockedHTML();
}
window.bookmarksDesktopHTML = bookmarksDesktopHTML;

function _vaultLockScreenHTML() {
  return `
<div class="vault-lock">
  <div class="vault-lock-icon">◈</div>
  <div class="vault-lock-title">Locked by default</div>
  <div class="vault-lock-sub">Every visit starts locked. Enter your PIN to unlock the vault for ${typeof PIN_SESSION_MINUTES !== "undefined" ? PIN_SESSION_MINUTES : 15} minutes.</div>
  <button class="btn btn-primary" onclick="requirePin(()=>render())">Unlock vault</button>
</div>`;
}

function _vaultRemainingMin() {
  try {
    const until = parseInt(localStorage.getItem("fh_pin_until") || "0");
    return Math.max(0, Math.ceil((until - Date.now()) / 60000));
  } catch (e) { return 0; }
}

function _vaultUnlockedHTML() {
  const { bookmarks } = STATE.data;
  const tag    = window._bmTag    || "All";
  const search = window._bmSearch || "";
  const hasPin = typeof hasPinSet === "function" && hasPinSet();

  let items = tag === "All" ? bookmarks : bookmarks.filter(b => b.tag === tag);
  if (search) items = items.filter(b =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.url?.toLowerCase().includes(search.toLowerCase()) ||
    b.tag?.toLowerCase().includes(search.toLowerCase())
  );
  const totalMonthlyCost = bookmarks.filter(b => b.monthly_cost).reduce((s,b)=>s+Number(b.monthly_cost),0);

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Bookmarks</div>
    ${hasPin ? `<div class="vault-unlocked-badge"><span class="vault-unlocked-dot"></span>Unlocked · re-locks in ${_vaultRemainingMin()}m</div>`
             : `<div class="page-sub">${bookmarks.length} saved${totalMonthlyCost>0?` · ${usd(totalMonthlyCost)}/mo tracked`:""} · <span style="color:var(--warning)">no PIN set — set one in Account &amp; Settings to protect these</span></div>`}
  </div>
  <div class="btn-row">
    ${hasPin ? `<button class="btn btn-ghost" onclick="clearPinSession();render()">Lock now</button>` : ""}
    <button class="btn btn-primary" onclick="openBmModal(null)">+ Add credential</button>
  </div>
</div>

<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center">
  <div style="position:relative;flex:1;min-width:200px;max-width:320px">
    <input id="bm-search" value="${search}" placeholder="search bookmarks…" oninput="window._bmSearch=this.value;render()" style="padding-left:32px"/>
    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px">⌕</span>
  </div>
  <div class="filter-row" style="margin:0;gap:6px">
    ${["All",...BM_TAGS].map(t => `<button class="filter-btn${tag===t?" active":""}" onclick="setBmTag('${t}')">${t}</button>`).join("")}
  </div>
</div>

${items.length === 0
  ? `<div class="empty"><div class="empty-text">no bookmarks${search||tag!=="All"?" matching these filters":""} yet.</div></div>`
  : `<div style="display:flex;align-items:center;gap:16px;padding:0 16px 10px;font-family:var(--font-mono);font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted)">
      <div style="flex:1;min-width:0">Service</div><div style="width:200px">Username</div><div style="width:150px">Secret</div><div style="width:90px;text-align:right">Updated</div>
    </div>
    <div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      ${items.map(b => _vaultRowHTML(b)).join("")}
    </div>`}`;
}

function _vaultRowHTML(b) {
  const hasCreds = b.login_email || b.login_username || b.login_password;
  return `
<div style="display:flex;align-items:center;gap:16px;padding:14px 16px;border-bottom:1px solid var(--border)">
  <div style="flex:1;min-width:0">
    <div style="font-size:13.5px;font-weight:600">${b.name}</div>
    ${b.url ? `<a href="${b.url}" target="_blank" rel="noopener" style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-decoration:none">${b.url.replace(/^https?:\/\//,"")}</a>` : (b.description ? `<div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${b.description}</div>` : "")}
  </div>
  <div style="width:200px;font-family:var(--font-mono);font-size:12.5px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.login_email || b.login_username || "—"}</div>
  <div style="width:150px">
    ${b.login_password ? `
    <div style="display:flex;align-items:center;gap:9px">
      <span id="pw-${b.id}" style="font-family:var(--font-mono);font-size:12.5px;letter-spacing:.12em;color:var(--text-muted)">••••••••</span>
      <button class="cred-reveal-inline" data-id="${b.id}" data-pw="${b.login_password.replace(/"/g,'&quot;')}" onclick="bmShowPw(this)">reveal</button>
    </div>` : `<span style="font-family:var(--font-mono);font-size:12px;color:var(--border-2)">—</span>`}
  </div>
  <div style="width:90px;text-align:right;font-family:var(--font-mono);font-size:11.5px;color:var(--text-muted)">${fmtDate(b.updated_at || b.created_at).replace(/, \d{4}$/,"")}</div>
  <div style="display:flex;gap:6px;flex-shrink:0">
    <button class="btn btn-ghost btn-sm" onclick="openBmModal('${b.id}')" style="padding:4px 8px;font-size:10px">edit</button>
    <button class="btn btn-danger btn-sm" onclick="deleteBm('${b.id}')" style="padding:4px 8px;font-size:10px">×</button>
  </div>
</div>`;
}
