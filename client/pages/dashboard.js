// ============================================================
//  Freelancer — client/pages/dashboard.js
//  Dashboard with period filter + real-time tax estimate.
// ============================================================

const DASH_PERIODS = {
  this_month:   "This Month",
  this_quarter: "This Quarter",
  this_year:    "This Year",
  all:          "All Time",
};

function _dashFilterFinances(finances, period) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  let start, end;
  switch (period) {
    case "this_month":
      start = new Date(y, m, 1); end = new Date(y, m + 1, 0); break;
    case "this_quarter": {
      const q = Math.floor(m / 3);
      start = new Date(y, q * 3, 1); end = new Date(y, q * 3 + 3, 0); break;
    }
    case "this_year":
      start = new Date(y, 0, 1); end = new Date(y, 11, 31); break;
    default:
      return finances;
  }
  return finances.filter(f => { const d = new Date(f.date); return d >= start && d <= end; });
}

function dashboardHTML() {
  const { clients, projects, finances, invoices } = STATE.data;
  const period = window._dashPeriod || "this_month";
  const pf     = _dashFilterFinances(finances, period);

  const rev  = pf.filter(f => f.type === "income").reduce((s, f)  => s + Number(f.amount), 0);
  const exp  = pf.filter(f => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
  const unpd = invoices.filter(i => i.status !== "Paid" && i.status !== "Void").reduce((s, i) => s + Number(i.amount), 0);
  const taxPct = (STATE.data.user_settings?.tax_rate ?? 25) / 100;
  const tax  = Math.max(0, (rev - exp) * taxPct);
  const actv = projects.filter(p => p.status === "Active").length;
  const overdue = invoices.filter(i => i.status === "Overdue").length;

  const stats = [
    { label: "Revenue",         val: usd(rev),  icon: "◇", color: "var(--money-pos)", sub: DASH_PERIODS[period] },
    { label: "Expenses",        val: usd(exp),  icon: "◈", color: "#f59e0b", sub: DASH_PERIODS[period] },
    { label: "Outstanding",     val: usd(unpd), icon: "◻", color: "#f43f5e", sub: `${invoices.filter(i => i.status !== "Paid" && i.status !== "Void").length} unpaid` },
    { label: "Active Projects", val: actv,      icon: "◫", color: "#6366f1", sub: `${projects.length} total` },
  ];

  return `
<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
  <div>
    <div class="page-title">Dashboard</div>
    <div class="page-sub">Your business at a glance</div>
  </div>
  <div class="filter-row" style="margin-bottom:0">
    ${Object.entries(DASH_PERIODS).map(([k, label]) =>
      `<button class="filter-btn${period === k ? " active" : ""}" onclick="setDashPeriod('${k}')">${label}</button>`
    ).join("")}
  </div>
</div>

${overdue > 0 ? `
<div style="margin-bottom:20px;padding:10px 16px;background:color-mix(in srgb,var(--danger) 8%,transparent);border:1px solid color-mix(in srgb,var(--danger) 25%,transparent);border-radius:10px;font-size:13px;color:var(--danger);display:flex;align-items:center;gap:8px">
  ! <strong>${overdue} overdue invoice${overdue !== 1 ? "s" : ""}</strong> — follow up with clients before the balance grows.
  <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:#f43f5e;border-color:#f43f5e44;font-size:11px" onclick="navigate('invoices')">View →</button>
</div>` : ""}

<div class="grid-4" style="margin-bottom:24px">
  ${stats.map(s => `
  <div class="card">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${s.color};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;opacity:.7">◆</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:18px;margin-bottom:10px;color:var(--text-muted)">${s.icon}</div>
    <div class="card-label">${s.label}</div>
    <div class="card-value" style="color:${s.color}">${s.val}</div>
    <div class="card-sub">${s.sub}</div>
  </div>`).join("")}
</div>

<div class="grid-2" style="margin-bottom:24px">
  <div class="card">
    <div class="section-title" style="margin-bottom:14px">Recent Projects</div>
    ${projects.length === 0
      ? `<div style="color:var(--text-muted);font-size:13px">No projects yet. <span style="color:#6366f1;cursor:pointer" onclick="navigate('projects')">Add one →</span></div>`
      : `<table class="tbl">
          <thead><tr><th>Project</th><th>Client</th><th>Status</th></tr></thead>
          <tbody>${projects.slice(0, 5).map(p => `
          <tr onclick="window.openProject(${JSON.stringify(p).replace(/"/g,"&quot;")})" style="cursor:pointer">
            <td style="font-weight:600;color:var(--text)">${p.name}</td>
            <td style="color:var(--text-muted)">${p.client_name || "—"}</td>
            <td>${badge(p.status)}</td>
          </tr>`).join("")}</tbody>
        </table>`}
  </div>
  <div class="card">
    <div class="section-title" style="margin-bottom:16px">Tax Estimate</div>
    <div style="margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:3px">Net Profit (${DASH_PERIODS[period]})</div>
      <div style="font-size:22px;font-weight:700;color:${(rev - exp) >= 0 ? "var(--money-pos)" : "var(--danger)"};font-family:var(--font-sans)">${usd(rev - exp)}</div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:3px">Estimated Tax (${STATE.data.user_settings?.tax_rate ?? 25}%)</div>
      <div style="font-size:22px;font-weight:700;color:var(--warning);font-family:'JetBrains Mono',monospace">${usd(tax)}</div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${rev > 0 ? Math.min(100, (exp / rev) * 100) : 0}%"></div>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:5px">Expense ratio vs revenue</div>
    ${tax > 0 ? `
    <div style="margin-top:14px;padding:9px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);font-size:12px;color:var(--text-muted)">
      💡 Set aside <strong style="color:var(--warning)">${usd(tax)}</strong> for quarterly taxes.
    </div>` : ""}
  </div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="section-title" style="margin-bottom:14px">Recent Invoices</div>
    ${invoices.length === 0
      ? `<div style="color:var(--text-muted);font-size:13px">No invoices yet. <span style="color:#6366f1;cursor:pointer" onclick="navigate('invoices')">Create one →</span></div>`
      : `<table class="tbl">
          <thead><tr><th>#</th><th>Client</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${invoices.slice(0, 6).map(i => `
          <tr>
            <td style="color:var(--text-muted)">${i.invoice_number}</td>
            <td style="font-weight:600">${i.client_name || "—"}</td>
            <td style="font-weight:700;color:var(--text)">${usd(i.amount)}</td>
            <td>${badge(i.status)}</td>
          </tr>`).join("")}</tbody>
        </table>`}
  </div>
  <div class="card">
    <div class="section-title" style="margin-bottom:14px">Quick Actions</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${[
        { icon: "◎", label: "Add a Client",   page: "clients",      action: "openClientModal(null)" },
        { icon: "◫", label: "New Project",     page: "projects",     action: "openProjectModal(null)" },
        { icon: "◻", label: "Create Invoice",  page: "invoices",     action: "openInvModal(null)" },
        { icon: "◇", label: "Log a Payment",   page: "finances",     action: "openFinModal(null)" },
        { icon: "◈", label: "Edit Business Plan", page: "business-plan", action: null },
        { icon: "◆", label: "Add Bookmark",        page: "bookmarks",     action: "openBmModal(null)" },
        { icon: "◉", label: "Log Tech Charge",     page: "tech-stack",    action: "openStackModal(null)" },
      ].map(q => `
      <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;text-align:left"
        onclick="${q.action ? `navigate('${q.page}');setTimeout(()=>${q.action},100)` : `navigate('${q.page}')`}">
        <span style="font-family:'JetBrains Mono',monospace;font-size:13px;opacity:.7">${q.icon}</span>${q.label}
      </button>`).join("")}
    </div>
  </div>
</div>`;
}

window.setDashPeriod = function(p) { window._dashPeriod = p; render(); };
window.dashboardHTML = dashboardHTML;

window.openProjectById = function(id) {
  const p = STATE.data.projects.find(x => x.id === id);
  if (p) window.openProject(p);
};

// ============================================================
//  DESKTOP — Today
//  3-column: needs-you queue + active projects (center), money +
//  timer + recent activity (right rail). Every number here comes
//  from real clients/invoices/finances/time_entries/workflow data —
//  no invented metrics.
// ============================================================
function _todayUnbilled(p) {
  const entries = (STATE.data.time_entries || []).filter(t => t.project_id === p.id);
  const rate    = Number(p.hourly_rate) || Number(STATE.data.user_settings?.default_hourly_rate) || 0;
  const hours   = entries.reduce((s, t) => s + entryMinutes(t), 0) / 60;
  const logged  = hours * rate;
  const billed  = (STATE.data.invoices || [])
    .filter(i => i.project_id === p.id && i.status !== "Void")
    .reduce((s, i) => s + Number(i.amount), 0);
  return { hours, unbilled: Math.max(0, logged - billed) };
}

function _todayMonthlyNet(months) {
  const fin = STATE.data.finances || [];
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key   = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-US", { month: "short" }).charAt(0);
    const rows  = fin.filter(f => f.date?.startsWith(key));
    const net   = rows.filter(f => f.type === "income").reduce((s, f) => s + Number(f.amount), 0)
                - rows.filter(f => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
    out.push({ key, label, net });
  }
  return out;
}

function todayDesktopHTML() {
  const { clients, projects, finances, invoices } = STATE.data;
  const runningT = typeof runningEntry === "function" ? runningEntry() : null;

  const overdueInv = invoices.filter(i => i.status === "Overdue");
  const draftInv    = invoices.filter(i => i.status === "Draft");
  const waitingProj = projects.filter(p => p.status === "Review");
  const activeRuns  = (STATE.data.workflow_runs || []).filter(r => r.status === "active");
  const currentRun  = activeRuns[0] || null;
  const runSteps    = currentRun
    ? (STATE.data.workflow_run_steps || []).filter(s => s.run_id === currentRun.id).sort((a,b)=>a.sort_order-b.sort_order)
    : [];
  const runDone     = runSteps.filter(s => s.completed).length;
  const nextStep    = runSteps.find(s => !s.completed);

  const activeProjects = projects.filter(p => p.status === "Active" || p.status === "Review");

  // ── Right rail money ──────────────────────────────────────────
  const owed = invoices.filter(i => ["Sent","Overdue"].includes(i.status))
    .reduce((s, i) => s + Number(i.amount), 0);
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const monthRows = finances.filter(f => f.date?.startsWith(monthKey));
  const mIn  = monthRows.filter(f => f.type === "income").reduce((s,f)=>s+Number(f.amount),0);
  const mOut = monthRows.filter(f => f.type === "expense").reduce((s,f)=>s+Number(f.amount),0);
  const taxPct = (STATE.data.user_settings?.tax_rate ?? 25) / 100;
  const mTax = Math.max(0, (mIn - mOut) * taxPct);
  const months = _todayMonthlyNet(7);
  const maxAbsNet = Math.max(1, ...months.map(m => Math.abs(m.net)));
  const recentTx = [...finances].sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0, 6);

  const needsYou = [
    { label: "Overdue invoices", val: overdueInv.length, sub: overdueInv.length ? usd(overdueInv.reduce((s,i)=>s+Number(i.amount),0)) + " outstanding" : "all clear", color: overdueInv.length ? "var(--danger)" : "var(--money-pos)", action: "navigate('finances')" },
    { label: "Drafts to send", val: draftInv.length, sub: draftInv.length ? "waiting in Money" : "all sent", color: draftInv.length ? "var(--warning)" : "var(--money-pos)", action: "navigate('finances')" },
    { label: "Awaiting feedback", val: waitingProj.length, sub: waitingProj.length ? waitingProj.map(p=>p.name).slice(0,2).join(", ") : "nothing waiting", color: waitingProj.length ? "var(--warning)" : "var(--money-pos)", action: "navigate('projects')" },
    { label: "Workflow step", val: nextStep ? "1" : "0", sub: nextStep ? nextStep.title : (currentRun ? "run complete" : "no active runs"), color: nextStep ? "var(--accent)" : "var(--text-muted)", action: "navigate('workflows')" },
  ];

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Today</div>
    <div class="page-sub">${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
  </div>
</div>

${overdueInv.length > 0 ? `
<div class="overdue-banner">
  ! <strong>${overdueInv.length} overdue invoice${overdueInv.length!==1?"s":""}</strong> — ${usd(overdueInv.reduce((s,i)=>s+Number(i.amount),0))} outstanding.
  <button class="btn btn-ghost btn-sm" style="margin-left:auto;color:var(--danger);border-color:color-mix(in srgb,var(--danger) 40%,transparent);font-size:11px" onclick="navigate('finances')">View →</button>
</div>` : ""}

<div class="desk-shell">
  <div class="desk-col-main">
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Needs you</div>
    <div class="grid-2" style="margin-bottom:26px">
      ${needsYou.map(n => `
      <div class="card" style="cursor:pointer" onclick="${n.action}">
        <div class="card-label">${n.label}</div>
        <div class="card-value" style="color:${n.color}">${n.val}</div>
        <div class="card-sub">${n.sub}</div>
      </div>`).join("")}
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px">
      <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)">Active projects</div>
      <span onclick="navigate('projects')" style="font-family:var(--font-mono);font-size:10.5px;font-weight:700;color:var(--accent);cursor:pointer">view all →</span>
    </div>
    ${activeProjects.length === 0
      ? `<div class="empty" style="padding:28px"><div class="empty-text">no active projects.</div></div>`
      : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:26px">
      ${activeProjects.slice(0,6).map(p => {
        const { hours, unbilled } = _todayUnbilled(p);
        const budget = Number(p.budget_hours) || 0;
        const pct = budget > 0 ? Math.min(100, Math.round((hours / budget) * 100)) : null;
        const isRunningHere = runningT && runningT.project_id === p.id;
        return `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer" onclick='openProject(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px">
          <div style="font-size:13.5px;font-weight:700;color:var(--text)">${p.name}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);flex-shrink:0">${p.client_name || "—"}</div>
        </div>
        ${pct !== null ? `<div class="desk-progress" style="margin-bottom:7px"><span style="width:${pct}%"></span></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">
          <span>${budget > 0 ? `${hours.toFixed(1)}/${budget} hr` : `${hours.toFixed(1)} hr logged`}</span>
          <span style="display:flex;align-items:center;gap:8px">
            ${unbilled > 0 ? `<span style="color:var(--warning)">${usd(unbilled)} unbilled</span>` : ""}
            ${isRunningHere ? `<span style="color:var(--money-pos)">◆ timer running</span>` : ""}
          </span>
        </div>
      </div>`;
      }).join("")}
      </div>`}

    ${currentRun ? `
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Current workflow run</div>
    <div class="card" style="cursor:pointer" onclick="navigate('workflows')">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <div style="font-family:var(--font-serif);font-size:17px">${currentRun.name}</div>
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${runDone}/${runSteps.length} steps</span>
      </div>
      <div class="desk-progress" style="margin-bottom:8px"><span style="width:${runSteps.length?Math.round(runDone/runSteps.length*100):0}%"></span></div>
      ${nextStep ? `<div style="font-size:12.5px;color:var(--text-muted)">next: ${nextStep.title}</div>` : `<div style="font-size:12.5px;color:var(--money-pos)">all steps complete</div>`}
    </div>` : ""}
  </div>

  <div class="desk-rail">
    <div class="card" style="margin-bottom:14px">
      <div class="card-label">Owed to you</div>
      <div class="card-value" style="color:var(--warning);font-size:26px">${usd(owed)}</div>
      <div class="card-sub">${overdueInv.length + invoices.filter(i=>i.status==="Sent").length} open invoice${(overdueInv.length + invoices.filter(i=>i.status==="Sent").length)!==1?"s":""}</div>
    </div>

    <div class="desk-chip-row" style="margin-bottom:14px">
      <div class="desk-chip"><div class="desk-chip-label">In</div><div class="desk-chip-val" style="color:var(--money-pos)">${usd(mIn)}</div></div>
      <div class="desk-chip"><div class="desk-chip-label">Out</div><div class="desk-chip-val" style="color:var(--danger)">${usd(mOut)}</div></div>
    </div>
    <div class="desk-chip-row" style="margin-bottom:20px">
      <div class="desk-chip"><div class="desk-chip-label">Net</div><div class="desk-chip-val" style="color:${(mIn-mOut)>=0?'var(--money-pos)':'var(--danger)'}">${usd(mIn-mOut)}</div></div>
      <div class="desk-chip"><div class="desk-chip-label">Tax set-aside</div><div class="desk-chip-val" style="color:var(--warning)">${usd(mTax)}</div></div>
    </div>

    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Timer</div>
    ${runningT ? (() => {
      const proj = projects.find(p => p.id === runningT.project_id);
      const isPaused = !!runningT.paused_at;
      return `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="width:7px;height:7px;border-radius:999px;background:${isPaused?'var(--warning)':'var(--money-pos)'};${isPaused?'':'animation:fhpulse 1.8s ease-in-out infinite'}"></span>
        <span style="font-family:var(--font-mono);font-size:11px;color:${isPaused?'var(--warning)':'var(--money-pos)'}">${isPaused?'paused':'running'} · ${proj?.name || "—"}</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:22px;font-weight:700;margin-bottom:12px" data-timer-clock>${fmtDur(entryMinutes(runningT))}</div>
      <div style="display:flex;gap:8px">
        ${isPaused
          ? `<button class="btn btn-primary" style="flex:1" onclick="resumeTimer('${runningT.id}')">Resume</button>`
          : `<button class="btn btn-ghost" style="flex:1" onclick="pauseTimer('${runningT.id}')">Pause</button>`}
        <button class="btn btn-danger" style="flex:1" onclick="stopTimer()">Stop</button>
      </div>
    </div>`;
    })() : `
    <div class="card" style="margin-bottom:20px;cursor:pointer" onclick="navigate('projects')">
      <div class="card-sub" style="margin-bottom:10px">No timer running.</div>
      <button class="btn btn-ghost" style="width:100%" onclick="event.stopPropagation();navigate('projects')">Start from a project →</button>
    </div>`}

    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Cash · ${months.length} months</div>
    <div class="card" style="margin-bottom:20px">
      <div class="desk-bars">
        ${months.map(m => {
          const h = Math.max(3, Math.round((Math.abs(m.net) / maxAbsNet) * 60));
          return `<div class="desk-bar-col"><div class="desk-bar${m.net>=0?' accent':''}" style="height:${h}px;${m.net<0?'background:var(--danger)':''}"></div><span class="desk-bar-tick">${m.label}</span></div>`;
        }).join("")}
      </div>
    </div>

    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Recent transactions</div>
    <div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      ${recentTx.length === 0
        ? `<div style="padding:16px;font-size:12px;color:var(--text-muted)">nothing logged yet.</div>`
        : recentTx.map(f => `
      <div style="display:flex;gap:10px;padding:11px 13px;border-bottom:1px solid var(--border)">
        <span style="flex:1;min-width:0;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.description || f.category || "—"}</span>
        <span style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:${f.type==='income'?'var(--money-pos)':'var(--danger)'};flex-shrink:0">${f.type==='income'?'+':'-'}${usd(f.amount)}</span>
      </div>`).join("")}
    </div>
  </div>
</div>`;
}

window.todayDesktopHTML = todayDesktopHTML;