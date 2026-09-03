// ============================================================
//  Freelancer — client/pages/tech-stack.js
//  Tech stack recurring charges — monthly, annual, one-time.
// ============================================================

const STACK_CATS = ["Hosting","Database","Auth","Analytics","Design","Dev Tools","Marketing","Communication","AI/ML","Storage","Other"];
const STACK_CYCLES = ["monthly","annual","one-time"];

function techStackHTML() {
  const { tech_stack } = STATE.data;
  const stack = tech_stack || [];

  const monthly  = stack.filter(s => s.cycle === "monthly").reduce((sum, s) => sum + Number(s.amount), 0);
  const annual   = stack.filter(s => s.cycle === "annual").reduce((sum, s) => sum + Number(s.amount), 0);
  const oneTime  = stack.filter(s => s.cycle === "one-time").reduce((sum, s) => sum + Number(s.amount), 0);
  const annualTotal = monthly * 12 + annual + oneTime;

  const byCat = {};
  STACK_CATS.forEach(c => {
    const items = stack.filter(s => s.category === c);
    if (items.length) byCat[c] = items;
  });

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">// tech_stack</div>
    <div class="page-sub">${stack.length} service${stack.length!==1?"s":""} · ${usd(monthly)}/mo · ${usd(annualTotal)}/yr est.</div>
  </div>
  <div class="btn-row">
    <div style="position:relative;min-width:220px">
      <input id="stack-search" placeholder="search tools…"
        style="padding-left:32px;width:100%"
        oninput="filterStack(this.value)"
        onkeydown="if(event.key==='Escape'){this.value='';filterStack('')}"/>
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                   color:var(--text-muted);font-size:14px;pointer-events:none">⌕</span>
    </div>
    <button class="btn btn-primary" onclick="openStackModal(null)">+ add</button>
  </div>
</div>

<div class="grid-3" style="margin-bottom:24px">
  ${[
    { label: "monthly burn",   val: usd(monthly),     sub: `${stack.filter(s=>s.cycle==="monthly").length} subscriptions`,  color: "#3bf4a3" },
    { label: "annual costs",   val: usd(annual),      sub: `${stack.filter(s=>s.cycle==="annual").length} annual plans`,    color: "#f59e0b" },
    { label: "est. total/yr",  val: usd(annualTotal), sub: "monthly×12 + annual",                                           color: "#e2e8f0" },
  ].map(s => `
  <div class="card">
    <div class="card-label">${s.label}</div>
    <div class="card-value" style="color:${s.color}">${s.val}</div>
    <div class="card-sub">${s.sub}</div>
  </div>`).join("")}
</div>

${stack.length === 0
  ? `<div class="empty"><div class="empty-icon">⚡</div><div class="empty-text">no services tracked yet.</div></div>`
  : Object.entries(byCat).map(([cat, items]) => `
<div style="margin-bottom:24px">
  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:var(--text-muted);letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
    <span>${cat}</span>
    <span style="color:#3bf4a3">${usd(items.reduce((s,i)=>s+Number(i.cycle==="monthly"?i.amount:0),0))}/mo</span>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">
    ${items.map(s => `
    <div class="stack-card">
      <div style="min-width:0">
        <div class="stack-name">${s.name}</div>
        <div class="stack-cat">${s.category}${s.description ? " · " + s.description : ""}</div>
        ${s.url ? `<a href="${s.url}" target="_blank" rel="noopener" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#3bf4a3;text-decoration:none">${s.url.replace(/^https?:\/\//,"")}</a>` : ""}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="stack-amt">${usd(s.amount)}</div>
        <div class="stack-cycle">/${s.cycle}</div>
        ${s.renewal_date ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:2px">renews ${fmtDate(s.renewal_date)}</div>` : ""}
        ${(() => {
          const thisMonth = new Date().toISOString().slice(0,7);
          const logged = (STATE.data.finances||[]).some(f =>
            f.description === "Tech Stack: " + s.name &&
            f.type === "expense" &&
            f.date?.startsWith(thisMonth)
          );
          return logged ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--accent);margin-top:2px">✓ logged this month</div>` : "";
        })()}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" onclick="openStackModal('${s.id}')" style="font-size:10px;padding:4px 8px">edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStack('${s.id}')" style="font-size:10px;padding:4px 8px">×</button>
      </div>
    </div>`).join("")}
  </div>
</div>`).join("")}`;
}

// ── Modal ─────────────────────────────────────────────────────
window.openStackModal = function(id) {
  const s = id ? (STATE.data.tech_stack||[]).find(x => x.id === id) : null;
  showModal(`
<div class="modal-header">
  <div class="modal-title">${s ? "edit service" : "add service"}</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Service Name</label>
    <input id="st-name" value="${s?.name||""}" placeholder="Supabase"/>
  </div>
  <div class="form-group">
    <label class="form-label">Category</label>
    <select id="st-cat">
      ${STACK_CATS.map(c => `<option${s?.category===c?" selected":""}>${c}</option>`).join("")}
    </select>
  </div>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Amount ($)</label>
    <input id="st-amount" type="number" min="0" step="0.01" value="${s?.amount||""}" placeholder="25.00"/>
  </div>
  <div class="form-group">
    <label class="form-label">Billing Cycle</label>
    <select id="st-cycle">
      ${STACK_CYCLES.map(c => `<option${s?.cycle===c?" selected":""}>${c}</option>`).join("")}
    </select>
  </div>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">URL</label>
    <input id="st-url" value="${s?.url||""}" placeholder="https://supabase.com" type="url"/>
  </div>
  <div class="form-group">
    <label class="form-label">Renewal Date</label>
    <input id="st-renewal" type="date" value="${s?.renewal_date||""}"/>
  </div>
</div>
<div class="form-group">
  <label class="form-label">Description / Plan</label>
  <input id="st-desc" value="${s?.description||""}" placeholder="Pro plan, 10GB storage"/>
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" id="st-save-btn" onclick="saveStack('${id||""}')">
    ${s ? "save changes" : "add service"}
  </button>
</div>`);
};

window.saveStack = async function(id) {
  const body = {
    name:         document.getElementById("st-name").value.trim(),
    category:     document.getElementById("st-cat").value,
    amount:       parseFloat(document.getElementById("st-amount").value) || 0,
    cycle:        document.getElementById("st-cycle").value,
    url:          document.getElementById("st-url").value.trim(),
    renewal_date: document.getElementById("st-renewal").value ||
      // Default: today's date so billing day anchor is set correctly
      (document.getElementById("st-cycle").value !== "one-time"
        ? new Date().toISOString().slice(0, 10)
        : null),
    description:  document.getElementById("st-desc").value.trim(),
  };
  if (!body.name) return;
  const btn = document.getElementById("st-save-btn");
  btn.disabled = true; btn.textContent = "saving…";
  try {
    if (id) await db.update("tech_stack", id, body);
    else     await db.insert("tech_stack", body);
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); btn.disabled = false; btn.textContent = "save"; }
};

window.deleteStack = async function(id) {
  if (!confirm("Remove this service?")) return;
  await db.delete("tech_stack", id); loadAll();
};

window.filterStack = function(q) {
  const term = q.toLowerCase();
  const items = document.querySelectorAll(".stack-card");
  items.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.closest("[data-stack-item]")
      ? (card.closest("[data-stack-item]").style.display = !term || text.includes(term) ? "" : "none")
      : (card.style.display = !term || text.includes(term) ? "" : "none");
  });
  // Also hide empty category headers
  document.querySelectorAll("[data-stack-category]").forEach(section => {
    const visible = [...section.querySelectorAll(".stack-card")].some(c => c.style.display !== "none");
    section.style.display = visible ? "" : "none";
  });
};

window.techStackHTML = techStackHTML;

// ============================================================
//  DESKTOP — Tech Stack
//  Table + a right rail of real derived analytics: spend by
//  category and renewals due in the next 30 days (from
//  renewal_date — no invented "last used" or "rebilled" fields).
// ============================================================
function techStackDesktopHTML() {
  const stack = STATE.data.tech_stack || [];
  const monthly = stack.filter(s=>s.cycle==="monthly").reduce((s,x)=>s+Number(x.amount),0);
  const annual  = stack.filter(s=>s.cycle==="annual").reduce((s,x)=>s+Number(x.amount),0);
  const oneTime = stack.filter(s=>s.cycle==="one-time").reduce((s,x)=>s+Number(x.amount),0);
  const annualTotal = monthly*12 + annual + oneTime;

  const byCat = {};
  stack.forEach(s => { byCat[s.category] = (byCat[s.category]||0) + (s.cycle==="monthly" ? Number(s.amount) : 0); });
  const catRows = Object.entries(byCat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const maxCat = Math.max(1, ...catRows.map(([,v])=>v));

  const soon = stack.filter(s => s.renewal_date).map(s => ({
    ...s, days: Math.round((new Date(s.renewal_date) - new Date()) / 86400000)
  })).filter(s => s.days >= 0 && s.days <= 30).sort((a,b)=>a.days-b.days);

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Tech Stack</div>
    <div class="page-sub">${stack.length} subscription${stack.length!==1?"s":""} · ${usd(monthly)}/mo</div>
  </div>
  <div class="btn-row">
    <input id="stack-search" placeholder="search tools…" style="width:220px" oninput="filterStackDesktop(this.value)"/>
    <button class="btn btn-primary" onclick="openStackModal(null)">+ Add tool</button>
  </div>
</div>

<div class="desk-shell">
  <div class="desk-col-main">
    ${stack.length === 0
      ? `<div class="empty"><div class="empty-text">no services tracked yet.</div></div>`
      : `<div id="stack-desk-rows" style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
        ${stack.map(s => `
        <div class="desk-stack-row" style="display:flex;align-items:center;gap:16px;padding:14px 16px;border-bottom:1px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="font-size:13.5px;font-weight:600">${s.name}</div>
            <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-top:2px">${s.category}${s.description ? " · " + s.description : ""}</div>
          </div>
          <div style="width:110px;font-size:12.5px;color:var(--text-muted)">${s.category}</div>
          <div style="width:90px;text-align:right;font-family:var(--font-mono);font-size:12px;color:${s.renewal_date ? "var(--text-muted)" : "var(--border-2)"}">${s.renewal_date ? fmtDate(s.renewal_date).replace(/, \d{4}$/,"") : "—"}</div>
          <div style="width:80px;text-align:right;font-family:var(--font-mono);font-size:13.5px;font-weight:700">${usd(s.amount)}</div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-ghost btn-sm" onclick="openStackModal('${s.id}')" style="font-size:10px;padding:4px 8px">edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStack('${s.id}')" style="font-size:10px;padding:4px 8px">×</button>
          </div>
        </div>`).join("")}
        </div>`}

    ${soon.length ? `
    <div class="desk-alert" style="margin-top:16px">
      <span class="desk-alert-icon">!</span>
      <span style="flex:1">${soon[0].name} renews in ${soon[0].days} day${soon[0].days!==1?"s":""} — ${usd(soon[0].amount)}.</span>
    </div>` : ""}
  </div>

  <div class="desk-rail narrow">
    <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:4px">Monthly spend</div>
    <div style="font-family:var(--font-mono);font-size:34px;font-weight:700;line-height:1;letter-spacing:-0.03em;margin-bottom:6px">${usd(monthly)}</div>
    <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:22px">${usd(annualTotal)} a year est.</div>

    ${catRows.length ? `
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">By category</div>
    <div style="display:flex;flex-direction:column;gap:13px;margin-bottom:24px">
      ${catRows.map(([cat,val]) => `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12.5px">${cat}</span><span style="font-family:var(--font-mono);font-size:12px;font-weight:700">${usd(val)}</span></div>
        <div class="desk-progress"><span style="width:${Math.round(val/maxCat*100)}%"></span></div>
      </div>`).join("")}
    </div>` : ""}

    ${soon.length ? `
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Next 30 days</div>
    <div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      ${soon.map(s => `
      <div style="display:flex;gap:10px;padding:11px 13px;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);width:60px;flex-shrink:0">${fmtDate(s.renewal_date).replace(/, \d{4}$/,"")}</span>
        <span style="flex:1;font-size:12.5px">${s.name}</span>
        <span style="font-family:var(--font-mono);font-size:12px;font-weight:700">${usd(s.amount)}</span>
      </div>`).join("")}
    </div>` : ""}
  </div>
</div>`;
}
window.techStackDesktopHTML = techStackDesktopHTML;

window.filterStackDesktop = function(q) {
  const term = q.toLowerCase();
  document.querySelectorAll(".desk-stack-row").forEach(row => {
    row.style.display = !term || row.textContent.toLowerCase().includes(term) ? "" : "none";
  });
};
