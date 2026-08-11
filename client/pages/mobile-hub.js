// ============================================================
//  Freelancer — client/pages/mobile-hub.js
//  Mobile section landing pages ("hubs").
//  Each bottom-tab opens a hub listing its pages plus a live
//  snapshot of the most relevant data for that section.
// ============================================================

const HUB_CONFIG = {
  // Reached from the logo / dashboard route — the mobile overview
  workspace: {
    title: "Overview",
    sub:   "Your business at a glance",
    pages: [],
  },
  money: {
    title: "Money",
    sub:   "Income, expenses and invoicing",
    pages: [
      { id: "finances", label: "Finances", icon: "◇", desc: "Income, expenses and tax" },
      { id: "invoices", label: "Invoices", icon: "◻", desc: "Create, send and track invoices" },
    ],
  },
  tools: {
    title: "Tools",
    sub:   "Everything else",
    pages: [
      { id: "bookmarks",  label: "Bookmarks",  icon: "◉", desc: "Saved links and credentials" },
      { id: "tech-stack", label: "Tech Stack", icon: "◳", desc: "Recurring subscriptions" },
      { id: "brainstorm", label: "Brainstorm", icon: "◆", desc: "Notes and guided sessions" },
      { id: "workflows",  label: "Workflows",  icon: "◳", desc: "SOP templates and live runs" },
      { id: "team",       label: "Team",       icon: "◎", desc: "Members and invites" },
    ],
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
  const openTodo = (d.project_todos || []).filter(t => !t.completed);
  const runs     = (d.workflow_runs || []).filter(r => r.status === "active");
  const income   = finances.filter(f => f.type === "income"  && f.date?.startsWith(month))
                           .reduce((a, f) => a + Number(f.amount), 0);
  const expense  = finances.filter(f => f.type === "expense" && f.date?.startsWith(month))
                           .reduce((a, f) => a + Number(f.amount), 0);
  const overdue  = invoices.filter(i => i.status === "Overdue");
  const unpaid   = invoices.filter(i => ["Sent","Overdue"].includes(i.status));
  const overdueTasks = openTodo.filter(t => t.due_date && t.due_date < today);

  // ── Alerts ──────────────────────────────────────────────────
  let alerts = "";
  if (overdue.length) {
    alerts += `
    <div onclick="navigate('invoices')"
      style="padding:11px 13px;margin-bottom:8px;border-radius:6px;cursor:pointer;
        background:color-mix(in srgb,var(--danger) 10%,transparent);
        border:1px solid color-mix(in srgb,var(--danger) 30%,transparent);
        font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--danger)">
      ${overdue.length} overdue invoice${overdue.length !== 1 ? "s" : ""} ·
      ${usd(overdue.reduce((a, i) => a + Number(i.amount), 0))} outstanding →
    </div>`;
  }
  if (overdueTasks.length) {
    alerts += `
    <div onclick="navigate('projects')"
      style="padding:11px 13px;margin-bottom:8px;border-radius:6px;cursor:pointer;
        background:color-mix(in srgb,var(--warning) 10%,transparent);
        border:1px solid color-mix(in srgb,var(--warning) 30%,transparent);
        font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--warning)">
      ${overdueTasks.length} task${overdueTasks.length !== 1 ? "s" : ""} past due →
    </div>`;
  }
  if (alerts) alerts = `<div style="margin-bottom:14px">${alerts}</div>`;

  // ── Money stats ─────────────────────────────────────────────
  const money = `
  <div style="display:flex;gap:8px;margin-bottom:10px">
    ${_hubStat("Income (mo)", usd(income), "var(--accent)")}
    ${_hubStat("Expenses (mo)", usd(expense), "var(--danger)")}
    ${_hubStat("Net (mo)", usd(income - expense))}
  </div>`;

  // ── Jump-to tiles ───────────────────────────────────────────
  const tiles = _hubTiles([
    { page: "clients",    icon: "◎", label: "Clients",   badge: `${clients.length}` },
    { page: "projects",   icon: "◫", label: "Projects",  badge: `${active.length} active` },
    { page: "invoices",   icon: "◻", label: "Invoices",
      badge: overdue.length ? `${overdue.length} overdue` : `${unpaid.length} unpaid`,
      badgeColor: overdue.length ? "var(--danger)" : "var(--text-muted)" },
    { page: "finances",   icon: "◇", label: "Finances",  badge: usd(income - expense) },
    { page: "bookmarks",  icon: "◉", label: "Bookmarks", badge: `${(d.bookmarks || []).length}` },
    { page: "tech-stack", icon: "◳", label: "Stack",
      badge: usd(stack.filter(t => t.cycle === "monthly")
                      .reduce((a, t) => a + Number(t.amount || 0), 0)) + "/mo" },
    { page: "workflows",  icon: "◳", label: "Workflows", badge: `${runs.length} active` },
    { page: "brainstorm", icon: "◆", label: "Notes",     badge: `${notes.length}` },
    { page: "team",       icon: "◎", label: "Team",      badge: `${(d.team_members || []).length || 1}` },
  ]);

  // ── Rows ────────────────────────────────────────────────────
  const todoRows = openTodo.slice()
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    })
    .slice(0, 5)
    .map(t => {
      const proj = projects.find(p => p.id === t.project_id);
      const late = t.due_date && t.due_date < today;
      return _hubRow(t.title, proj?.name || "",
        proj ? `openProject(${JSON.stringify(proj).replace(/'/g, "&#39;")})` : `navigate('projects')`,
        t.due_date
          ? `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;flex-shrink:0;
               color:${late ? "var(--danger)" : "var(--text-muted)"}">${fmtDate(t.due_date)}</span>`
          : "");
    }).join("");

  const projRows = active.slice(0, 4).map(p =>
    _hubRow(p.name, p.client_name || "",
      `openProject(${JSON.stringify(p).replace(/'/g, "&#39;")})`,
      p.deadline
        ? `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;
             color:var(--text-muted);flex-shrink:0">${fmtDate(p.deadline)}</span>`
        : "")
  ).join("");

  const statusColor = s =>
    s === "Overdue" ? "var(--danger)" :
    s === "Sent"    ? "var(--accent)" : "var(--text-muted)";

  const invRows = invoices
    .filter(i => ["Draft","Sent","Overdue"].includes(i.status))
    .slice(0, 4)
    .map(i => _hubRow(`${i.invoice_number} · ${usd(i.amount)}`, i.client_name || "",
      `navigate('invoices')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;
        flex-shrink:0;color:${statusColor(i.status)}">${i.status.toUpperCase()}</span>`))
    .join("");

  const clientRows = clients.slice(0, 4).map(c => {
    const count = projects.filter(p => p.client_id === c.id).length;
    return _hubRow(c.name, c.company || "", `openClientFile('${c.id}')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;
        color:var(--text-muted);flex-shrink:0">${count} proj</span>`);
  }).join("");

  const finRows = finances.slice(0, 4).map(f =>
    _hubRow(f.description || f.category || "Entry", fmtDate(f.date), `navigate('finances')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;
        flex-shrink:0;color:${f.type === "income" ? "var(--accent)" : "var(--danger)"}">
        ${f.type === "income" ? "+" : "-"}${usd(f.amount)}</span>`)
  ).join("");

  const runRows = runs.slice(0, 3).map(r =>
    _hubRow(r.name, r.client_name || "", `navigate('workflows')`, "")
  ).join("");

  const renewalRows = stack
    .filter(t => t.renewal_date && t.cycle !== "one-time")
    .sort((a, b) => a.renewal_date < b.renewal_date ? -1 : 1)
    .slice(0, 3)
    .map(t => _hubRow(t.name, `${t.cycle} · renews ${fmtDate(t.renewal_date)}`,
      `navigate('tech-stack')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;
        color:var(--text);flex-shrink:0">${usd(t.amount)}</span>`))
    .join("");

  return alerts + money + tiles
    + _hubCard("Upcoming tasks",      todoRows,    "No open tasks. Add one inside a project.", "projects")
    + _hubCard("Active projects",     projRows,    "No active projects yet.",                  "projects")
    + _hubCard("Open invoices",       invRows,     "No open invoices.",                        "invoices")
    + _hubCard("Recent entries",      finRows,     "No finance entries yet.",                  "finances")
    + _hubCard("Clients",             clientRows,  "No clients yet.",                          "clients")
    + _hubCard("Active workflow runs", runRows,    "No active runs.",                          "workflows")
    + _hubCard("Upcoming renewals",   renewalRows, "No recurring subscriptions tracked.",      "tech-stack");
}

function _moneySnapshot() {
  const d        = STATE.data || {};
  const finances = d.finances || [];
  const invoices = d.invoices || [];
  const month    = new Date().toISOString().slice(0, 7);

  const income  = finances.filter(f => f.type === "income"  && f.date?.startsWith(month))
                          .reduce((a, f) => a + Number(f.amount), 0);
  const expense = finances.filter(f => f.type === "expense" && f.date?.startsWith(month))
                          .reduce((a, f) => a + Number(f.amount), 0);
  const open    = invoices.filter(i => ["Draft", "Sent", "Overdue"].includes(i.status));
  const overdue = invoices.filter(i => i.status === "Overdue");

  const stats = `
  <div style="display:flex;gap:8px;margin-bottom:14px">
    ${_hubStat("Income (mo)",  usd(income),  "var(--accent)")}
    ${_hubStat("Expenses (mo)", usd(expense), "var(--danger)")}
    ${_hubStat("Net (mo)", usd(income - expense))}
  </div>`;

  const statusColor = s =>
    s === "Overdue" ? "var(--danger)" :
    s === "Sent"    ? "var(--accent)" : "var(--text-muted)";

  const invRows = open.slice(0, 5).map(i =>
    _hubRow(
      `${i.invoice_number} · ${usd(i.amount)}`,
      i.client_name || "",
      `navigate('invoices')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;
        flex-shrink:0;color:${statusColor(i.status)}">${i.status.toUpperCase()}</span>`
    )
  ).join("");

  const recentRows = finances.slice(0, 4).map(f =>
    _hubRow(f.description || f.category || "Entry", fmtDate(f.date), `navigate('finances')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;
        flex-shrink:0;color:${f.type === "income" ? "var(--accent)" : "var(--danger)"}">
        ${f.type === "income" ? "+" : "-"}${usd(f.amount)}</span>`)
  ).join("");

  const alert = overdue.length ? `
  <div onclick="navigate('invoices')"
    style="padding:11px 13px;margin-bottom:14px;border-radius:6px;cursor:pointer;
      background:color-mix(in srgb,var(--danger) 10%,transparent);
      border:1px solid color-mix(in srgb,var(--danger) 30%,transparent);
      font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--danger)">
    ${overdue.length} overdue invoice${overdue.length !== 1 ? "s" : ""} ·
    ${usd(overdue.reduce((a, i) => a + Number(i.amount), 0))} outstanding →
  </div>` : "";

  return alert + stats
    + _hubCard("Open invoices", invRows, "No open invoices. Everything is settled.", "invoices")
    + _hubCard("Recent entries", recentRows, "No finance entries yet.", "finances");
}

function _toolsSnapshot() {
  const d       = STATE.data || {};
  const stack   = d.tech_stack || [];
  const marks   = d.bookmarks  || [];
  const notes   = d.brainstorm || [];
  const runs    = (d.workflow_runs || []).filter(r => r.status === "active");
  const members = d.team_members || [];
  const monthly = stack.filter(t => t.cycle === "monthly")
                       .reduce((a, t) => a + Number(t.amount || 0), 0);

  const stats = `
  <div style="display:flex;gap:8px;margin-bottom:14px">
    ${_hubStat("Monthly burn", usd(monthly), "var(--danger)")}
    ${_hubStat("Active runs", runs.length, "var(--accent)")}
    ${_hubStat("Bookmarks", marks.length)}
  </div>`;

  const linkRows = marks.filter(b => b.url).slice(0, 5).map(b =>
    _hubRow(b.name, b.url.replace(/^https?:\/\//, "").split("/")[0],
      `window.open('${b.url}','_blank')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;
        color:var(--text-muted);flex-shrink:0">↗</span>`)
  ).join("");

  const renewals = stack
    .filter(t => t.renewal_date && t.cycle !== "one-time")
    .sort((a, b) => a.renewal_date < b.renewal_date ? -1 : 1)
    .slice(0, 4)
    .map(t => _hubRow(t.name, `${t.cycle} · renews ${fmtDate(t.renewal_date)}`,
      `navigate('tech-stack')`,
      `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;
        color:var(--text);flex-shrink:0">${usd(t.amount)}</span>`))
    .join("");

  const runRows = runs.slice(0, 4).map(r =>
    _hubRow(r.name, r.client_name || "", `navigate('workflows')`, "")
  ).join("");

  return stats
    + _hubCard("Quick links", linkRows, "No bookmarks with links yet.", "bookmarks")
    + _hubCard("Active workflow runs", runRows, "No active runs. Start one from a template.", "workflows")
    + _hubCard("Upcoming renewals", renewals, "No recurring subscriptions tracked.", "tech-stack");
}

const HUB_SNAPSHOTS = {
  workspace: _workspaceSnapshot,
  money:     _moneySnapshot,
  tools:     _toolsSnapshot,
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

window.HUB_CONFIG = HUB_CONFIG;
