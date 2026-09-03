// ============================================================
//  Freelancer — client/pages/finances.js
//  Income, expenses, tax tracking — with period filter,
//  project/client links, and Cancelled status support.
// ============================================================

// ── Period helpers ────────────────────────────────────────────
function _periodDates(period) {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  switch (period) {
    case "this_month":
      return [new Date(y, m, 1), new Date(y, m + 1, 0)];
    case "last_month":
      return [new Date(y, m - 1, 1), new Date(y, m, 0)];
    case "this_quarter": {
      const q = Math.floor(m / 3);
      return [new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0)];
    }
    case "this_year":
      return [new Date(y, 0, 1), new Date(y, 11, 31)];
    default: // "all"
      return [null, null];
  }
}

function _filterByPeriod(entries, period) {
  const [start, end] = _periodDates(period);
  if (!start) return entries;
  return entries.filter(e => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

const PERIOD_LABELS = {
  all: "All Time",
  this_month: "This Month",
  last_month: "Last Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
};

// ── Render ────────────────────────────────────────────────────
function financesHTML() {
  const { finances, projects, clients } = STATE.data;
  const typeFilter   = window._finFilter  || "All";
  const period       = window._finPeriod  || "this_month";
  const projFilter   = window._finProject || "";

  const periodEntries = _filterByPeriod(finances, period);

  let displayed = typeFilter === "All"
    ? periodEntries
    : periodEntries.filter(f => f.type === typeFilter);
  if (projFilter) displayed = displayed.filter(f => f.project_id === projFilter);

  const income   = periodEntries.filter(f => f.type === "income").reduce((s, f)  => s + Number(f.amount), 0);
  const expenses = periodEntries.filter(f => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
  const taxRate  = (STATE.data.user_settings?.tax_rate ?? 25) / 100;
  const tax      = Math.max(0, (income - expenses) * taxRate);

  const catTotals = TAX_CATS
    .map(cat => {
      const entries  = periodEntries.filter(f => f.category === cat);
      const catIncome  = entries.filter(f => f.type === "income").reduce((s, f)  => s + Number(f.amount), 0);
      const catExpense = entries.filter(f => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
      return { cat, income: catIncome, expense: catExpense, net: catIncome - catExpense };
    })
    .filter(c => c.income > 0 || c.expense > 0);

  // Per-project income summary
  const byProject = {};
  periodEntries.filter(f => f.type === "income" && f.project_id).forEach(f => {
    const p = projects.find(p => p.id === f.project_id);
    const name = p?.name || f.project_id;
    byProject[f.project_id] = { name, total: (byProject[f.project_id]?.total || 0) + Number(f.amount) };
  });

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Finances</div>
    <div class="page-sub">Income, expenses &amp; tax tracking</div>
  </div>
  <button class="btn btn-primary" onclick="openFinModal(null)">+ Add Entry</button>
</div>

<!-- Invoices shortcut — mobile only (desktop has the sidebar) -->
${(() => {
  const invs    = STATE.data.invoices || [];
  const open    = invs.filter(i => ["Draft","Sent","Overdue"].includes(i.status));
  const overdue = invs.filter(i => i.status === "Overdue");
  const total   = open.reduce((a, i) => a + Number(i.amount), 0);
  const alertOn = overdue.length > 0;
  return `
  <div class="mobile-only" onclick="navigate('invoices')"
    style="display:flex;align-items:center;gap:14px;padding:16px;margin-bottom:16px;
      cursor:pointer;border-radius:var(--radius);
      background:${alertOn
        ? "color-mix(in srgb,var(--danger) 9%,transparent)"
        : "var(--bg-raised)"};
      border:1px solid ${alertOn
        ? "color-mix(in srgb,var(--danger) 30%,transparent)"
        : "var(--border)"}">
    <span style="font-family:'JetBrains Mono',monospace;font-size:20px;flex-shrink:0;
      color:${alertOn ? "var(--danger)" : "var(--accent)"}">◻</span>
    <div style="flex:1;min-width:0">
      <div style="font-weight:600;font-size:14px;color:var(--text)">Invoices</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;
        color:${alertOn ? "var(--danger)" : "var(--text-muted)"};margin-top:2px">
        ${open.length === 0
          ? "All settled — nothing outstanding"
          : `${open.length} open · ${usd(total)}${overdue.length ? ` · ${overdue.length} overdue` : ""}`}
      </div>
    </div>
    <span style="font-family:'JetBrains Mono',monospace;font-size:15px;
      color:var(--text-muted);flex-shrink:0">→</span>
  </div>`;
})()}

<!-- Period picker -->
<div class="filter-row" style="margin-bottom:16px">
  ${Object.entries(PERIOD_LABELS).map(([k, label]) =>
    `<button class="filter-btn${period === k ? " active" : ""}" onclick="setFinPeriod('${k}')">${label}</button>`
  ).join("")}
</div>

<div class="fin-summary">
  ${[
    { label: "Total Income",   val: income,   color: "var(--money-pos)", icon: "📈" },
    { label: "Total Expenses", val: expenses, color: "var(--danger)", icon: "📉" },
    { label: "Net Profit",     val: income - expenses,
      color: (income - expenses) >= 0 ? "var(--money-pos)" : "var(--danger)", icon: "◫" },
  ].map(s => `
  <div class="card">
    <div style="font-size:22px;margin-bottom:8px">${s.icon}</div>
    <div class="card-label">${s.label}</div>
    <div class="card-value" style="color:${s.color}">${usd(s.val)}</div>
    <div class="card-sub">${PERIOD_LABELS[period]}</div>
  </div>`).join("")}

  <!-- Tax estimate joins the summary grid on mobile -->
  <div class="card mobile-only-card">
    <div style="font-size:22px;margin-bottom:8px">◇</div>
    <div class="card-label">Est. Tax (${STATE.data.user_settings?.tax_rate ?? 25}%)</div>
    <div class="card-value" style="color:var(--warning)">${usd(tax)}</div>
    <div class="card-sub">Set aside</div>
  </div>
</div>

<div class="grid-2" style="margin-bottom:24px">
  ${catTotals.length > 0 ? `
  <div class="card">
    <div class="section-title" style="margin-bottom:14px">By Tax Category</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${catTotals.map(({ cat, income, expense, net }) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
        <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">${cat}</span>
        <div style="display:flex;gap:12px;align-items:center">
          ${income > 0  ? `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--money-pos)">+${usd(income)}</span>`  : ""}
          ${expense > 0 ? `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--danger)">-${usd(expense)}</span>` : ""}
        </div>
      </div>`).join("")}
    </div>
  </div>` : `<div class="card"><div class="empty-text" style="color:#2a3048;text-align:center;padding:20px">No entries this period.</div></div>`}

  <div class="card fin-tax-card">
    <div class="section-title" style="margin-bottom:14px">Tax Estimate (${STATE.data.user_settings?.tax_rate ?? 25}%)</div>
    <div style="margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:3px">Net Profit</div>
      <div style="font-size:22px;font-weight:700;color:${(income - expenses) >= 0 ? "var(--money-pos)" : "var(--danger)"};font-family:var(--font-sans)">${usd(income - expenses)}</div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:3px">Estimated Tax</div>
      <div style="font-size:22px;font-weight:700;color:var(--warning);font-family:'JetBrains Mono',monospace">${usd(tax)}</div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${income > 0 ? Math.min(100, (expenses / income) * 100) : 0}%"></div>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:5px">Expense ratio vs revenue</div>
    ${tax > 0 ? `
    <div style="margin-top:14px;padding:9px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);font-size:12px;color:var(--text-muted)">
      → Set aside <strong style="color:var(--warning)">${usd(tax)}</strong> for quarterly taxes.
    </div>` : ""}
  </div>
</div>

${Object.keys(byProject).length > 0 ? `
<div class="card" style="margin-bottom:24px">
  <div class="section-title" style="margin-bottom:14px">Income by Project</div>
  <div style="display:flex;flex-direction:column;gap:6px">
    ${Object.values(byProject).sort((a,b) => b.total - a.total).map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
      <span style="font-size:13px;color:var(--text);font-weight:500">${p.name}</span>
      <span style="font-weight:700;color:var(--money-pos);font-family:'JetBrains Mono',monospace">${usd(p.total)}</span>
    </div>`).join("")}
  </div>
</div>` : ""}

<div class="card" style="padding:0">
  <div style="padding:16px 20px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    ${["All","income","expense"].map(f =>
      `<button class="filter-btn${typeFilter === f ? " active" : ""}" onclick="setFinFilter('${f}')" style="margin-bottom:12px">
        ${f === "All" ? "All" : f === "income" ? "Income" : "Expenses"}
      </button>`
    ).join("")}
    ${projects.length > 0 ? `
    <select onchange="setFinProject(this.value)" style="margin-left:auto;margin-bottom:12px;width:auto;padding:6px 10px;font-size:12px">
      <option value="">All Projects</option>
      ${projects.map(p => `<option value="${p.id}"${projFilter === p.id ? " selected" : ""}>${p.name}</option>`).join("")}
    </select>` : ""}
  </div>
  ${displayed.length === 0
    ? `<div class="empty"><div class="empty-icon">💰</div><div class="empty-text">No entries match these filters.</div></div>`
    : `<table class="tbl">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Project</th><th>Type</th><th>Amount</th><th>Actions</th></tr></thead>
        <tbody>${displayed.map(f => {
          const proj = projects.find(p => p.id === f.project_id);
          return `
          <tr>
            <td data-label="Date" style="color:var(--text-muted)">${fmtDate(f.date)}</td>
            <td style="font-weight:500">${f.description || "—"}</td>
            <td data-label="Category"><span style="font-size:11px;color:var(--accent)">${f.category}</span></td>
            <td style="color:var(--text-muted);font-size:12px">${proj?.name || "—"}</td>
            <td>${f.type === "income"
              ? `<span class="badge" style="background:color-mix(in srgb,var(--money-pos) 15%,transparent);color:var(--money-pos)">income</span>`
              : `<span class="badge" style="background:color-mix(in srgb,var(--danger) 12%,transparent);color:var(--danger)">expense</span>`}</td>
            <td style="font-weight:700;color:${f.type === "income" ? "var(--money-pos)" : "var(--danger)"}">
              ${f.type === "expense" ? "-" : "+"}${usd(f.amount)}
            </td>
            <td><div class="btn-row">
              <button class="btn btn-ghost btn-sm" onclick="openFinModal('${f.id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteFin('${f.id}')">×</button>
            </div></td>
          </tr>`;
        }).join("")}</tbody>
      </table>`}
</div>`;
}

window.setFinFilter  = function(f) { window._finFilter  = f; render(); };
window.setFinPeriod  = function(p) { window._finPeriod  = p; render(); };
window.setFinProject = function(p) { window._finProject = p; render(); };

// ── Modal ─────────────────────────────────────────────────────
window.openFinModal = function(id) {
  const f = id ? STATE.data.finances.find(x => x.id === id) : null;
  const { projects, clients } = STATE.data;
  showModal(`
<div class="modal-header">
  <div class="modal-title">${f ? "Edit Entry" : "Add Entry"}</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-row">
  <div class="form-group"><label class="form-label">Type</label>
    <select id="f-type" onchange="document.getElementById('f-cat').value=this.value==='income'?'Revenue':'COGS'">
      <option value="income"${(!f || f.type === "income") ? " selected" : ""}>Income</option>
      <option value="expense"${f?.type === "expense" ? " selected" : ""}>Expense</option>
    </select>
  </div>
  <div class="form-group"><label class="form-label">Amount ($)</label>
    <input id="f-amount" type="number" value="${f?.amount || ""}" placeholder="0.00"/>
  </div>
</div>
<div class="form-row">
  <div class="form-group"><label class="form-label">Tax Category</label>
    <select id="f-cat">
      ${TAX_CATS.map(c => `<option${f?.category === c ? " selected" : ""}>${c}</option>`).join("")}
    </select>
  </div>
  <div class="form-group"><label class="form-label">Date</label>
    <input id="f-date" type="date" value="${f?.date || new Date().toISOString().slice(0, 10)}"/>
  </div>
</div>
<div class="form-row">
  <div class="form-group"><label class="form-label">Project (optional)</label>
    ${searchPicker("f-project", projects, f?.project_id, "Search projects…")}
  </div>
  <div class="form-group"><label class="form-label">Client (optional)</label>
    ${searchPicker("f-client", clients, f?.client_id, "Search clients…")}
  </div>
</div>
<div class="form-group"><label class="form-label">Description</label>
  <input id="f-desc" value="${f?.description || ""}" placeholder="What was this for?"/>
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
  <button class="btn btn-primary" id="f-save-btn" onclick="saveFin('${id || ""}')">
    ${f ? "Save Changes" : "Add Entry"}
  </button>
</div>`);
};

window.saveFin = async function(id) {
  const body = {
    type:        document.getElementById("f-type").value,
    amount:      document.getElementById("f-amount").value,
    category:    document.getElementById("f-cat").value,
    date:        document.getElementById("f-date").value,
    description: document.getElementById("f-desc").value.trim(),
    project_id:  pickerValue("f-project", STATE.data.projects),
    client_id:   pickerValue("f-client",  STATE.data.clients),
  };
  if (!body.amount) return;
  const btn = document.getElementById("f-save-btn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    if (id) await db.update("finances", id, body);
    else     await db.insert("finances", body);
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); btn.disabled = false; btn.textContent = "Save"; }
};

window.deleteFin = async function(id) {
  if (!confirm("Delete this entry?")) return;
  await db.delete("finances", id); loadAll();
};

window.financesHTML = financesHTML;

// ============================================================
//  DESKTOP — Money
//  Merges Invoices + Finances + Taxes behind one pinned nav item,
//  with an invoice detail rail (real line items + real activity
//  log — reminders/views/paid come from invoice_activity, written
//  by emailInvoice/_openMailto/updateInvStatus/saveInv).
// ============================================================
function _avgDaysToPay() {
  const paid = (STATE.data.invoices || []).filter(i => i.status === "Paid" && i.issued_at && i.paid_at);
  if (!paid.length) return null;
  const totalDays = paid.reduce((s, i) => s + Math.max(0, (new Date(i.paid_at) - new Date(i.issued_at)) / 86400000), 0);
  return totalDays / paid.length;
}

function _moneyDeskTabBtn(id, label) {
  const active = (window._moneyDeskTab || "invoices") === id;
  return `<button class="filter-btn${active ? " active" : ""}" onclick="window._moneyDeskTab='${id}';render()">${label}</button>`;
}

function moneyDesktopHTML() {
  const { invoices, finances, projects } = STATE.data;
  const tab = window._moneyDeskTab || "invoices";
  const avgDays = _avgDaysToPay();
  const owed = invoices.filter(i => ["Sent","Overdue"].includes(i.status)).reduce((s,i)=>s+Number(i.amount),0);
  const overdueCt = invoices.filter(i => i.status === "Overdue").length;

  const railHTML = STATE.openInvoice && tab === "invoices" ? _moneyInvoiceRailHTML(STATE.openInvoice) : "";

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Money</div>
    <div class="page-sub">${usd(owed)} owed to you${overdueCt ? ` · ${overdueCt} overdue` : ""}${avgDays != null ? ` · ${avgDays.toFixed(0)} day avg to pay` : ""}</div>
  </div>
  <div class="btn-row">
    <button class="btn btn-ghost" onclick="openFinModal(null)">+ Entry</button>
    <button class="btn btn-primary" onclick="openInvModal(null)">+ Invoice</button>
  </div>
</div>

<div class="filter-row" style="margin-bottom:20px">
  ${_moneyDeskTabBtn("invoices","Invoices")}
  ${_moneyDeskTabBtn("ledger","Ledger")}
  ${_moneyDeskTabBtn("expenses","Expenses")}
  ${_moneyDeskTabBtn("taxes","Taxes")}
</div>

<div class="${railHTML ? "desk-shell" : ""}">
  <div class="${railHTML ? "desk-col-main" : ""}">
    ${tab === "invoices" ? _moneyDeskInvoicesHTML(avgDays)
      : tab === "ledger"   ? _moneyDeskLedgerHTML()
      : tab === "expenses" ? _moneyDeskExpensesHTML()
      : _moneyDeskTaxesHTML()}
  </div>
  ${railHTML ? `<div class="desk-rail wide">${railHTML}</div>` : ""}
</div>`;
}
window.moneyDesktopHTML = moneyDesktopHTML;

// Copies a link to the public, read-only invoice status page
// (status.html) — logs a 'viewed' activity row itself when opened,
// via the public_invoice_status RPC (see docs/migrations).
window.copyInvoiceStatusLink = function(btn, token) {
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}status.html?token=${token}`;
  navigator.clipboard.writeText(url).then(() => {
    if (btn) { const orig = btn.textContent; btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = orig; }, 1500); }
  }).catch(() => alert(url));
};

function _moneyDeskInvoicesHTML(avgDays) {
  const invoices = STATE.data.invoices || [];
  const filter = window._invFilter || "All";
  const filtered = filter === "All" ? invoices : invoices.filter(i => i.status === filter);
  const totals = { Draft: 0, Sent: 0, Paid: 0, Overdue: 0 };
  invoices.forEach(i => { if (i.status in totals) totals[i.status] += Number(i.amount); });

  return `
<div class="desk-chip-row" style="margin-bottom:16px">
  <div class="desk-chip"><div class="desk-chip-label">Overdue</div><div class="desk-chip-val" style="color:var(--danger)">${usd(totals.Overdue)}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Sent</div><div class="desk-chip-val" style="color:var(--warning)">${usd(totals.Sent)}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Paid</div><div class="desk-chip-val" style="color:var(--money-pos)">${usd(totals.Paid)}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Avg days to pay</div><div class="desk-chip-val">${avgDays != null ? avgDays.toFixed(0) : "—"}</div></div>
</div>

<div class="filter-row" style="margin-bottom:14px">
  ${["All","Draft","Sent","Paid","Overdue","Void"].map(s =>
    `<button class="filter-btn${filter === s ? " active" : ""}" onclick="setInvFilter('${s}')">${s}</button>`
  ).join("")}
</div>

${filtered.length === 0
  ? `<div class="empty"><div class="empty-text">No invoices here.</div></div>`
  : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
    ${filtered.map(inv => {
      const active = STATE.openInvoice?.id === inv.id;
      return `
    <div class="desk-list-row${active ? " active" : ""}" style="display:flex;align-items:center;gap:14px" onclick='openInvoice(${JSON.stringify(inv).replace(/'/g,"&#39;")})'>
      <div style="flex:1;min-width:0">
        <div class="desk-list-row-title">${inv.invoice_number} <span style="color:var(--text-muted);font-weight:500">${inv.client_name || ""}</span></div>
        <div class="desk-list-row-sub">${inv.due_date ? "due " + fmtDate(inv.due_date) : "no due date"}</div>
      </div>
      ${badge(inv.status)}
      <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--text);width:90px;text-align:right">${usd(inv.amount)}</div>
    </div>`;
    }).join("")}
    </div>`}`;
}

function _moneyInvoiceRailHTML(inv) {
  const items = (STATE.data.invoice_items || []).filter(it => it.invoice_id === inv.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const activity = (STATE.data.invoice_activity || []).filter(a => a.invoice_id === inv.id).sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  const statusColor = { Overdue: "var(--danger)", Sent: "var(--warning)", Paid: "var(--money-pos)", Draft: "var(--text-muted)", Void: "var(--text-muted)" };
  const activityIcon = { created: "◇", sent: "◻", reminder: "↻", viewed: "◉", paid: "✓", void: "×" };
  const activityColor = { created: "var(--text-muted)", sent: "var(--accent)", reminder: "var(--warning)", viewed: "var(--text-muted)", paid: "var(--money-pos)", void: "var(--danger)" };

  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
  <span style="font-family:var(--font-mono);font-size:11px;color:var(--accent);cursor:pointer" onclick="closeInvoiceDetail()">← close</span>
  ${badge(inv.status)}
</div>
<div style="font-family:var(--font-serif);font-size:23px;margin-bottom:4px">${inv.invoice_number}</div>
<div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${inv.client_name || "No client"}</div>
<div style="font-family:var(--font-mono);font-size:30px;font-weight:700;letter-spacing:-0.02em;margin-bottom:18px">${usd(inv.amount)}</div>

${items.length ? `
<div style="display:flex;flex-direction:column;gap:1px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:18px">
  ${items.map(it => `
  <div style="display:flex;gap:12px;padding:11px 13px;border-bottom:1px solid var(--border)">
    <span style="flex:1;font-size:12.5px;color:var(--text)">${it.description}</span>
    <span style="font-family:var(--font-mono);font-size:12.5px;color:var(--text)">${usd(it.amount ?? (Number(it.quantity||1)*Number(it.unit_price||0)))}</span>
  </div>`).join("")}
</div>` : ""}

<div style="display:flex;gap:8px;margin-bottom:20px">
  ${inv.status !== "Paid" && inv.status !== "Void" ? `<button class="btn btn-ghost" style="flex:1" onclick="updateInvStatus('${inv.id}','Paid')">✓ Mark paid</button>` : ""}
  <button class="btn btn-ghost" style="flex:1" onclick="openInvModal('${inv.id}')">Edit</button>
</div>

<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:18px">
  <div style="font-family:var(--font-serif);font-size:16px;margin-bottom:4px">Send a nudge</div>
  <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">${inv.client_name ? `Emails ${inv.client_name} with the PDF attached.` : "Emails the client with the PDF attached."}</div>
  <div style="display:flex;gap:8px">
    <button class="btn btn-primary" style="flex:1" onclick="emailInvoice('${inv.id}')">Send reminder</button>
    <button class="btn btn-ghost" onclick="printInvoice('${inv.id}')">PDF</button>
  </div>
  ${inv.public_token ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px" onclick="copyInvoiceStatusLink(this,'${inv.public_token}')">Copy status link</button>` : ""}
</div>

<div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Activity</div>
${activity.length === 0
  ? `<div style="font-size:12.5px;color:var(--text-muted)">No activity logged yet.</div>`
  : activity.map(a => `
  <div class="desk-timeline-item">
    <div class="desk-timeline-rail">
      <div class="desk-timeline-dot" style="background:${activityColor[a.type]||'var(--text-muted)'};display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--bg)">${activityIcon[a.type]||"·"}</div>
      <div class="desk-timeline-line"></div>
    </div>
    <div class="desk-timeline-body">
      <div style="font-size:12.5px;color:var(--text)">${a.note || a.type}</div>
      <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);margin-top:2px">${fmtDate(a.created_at)}</div>
    </div>
  </div>`).join("")}`;
}

function _moneyDeskLedgerHTML() {
  const finances = STATE.data.finances || [];
  const period = window._finPeriod || "this_month";
  const periodEntries = _filterByPeriod(finances, period);
  const income = periodEntries.filter(f=>f.type==="income").reduce((s,f)=>s+Number(f.amount),0);
  const expense = periodEntries.filter(f=>f.type==="expense").reduce((s,f)=>s+Number(f.amount),0);
  const recent = [...periodEntries].sort((a,b)=> new Date(b.date)-new Date(a.date));

  return `
<div class="filter-row" style="margin-bottom:14px">
  ${Object.entries(PERIOD_LABELS).map(([k,label]) => `<button class="filter-btn${period===k?" active":""}" onclick="setFinPeriod('${k}')">${label}</button>`).join("")}
</div>
<div class="desk-chip-row" style="margin-bottom:16px">
  <div class="desk-chip"><div class="desk-chip-label">Income</div><div class="desk-chip-val" style="color:var(--money-pos)">${usd(income)}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Expenses</div><div class="desk-chip-val" style="color:var(--danger)">${usd(expense)}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Net</div><div class="desk-chip-val" style="color:${(income-expense)>=0?'var(--money-pos)':'var(--danger)'}">${usd(income-expense)}</div></div>
</div>
${recent.length === 0
  ? `<div class="empty"><div class="empty-text">No entries this period.</div></div>`
  : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
    ${recent.map(f => `
    <div class="desk-list-row" style="display:flex;align-items:center;gap:14px" onclick="openFinModal('${f.id}')">
      <div style="flex:1;min-width:0">
        <div class="desk-list-row-title">${f.description || f.category}</div>
        <div class="desk-list-row-sub">${fmtDate(f.date)} · ${f.category}${(STATE.data.projects||[]).find(p=>p.id===f.project_id) ? " · " + STATE.data.projects.find(p=>p.id===f.project_id).name : ""}</div>
      </div>
      <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:${f.type==='income'?'var(--money-pos)':'var(--danger)'}">${f.type==='income'?'+':'-'}${usd(f.amount)}</div>
    </div>`).join("")}
    </div>`}`;
}

function _moneyDeskExpensesHTML() {
  const finances = (STATE.data.finances || []).filter(f => f.type === "expense");
  const period = window._finPeriod || "this_month";
  const periodEntries = _filterByPeriod(finances, period);
  const total = periodEntries.reduce((s,f)=>s+Number(f.amount),0);
  const byCat = TAX_CATS.map(cat => ({ cat, total: periodEntries.filter(f=>f.category===cat).reduce((s,f)=>s+Number(f.amount),0) })).filter(c=>c.total>0);

  return `
<div class="filter-row" style="margin-bottom:14px">
  ${Object.entries(PERIOD_LABELS).map(([k,label]) => `<button class="filter-btn${period===k?" active":""}" onclick="setFinPeriod('${k}')">${label}</button>`).join("")}
</div>
<div class="card" style="margin-bottom:16px">
  <div class="card-label">Total expenses</div>
  <div class="card-value" style="color:var(--danger)">${usd(total)}</div>
  <div class="card-sub">${PERIOD_LABELS[period]}</div>
</div>
${byCat.length ? `
<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
  ${byCat.sort((a,b)=>b.total-a.total).map(c => `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 13px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-sm)">
    <span style="font-size:13px;color:var(--text-muted)">${c.cat}</span>
    <span style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--danger)">${usd(c.total)}</span>
  </div>`).join("")}
</div>` : ""}
${periodEntries.length === 0
  ? `<div class="empty"><div class="empty-text">No expenses this period.</div></div>`
  : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
    ${[...periodEntries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(f => `
    <div class="desk-list-row" style="display:flex;align-items:center;gap:14px" onclick="openFinModal('${f.id}')">
      <div style="flex:1;min-width:0">
        <div class="desk-list-row-title">${f.description || f.category}</div>
        <div class="desk-list-row-sub">${fmtDate(f.date)}</div>
      </div>
      <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--danger)">-${usd(f.amount)}</div>
    </div>`).join("")}
    </div>`}`;
}

function _moneyDeskTaxesHTML() {
  const finances = STATE.data.finances || [];
  const period = window._finPeriod || "this_month";
  const periodEntries = _filterByPeriod(finances, period);
  const income = periodEntries.filter(f=>f.type==="income").reduce((s,f)=>s+Number(f.amount),0);
  const expense = periodEntries.filter(f=>f.type==="expense").reduce((s,f)=>s+Number(f.amount),0);
  const taxRate = (STATE.data.user_settings?.tax_rate ?? 25) / 100;
  const tax = Math.max(0, (income-expense) * taxRate);
  const catTotals = TAX_CATS.map(cat => {
    const entries = periodEntries.filter(f=>f.category===cat);
    return { cat, income: entries.filter(f=>f.type==="income").reduce((s,f)=>s+Number(f.amount),0), expense: entries.filter(f=>f.type==="expense").reduce((s,f)=>s+Number(f.amount),0) };
  }).filter(c=>c.income>0||c.expense>0);

  return `
<div class="filter-row" style="margin-bottom:14px">
  ${Object.entries(PERIOD_LABELS).map(([k,label]) => `<button class="filter-btn${period===k?" active":""}" onclick="setFinPeriod('${k}')">${label}</button>`).join("")}
</div>
<div class="card" style="margin-bottom:20px">
  <div class="card-label">Estimated tax (${Math.round(taxRate*100)}%)</div>
  <div class="card-value" style="color:var(--warning);font-size:28px">${usd(tax)}</div>
  <div class="card-sub">Net profit ${usd(income-expense)} · ${PERIOD_LABELS[period]}</div>
</div>
<div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">By tax category</div>
${catTotals.length === 0
  ? `<div class="empty"><div class="empty-text">No entries this period.</div></div>`
  : `<div style="display:flex;flex-direction:column;gap:8px">
    ${catTotals.map(c => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 13px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <span style="font-size:13px;color:var(--text-muted)">${c.cat}</span>
      <div style="display:flex;gap:12px">
        ${c.income>0?`<span style="font-family:var(--font-mono);font-size:12.5px;font-weight:700;color:var(--money-pos)">+${usd(c.income)}</span>`:""}
        ${c.expense>0?`<span style="font-family:var(--font-mono);font-size:12.5px;font-weight:700;color:var(--danger)">-${usd(c.expense)}</span>`:""}
      </div>
    </div>`).join("")}
    </div>`}`;
}
