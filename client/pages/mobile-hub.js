// ============================================================
//  Freelancer — client/pages/mobile-hub.js
//  Mobile section landing pages ("hubs").
//  Each bottom-tab opens a hub listing its pages plus a live
//  snapshot of the most relevant data for that section.
// ============================================================

const HUB_CONFIG = {
  // Reached from the logo / dashboard route — the mobile overview
  workspace: {
    title: "Hub",
    sub:   "Everything in one place",
    pages: [],
  },
};

// ── Small helpers ─────────────────────────────────────────────
function _hubStat(label, value, color) {
  return `
  <div style="flex:1;min-width:0;background:var(--bg);border:1px solid var(--border);
    border-radius:6px;padding:12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-muted);
      text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">${label}</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;
      color:${color || "var(--text)"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${value}</div>
  </div>`;
}

function _hubRow(title, sub, action, right) {
  return `
  <div onclick="${action}"
    style="display:flex;align-items:center;gap:10px;padding:11px 12px;
           border-bottom:1px solid var(--border);cursor:pointer">
    <div style="flex:1;min-width:0">
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
      ${sub ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;
        color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;
        text-overflow:ellipsis">${sub}</div>` : ""}
    </div>
    ${right || ""}
  </div>`;
}

function _hubCard(heading, bodyHTML, emptyText, linkPage) {
  const link = linkPage
    ? `<span onclick="event.stopPropagation();navigate('${linkPage}')"
        style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
        color:var(--accent);cursor:pointer;flex-shrink:0">view all →</span>`
    : "";
  return `
  <div class="card" style="padding:0;overflow:hidden;margin-bottom:14px">
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
        color:var(--text-muted);letter-spacing:.6px;text-transform:uppercase">${heading}</div>
      ${link}
    </div>
    ${bodyHTML || `<div style="padding:16px 14px;font-family:'JetBrains Mono',monospace;
      font-size:11px;color:var(--text-muted)">${emptyText}</div>`}
  </div>`;
}

// Compact tappable tile grid — jump to any page from the overview
function _hubTiles(tiles) {
  return `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
    ${tiles.map(t => `
    <div onclick="navigate('${t.page}')"
      style="display:flex;flex-direction:column;align-items:center;justify-content:center;
             gap:6px;padding:14px 6px;background:var(--bg-raised);
             border:1px solid var(--border);border-radius:8px;cursor:pointer">
      <span style="font-family:'JetBrains Mono',monospace;font-size:18px;
        color:var(--accent);line-height:1">${t.icon}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;
        font-weight:700;color:var(--text);text-align:center;line-height:1.2">${t.label}</span>
      ${t.badge !== undefined && t.badge !== null && t.badge !== ""
        ? `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;
             color:${t.badgeColor || "var(--text-muted)"};line-height:1">${t.badge}</span>`
        : ""}
    </div>`).join("")}
  </div>`;
}

// ── Section snapshots ─────────────────────────────────────────
// The Hub is the tile grid to everything else — Today (the money
// hero + queue) now owns the stats and alerts that used to live here.
function _workspaceSnapshot() {
  const d        = STATE.data || {};
  const projects = d.projects || [];
  const clients  = d.clients  || [];
  const invoices = d.invoices || [];
  const finances = d.finances || [];
  const stack    = d.tech_stack || [];
  const notes    = d.brainstorm || [];
  const today    = new Date().toISOString().slice(0, 10);
  const month    = today.slice(0, 7);

  const active   = projects.filter(p => p.status === "Active");
  const runs     = (d.workflow_runs || []).filter(r => r.status === "active");
  const income   = finances.filter(f => f.type === "income"  && f.date?.startsWith(month))
                           .reduce((a, f) => a + Number(f.amount), 0);
  const expense  = finances.filter(f => f.type === "expense" && f.date?.startsWith(month))
                           .reduce((a, f) => a + Number(f.amount), 0);
  const netPositive = (income - expense) >= 0;
  const overdue  = invoices.filter(i => i.status === "Overdue");
  const unpaid   = invoices.filter(i => ["Sent","Overdue"].includes(i.status));

  const running     = typeof runningEntry === "function" ? runningEntry() : null;
  const todayMin    = (d.time_entries || [])
    .filter(t => t.started_at?.slice(0, 10) === today)
    .reduce((a, t) => a + (typeof entryMinutes === "function" ? entryMinutes(t) : 0), 0);

  // ── Jump-to tiles ───────────────────────────────────────────
  const tiles = _hubTiles([
    { page: "clients",    icon: "◎", label: "Clients",   badge: `${clients.length}` },
    { page: "projects",   icon: "◫", label: "Projects",  badge: `${active.length} active` },
    { page: "invoices",   icon: "◻", label: "Invoices",
      badge: overdue.length ? `${overdue.length} overdue` : `${unpaid.length} unpaid`,
      badgeColor: overdue.length ? "var(--danger)" : "var(--text-muted)" },
    { page: "finances",   icon: "◇", label: "Finances",  badge: usd(income - expense),
      badgeColor: netPositive ? "var(--money-pos)" : "var(--danger)" },
    { page: "timer",      icon: "◷", label: "Time",
      badge: running ? "running" : (todayMin ? fmtDur(todayMin) + " today" : "idle"),
      badgeColor: running ? "var(--money-pos)" : "var(--text-muted)" },
    { page: "workflows",  icon: "◳", label: "Workflows", badge: `${runs.length} active` },
    { page: "brainstorm", icon: "◆", label: "Notes",     badge: `${notes.length}` },
    { page: "tech-stack", icon: "◳", label: "Stack",
      badge: usd(stack.filter(t => t.cycle === "monthly")
                      .reduce((a, t) => a + Number(t.amount || 0), 0)) + "/mo" },
    { page: "team",       icon: "◎", label: "Team",      badge: `${(d.team_members || []).length || 1}` },
  ]);

  // ── Quick add ─────────────────────────────────────────────────
  const quickAdd = `
  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Quick add</div>
  <div style="display:flex;flex-direction:column;gap:1px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:20px">
    ${[
      { icon: "◻", label: "Create invoice", action: "navigate('invoices');setTimeout(()=>openInvModal(null),100)" },
      { icon: "◇", label: "Log a payment",  action: "navigate('finances');setTimeout(()=>openFinModal(null),100)" },
      { icon: "◫", label: "New project",    action: "navigate('projects');setTimeout(()=>openProjectModal(null),100)" },
    ].map((q, i, arr) => `
    <div onclick="${q.action}" style="display:flex;align-items:center;gap:12px;padding:14px;cursor:pointer;${i < arr.length - 1 ? "border-bottom:1px solid var(--border)" : ""}">
      <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--accent);width:18px">${q.icon}</span>
      <span style="flex:1;font-size:14px;font-weight:600;color:var(--text)">${q.label}</span>
      <span style="color:var(--text-muted)">→</span>
    </div>`).join("")}
  </div>

  <div onclick="navigate('settings')" style="display:flex;align-items:center;gap:12px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:14px;cursor:pointer;margin-bottom:8px">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--text-muted);width:18px">◉</span>
    <span style="flex:1;font-size:14px;font-weight:600;color:var(--text)">Account &amp; settings</span>
    <span style="color:var(--text-muted)">→</span>
  </div>`;

  return tiles + quickAdd;
}

const HUB_SNAPSHOTS = {
  workspace: _workspaceSnapshot,
};

// ── Main hub renderer ─────────────────────────────────────────
window.mobileHubHTML = function(sectionId) {
  const cfg = HUB_CONFIG[sectionId];
  if (!cfg) return `<div class="empty"><div class="empty-text">Unknown section.</div></div>`;

  let snapshot = "";
  try { snapshot = (HUB_SNAPSHOTS[sectionId] || (() => ""))(); }
  catch (e) { console.warn("hub snapshot:", e.message); }

  return `
<div style="margin-bottom:16px">
  <div class="page-title">${cfg.title}</div>
  <div class="page-sub">${cfg.sub}</div>
</div>

<!-- Page links -->
${cfg.pages.length === 0 ? "" : `
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
  ${cfg.pages.map(pg => `
  <div onclick="navigate('${pg.id}')"
    style="display:flex;align-items:center;gap:12px;padding:14px;
           background:var(--bg-raised);border:1px solid var(--border);
           border-radius:6px;cursor:pointer">
    <span style="font-family:'JetBrains Mono',monospace;font-size:17px;
      color:var(--accent);width:24px;text-align:center;flex-shrink:0">${pg.icon}</span>
    <div style="flex:1;min-width:0">
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;
        font-weight:700;color:var(--text)">${pg.label}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;
        color:var(--text-muted);margin-top:2px">${pg.desc}</div>
    </div>
    <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
      color:var(--text-muted);flex-shrink:0">→</span>
  </div>`).join("")}
</div>`}

${snapshot}`;
};

// ============================================================
//  TODAY — mobile home. One number owns the screen; everything
//  else is a queue built from real invoices / tasks / the timer.
// ============================================================
function todayHTML() {
  const d        = STATE.data || {};
  const invoices = d.invoices || [];
  const projects = d.projects || [];
  const todos    = d.project_todos || [];
  const today    = new Date().toISOString().slice(0, 10);

  const unpaid  = invoices.filter(i => ["Sent", "Overdue"].includes(i.status));
  const overdue = invoices.filter(i => i.status === "Overdue")
    .sort((a, b) => (a.due_date || "") < (b.due_date || "") ? -1 : 1);
  const owed      = unpaid.reduce((a, i) => a + Number(i.amount), 0);
  const overdueAmt = overdue.reduce((a, i) => a + Number(i.amount), 0);

  const dueTasks = todos.filter(t => !t.completed && t.due_date && t.due_date <= today)
    .sort((a, b) => a.due_date < b.due_date ? -1 : 1);

  const needsYou = [
    ...overdue.slice(0, 3).map(i => ({ type: "invoice", inv: i })),
    ...dueTasks.slice(0, 3).map(t => ({ type: "task", t })),
  ].slice(0, 4);

  const running     = typeof runningEntry === "function" ? runningEntry() : null;
  const runningProj = running ? projects.find(p => p.id === running.project_id) : null;
  const active      = projects.filter(p => p.status === "Active");

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return `
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">${dateLabel}</div>

<div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">Owed to you</div>
<div style="font-family:'JetBrains Mono',monospace;font-size:42px;font-weight:700;line-height:1;letter-spacing:-0.03em;color:var(--text);margin-bottom:8px">${usd(owed)}</div>

${overdue.length ? `
<div style="display:flex;align-items:center;gap:8px;margin-bottom:18px">
  <span style="width:7px;height:7px;border-radius:9999px;background:var(--danger);animation:fhpulse 2s ease-in-out infinite;flex-shrink:0"></span>
  <span style="font-size:13px;color:var(--danger)">${usd(overdueAmt)} of it is overdue</span>
</div>
<div style="display:flex;gap:8px;margin-bottom:26px">
  <div class="btn btn-primary" style="flex:1;text-align:center;cursor:pointer"
    onclick="window._moneyTab='invoices';navigate('finances')">
    Chase ${overdue.length === 1 ? "it" : "all " + overdue.length} →
  </div>
  <div class="btn btn-ghost" style="flex-shrink:0;width:46px;padding:0;text-align:center;cursor:pointer" onclick="_sectionAdd('money')">+</div>
</div>` : `
<div style="margin-bottom:26px">
  <button class="btn btn-ghost" style="width:100%" onclick="_sectionAdd('money')">+ log income or send an invoice</button>
</div>`}

${needsYou.length ? `
<div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Needs you</div>
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px">
  ${needsYou.map(item => {
    if (item.type === "invoice") {
      const inv  = item.inv;
      const days = inv.due_date ? Math.max(0, Math.round((new Date(today) - new Date(inv.due_date)) / 86400000)) : null;
      return `
      <div onclick='openInvoice(${JSON.stringify(inv).replace(/'/g, "&#39;")})'
        style="display:flex;align-items:center;gap:12px;background:var(--bg-raised);border:1px solid var(--border-2);border-left:2px solid var(--danger);border-radius:var(--radius);padding:13px 14px;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:var(--text)">${inv.invoice_number}${inv.client_name ? " · " + inv.client_name : ""}</div>
          <div style="font-size:12px;color:var(--danger);margin-top:2px">${days != null ? days + " day" + (days !== 1 ? "s" : "") + " overdue" : "overdue"}</div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--text);flex-shrink:0">${usd(inv.amount)}</div>
      </div>`;
    }
    const t    = item.t;
    const proj = projects.find(p => p.id === t.project_id);
    const late = t.due_date < today;
    return `
    <div onclick="${proj ? `openProject(${JSON.stringify(proj).replace(/"/g, "&quot;")})` : `navigate('projects')`}"
      style="display:flex;align-items:center;gap:12px;background:var(--bg-raised);border:1px solid var(--border);border-left:2px solid var(--warning);border-radius:var(--radius);padding:13px 14px;cursor:pointer">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:var(--text)">${t.title}</div>
        <div style="font-size:12px;color:var(--warning);margin-top:2px">${late ? "overdue" : "due today"}</div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);flex-shrink:0">task</div>
    </div>`;
  }).join("")}
</div>` : ""}

<div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">${running ? "On the clock" : "Active work"}</div>
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
${running ? `
  <div onclick="navigate('timer')" style="display:flex;align-items:center;gap:12px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:13px 14px;cursor:pointer">
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:600;color:var(--text)">${runningProj?.name || "Untitled project"}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${[runningProj?.client_name, running.hourly_rate ? usd(running.hourly_rate) + "/hr" : null].filter(Boolean).join(" · ")}</div>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--money-pos);flex-shrink:0" data-timer-clock>${fmtDur(entryMinutes(running))}</div>
  </div>` : (active.length ? active.slice(0, 3).map(p => `
  <div onclick='openProject(${JSON.stringify(p).replace(/'/g, "&#39;")})' style="display:flex;align-items:center;gap:12px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:13px 14px;cursor:pointer">
    <div style="flex:1;min-width:0">
      <div style="font-size:14px;font-weight:600;color:var(--text)">${p.name}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${p.client_name || "No client"}</div>
    </div>
    <span style="color:var(--text-muted);flex-shrink:0">→</span>
  </div>`).join("") : `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">No active projects. <span style="color:var(--accent);cursor:pointer" onclick="navigate('hub-workspace')">Open the Hub →</span></div>`)}
</div>`;
}
window.todayHTML = todayHTML;

// ============================================================
//  MONEY — Invoices / Ledger / Taxes behind one pill switcher.
//  Real data only: sourced from STATE.data.invoices / finances.
// ============================================================
function _moneyPill(id, label) {
  const active = (window._moneyTab || "invoices") === id;
  return `<div onclick="window._moneyTab='${id}';render()"
    style="padding:7px 13px;border-radius:9999px;cursor:pointer;font-size:12px;
      font-weight:${active ? 700 : 600};
      background:${active ? "var(--accent)" : "transparent"};
      color:${active ? "var(--accent-fg)" : "var(--text-muted)"};
      border:1px solid ${active ? "transparent" : "var(--border)"}">${label}</div>`;
}

function moneyMobileHTML() {
  const tab = window._moneyTab || "invoices";
  return `
<div style="font-family:Fraunces,Georgia,serif;font-size:26px;margin-bottom:12px">Money</div>
<div style="display:flex;gap:6px;margin-bottom:18px">
  ${_moneyPill("invoices", "Invoices")}
  ${_moneyPill("ledger", "Ledger")}
  ${_moneyPill("taxes", "Taxes")}
</div>
${tab === "invoices" ? _moneyInvoicesHTML() : tab === "ledger" ? _moneyLedgerHTML() : _moneyTaxesHTML()}`;
}
window.moneyMobileHTML = moneyMobileHTML;

function _moneyInvoicesHTML() {
  const invoices = STATE.data.invoices || [];
  const finances = STATE.data.finances || [];
  const month    = new Date().toISOString().slice(0, 7);
  const today    = new Date().toISOString().slice(0, 10);

  const overdue = invoices.filter(i => i.status === "Overdue").reduce((a, i) => a + Number(i.amount), 0);
  const sent    = invoices.filter(i => i.status === "Sent").reduce((a, i) => a + Number(i.amount), 0);
  const paidMo  = finances.filter(f => f.type === "income" && f.date?.startsWith(month)).reduce((a, f) => a + Number(f.amount), 0);

  // Overdue first, then sent, then everything else by due date, paid/void last.
  const rank = { Overdue: 0, Sent: 1, Draft: 2, Paid: 3, Void: 4 };
  const sorted = invoices.slice().sort((a, b) => {
    const r = (rank[a.status] ?? 5) - (rank[b.status] ?? 5);
    if (r !== 0) return r;
    return (a.due_date || "") < (b.due_date || "") ? -1 : 1;
  });

  const pillColor = { Overdue: "var(--danger)", Sent: "var(--warning)", Paid: "var(--money-pos)", Draft: "var(--text-muted)", Void: "var(--text-muted)" };

  return `
<div style="display:flex;gap:8px;margin-bottom:16px">
  <div style="flex:1;border:1px solid var(--border-2);border-radius:10px;padding:10px 12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted)">Overdue</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--danger)">${usd(overdue)}</div>
  </div>
  <div style="flex:1;border:1px solid var(--border);border-radius:10px;padding:10px 12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted)">Sent</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--text)">${usd(sent)}</div>
  </div>
  <div style="flex:1;border:1px solid var(--border);border-radius:10px;padding:10px 12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted)">Paid mo</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--money-pos)">${usd(paidMo)}</div>
  </div>
</div>

${sorted.length === 0
  ? `<div class="empty"><div class="empty-text">No invoices yet.</div><button class="btn btn-primary" onclick="navigate('invoices');setTimeout(()=>openInvModal(null),100)">+ New Invoice</button></div>`
  : `<div style="display:flex;flex-direction:column;gap:1px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      ${sorted.map(inv => `
      <div onclick='openInvoice(${JSON.stringify(inv).replace(/'/g, "&#39;")})'
        style="display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid var(--border);cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:var(--text)">${inv.invoice_number}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
            ${inv.client_name || "No client"}${inv.status !== "Paid" && inv.status !== "Void" && inv.due_date ? " · due " + fmtDate(inv.due_date) : ""}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:${inv.status === "Paid" ? "var(--money-pos)" : "var(--text)"}">${usd(inv.amount)}</div>
          <div style="display:inline-block;margin-top:3px;padding:2px 7px;border-radius:5px;background:var(--bg-input);color:${pillColor[inv.status] || "var(--text-muted)"};font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase">${inv.status}</div>
        </div>
      </div>`).join("")}
    </div>`}
<div style="height:16px"></div>`;
}

function _moneyLedgerHTML() {
  const finances = STATE.data.finances || [];
  const now      = new Date();

  // Last 7 months, oldest first — real net per month from real entries.
  const months = [];
  for (let i = 6; i >= 0; i--) {
    const dt  = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = dt.toISOString().slice(0, 7);
    const inc = finances.filter(f => f.type === "income"  && f.date?.startsWith(key)).reduce((a, f) => a + Number(f.amount), 0);
    const exp = finances.filter(f => f.type === "expense" && f.date?.startsWith(key)).reduce((a, f) => a + Number(f.amount), 0);
    months.push({ key, label: dt.toLocaleDateString("en-US", { month: "short" }), net: inc - exp });
  }
  const curMonth = months[months.length - 1];
  const maxAbs   = Math.max(1, ...months.map(m => Math.abs(m.net)));
  const taxRate  = (STATE.data.user_settings?.tax_rate ?? 25) / 100;
  const monthEntries = finances.filter(f => f.date?.startsWith(curMonth.key));
  const monthTax = Math.max(0, monthEntries.filter(f => f.type === "income").reduce((a, f) => a + Number(f.amount), 0)
    - monthEntries.filter(f => f.type === "expense").reduce((a, f) => a + Number(f.amount), 0)) * taxRate;

  const recent = finances.slice()
    .sort((a, b) => (b.date || "") < (a.date || "") ? -1 : (b.date || "") > (a.date || "") ? 1 : 0)
    .slice(0, 6);

  return `
<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
  <div style="font-size:13px;color:var(--text-muted);margin-bottom:3px">Net · ${curMonth.label}</div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;letter-spacing:-0.02em;color:${curMonth.net >= 0 ? "var(--money-pos)" : "var(--danger)"}">${curMonth.net >= 0 ? "+" : ""}${usd(curMonth.net)}</div>
  <div style="display:flex;align-items:flex-end;gap:6px;height:56px;margin-top:16px">
    ${months.map((m, i) => `
    <div style="flex:1;height:${Math.max(6, Math.round(Math.abs(m.net) / maxAbs * 100))}%;
      background:${i === months.length - 1 ? (m.net >= 0 ? "var(--money-pos)" : "var(--danger)") : "var(--border-2)"};
      border-radius:3px" title="${m.label}: ${usd(m.net)}"></div>`).join("")}
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-muted)">
    <span>${months[0].label}</span><span>${curMonth.label}</span>
  </div>
</div>

<div style="display:flex;gap:8px;margin-bottom:18px">
  <div style="flex:1;border:1px solid var(--border);border-radius:12px;padding:12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Tax at ${Math.round(taxRate * 100)}%</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--warning)">${usd(monthTax)}</div>
  </div>
  <div style="flex:1;border:1px solid var(--border);border-radius:12px;padding:12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Entries this mo</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--text)">${monthEntries.length}</div>
  </div>
</div>

<div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Recent</div>
${recent.length === 0
  ? `<div class="empty"><div class="empty-text">No entries yet.</div><button class="btn btn-primary" onclick="navigate('finances');setTimeout(()=>openFinModal(null),100)">+ Add Entry</button></div>`
  : `<div style="display:flex;flex-direction:column;gap:1px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:16px">
      ${recent.map(f => `
      <div onclick="navigate('finances');setTimeout(()=>openFinModal('${f.id}'),100)"
        style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid var(--border);cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.description || f.category}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${fmtDate(f.date)}</div>
        </div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:${f.type === "income" ? "var(--money-pos)" : "var(--danger)"};flex-shrink:0">${f.type === "income" ? "+" : "−"}${usd(f.amount)}</span>
      </div>`).join("")}
    </div>`}
<div style="height:8px"></div>`;
}

function _moneyTaxesHTML() {
  const finances = STATE.data.finances || [];
  const period    = "this_month";
  const now       = new Date();
  const month     = now.toISOString().slice(0, 7);
  const periodEntries = finances.filter(f => f.date?.startsWith(month));
  const income  = periodEntries.filter(f => f.type === "income").reduce((a, f) => a + Number(f.amount), 0);
  const expense = periodEntries.filter(f => f.type === "expense").reduce((a, f) => a + Number(f.amount), 0);
  const taxRate = (STATE.data.user_settings?.tax_rate ?? 25) / 100;
  const tax     = Math.max(0, (income - expense) * taxRate);

  const catTotals = (typeof TAX_CATS !== "undefined" ? TAX_CATS : [])
    .map(cat => {
      const entries = periodEntries.filter(f => f.category === cat);
      const catIncome  = entries.filter(f => f.type === "income").reduce((a, f) => a + Number(f.amount), 0);
      const catExpense = entries.filter(f => f.type === "expense").reduce((a, f) => a + Number(f.amount), 0);
      return { cat, catIncome, catExpense };
    })
    .filter(c => c.catIncome > 0 || c.catExpense > 0);

  return `
<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
  <div style="font-size:13px;color:var(--text-muted);margin-bottom:3px">Estimated tax · this month</div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;letter-spacing:-0.02em;color:var(--warning)">${usd(tax)}</div>
  <div style="font-size:12px;color:var(--text-muted);margin-top:6px">${Math.round(taxRate * 100)}% of ${usd(Math.max(0, income - expense))} net profit</div>
</div>

<div style="display:flex;gap:8px;margin-bottom:18px">
  <div style="flex:1;border:1px solid var(--border);border-radius:12px;padding:12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Income</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--money-pos)">${usd(income)}</div>
  </div>
  <div style="flex:1;border:1px solid var(--border);border-radius:12px;padding:12px">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Expenses</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--danger)">${usd(expense)}</div>
  </div>
</div>

<div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">By category</div>
${catTotals.length === 0
  ? `<div class="empty"><div class="empty-text">No entries this month.</div></div>`
  : `<div style="display:flex;flex-direction:column;gap:8px">
      ${catTotals.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-raised);border:1px solid var(--border);border-radius:10px">
        <span style="font-size:13px;color:var(--text-muted)">${c.cat}</span>
        <div style="display:flex;gap:10px">
          ${c.catIncome > 0 ? `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--money-pos)">+${usd(c.catIncome)}</span>` : ""}
          ${c.catExpense > 0 ? `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--danger)">−${usd(c.catExpense)}</span>` : ""}
        </div>
      </div>`).join("")}
    </div>`}
<div style="height:8px"></div>`;
}

// ============================================================
//  INVOICE DETAIL — real line items + status, real send/PDF
//  actions wired to the existing emailInvoice/printInvoice flow.
// ============================================================
function invoiceDetailHTML(inv) {
  const items = (STATE.data.invoice_items || []).filter(it => it.invoice_id === inv.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = inv.status === "Overdue";
  const daysLate  = isOverdue && inv.due_date ? Math.max(0, Math.round((new Date(today) - new Date(inv.due_date)) / 86400000)) : null;

  const statusColor = { Overdue: "var(--danger)", Sent: "var(--warning)", Paid: "var(--money-pos)", Draft: "var(--text-muted)", Void: "var(--text-muted)" };

  return `
<div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px;cursor:pointer" onclick="closeInvoiceDetail()">← Money</div>

<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:18px">
  <div>
    <div style="font-family:Fraunces,Georgia,serif;font-size:26px">${inv.invoice_number}</div>
    <div style="font-size:13px;color:var(--text-muted);margin-top:2px">${inv.client_name || "No client"}</div>
  </div>
  <div style="padding:3px 8px;border-radius:6px;background:var(--bg-input);color:${statusColor[inv.status] || "var(--text-muted)"};font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;text-transform:uppercase;flex-shrink:0">
    ${daysLate != null ? `${daysLate}d overdue` : inv.status}
  </div>
</div>

<div style="font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:700;letter-spacing:-0.02em;margin-bottom:16px">${usd(inv.amount)}</div>

${items.length > 0 ? `
<div style="display:flex;flex-direction:column;gap:1px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:16px">
  ${items.map(it => `
  <div style="display:flex;gap:12px;padding:13px 14px;border-bottom:1px solid var(--border)">
    <span style="flex:1;font-size:13px;color:var(--text)">${it.description}${it.quantity && Number(it.quantity) !== 1 ? ` · ${it.quantity} ${it.unit_price ? "@ " + usd(it.unit_price) : ""}` : ""}</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text)">${usd(it.amount ?? (Number(it.quantity || 1) * Number(it.unit_price || 0)))}</span>
  </div>`).join("")}
</div>` : ""}

<div style="font-size:13px;color:var(--text-muted);line-height:1.6;margin-bottom:20px">
  ${[inv.due_date ? `Due ${fmtDate(inv.due_date)}` : null, inv.notes || null].filter(Boolean).join(" · ") || "No notes on this invoice."}
</div>

<div style="display:flex;gap:8px;margin-bottom:10px">
  ${inv.status !== "Paid" && inv.status !== "Void" ? `<div class="btn btn-ghost" style="flex:1;text-align:center;cursor:pointer" onclick="updateInvStatus('${inv.id}','Paid')">✓ Mark paid</div>` : ""}
  <div class="btn btn-ghost" style="flex:1;text-align:center;cursor:pointer" onclick="navigate('invoices');setTimeout(()=>openInvModal('${inv.id}'),100)">Edit</div>
</div>

<div style="background:var(--bg-raised);border:1px solid var(--border-2);border-radius:20px 20px 0 0;padding:18px 20px calc(20px + env(safe-area-inset-bottom, 0px))">
  <div style="width:38px;height:4px;border-radius:9999px;background:var(--border-2);margin:0 auto 16px"></div>
  <div style="font-family:Fraunces,Georgia,serif;font-size:20px;margin-bottom:4px">Send a nudge</div>
  <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${inv.client_name ? `Emails ${inv.client_name} with the PDF attached.` : "Emails the client with the PDF attached."}</div>
  <div style="display:flex;gap:8px">
    <div class="btn btn-primary" style="flex:1;text-align:center;cursor:pointer" onclick="emailInvoice('${inv.id}')">Send reminder</div>
    <div class="btn btn-ghost" style="flex-shrink:0;text-align:center;cursor:pointer" onclick="printInvoice('${inv.id}')">Download PDF</div>
  </div>
</div>`;
}
window.invoiceDetailHTML = invoiceDetailHTML;

// ============================================================
//  TIMER — full-screen view of the one running entry (if any).
//  No fake pause state: this app only tracks start/stop.
// ============================================================
function timerHTML() {
  const running = typeof runningEntry === "function" ? runningEntry() : null;

  if (!running) {
    return `
<div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--accent);margin-bottom:20px;cursor:pointer" onclick="navigate('hub-workspace')">← Hub</div>
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:60px 20px">
  <div style="font-family:'JetBrains Mono',monospace;font-size:28px;color:var(--text-muted)">◷</div>
  <div style="font-size:15px;font-weight:600;color:var(--text)">No timer running</div>
  <div style="font-size:13px;color:var(--text-muted);max-width:240px">Start one from a project file — pick which project you're working on first.</div>
  <button class="btn btn-primary" style="margin-top:10px" onclick="navigate('projects')">Go to Projects</button>
</div>`;
  }

  const proj  = (STATE.data.projects || []).find(p => p.id === running.project_id);
  const rate  = Number(running.hourly_rate) || 0;
  const today = new Date().toISOString().slice(0, 10);
  const earlier = (STATE.data.time_entries || [])
    .filter(t => t.ended_at && t.started_at?.slice(0, 10) === today)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, 5);

  return `
<div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--accent);margin-bottom:0;cursor:pointer" onclick="navigate('hub-workspace')">← Hub</div>

<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:36px 20px 24px;text-align:center">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="width:8px;height:8px;border-radius:9999px;background:var(--money-pos);animation:fhpulse 1.6s ease-in-out infinite"></span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--money-pos)">Recording</span>
  </div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:48px;font-weight:700;letter-spacing:-0.03em;line-height:1" data-timer-clock>${fmtDur(entryMinutes(running))}</div>
  <div style="font-size:15px;font-weight:600;margin-top:8px;cursor:pointer" onclick="${proj ? `openProject(${JSON.stringify(proj).replace(/"/g, "&quot;")})` : ""}">${running.description || proj?.name || "Untitled"}</div>
  <div style="font-size:13px;color:var(--text-muted)">${[proj?.client_name, rate ? usd(rate) + "/hr" : null].filter(Boolean).join(" · ")}</div>
  ${rate ? `<div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--money-pos);margin-top:4px">${usd(entryValue(running))} earned</div>` : ""}
  <button class="btn btn-primary" style="margin-top:20px;width:100%;max-width:280px" onclick="stopTimer()">Stop &amp; log</button>
</div>

${earlier.length ? `
<div style="padding:0 0 16px">
  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">Earlier today</div>
  <div style="display:flex;flex-direction:column;gap:1px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
    ${earlier.map(t => {
      const p = (STATE.data.projects || []).find(x => x.id === t.project_id);
      return `
    <div style="display:flex;gap:12px;padding:13px 14px;border-bottom:1px solid var(--border)">
      <span style="flex:1;font-size:13px;color:var(--text)">${t.description || p?.name || "Untitled"}${p?.client_name ? " · " + p.client_name : ""}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-muted)">${fmtDur(entryMinutes(t))}</span>
    </div>`;
    }).join("")}
  </div>
</div>` : ""}`;
}
window.timerHTML = timerHTML;

window.HUB_CONFIG = HUB_CONFIG;
