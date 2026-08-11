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

  return alerts + money + tiles
    + _hubCard("Upcoming tasks",  todoRows, "No open tasks. Add one inside a project.", "projects")
    + _hubCard("Active projects", projRows, "No active projects yet.",                  "projects");
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

window.HUB_CONFIG = HUB_CONFIG;
