// ============================================================
//  Freelancer — client/pages/clients.js
//  Client list + Client File with document storage.
// ============================================================

const DOC_TYPES = ["Service Agreement", "Contract", "Content Form", "Proposal", "Invoice", "NDA", "Brief", "Other"];

// ══════════════════════════════════════════════════════════════
//  CLIENT LIST
// ══════════════════════════════════════════════════════════════
function clientsHTML() {
  const { clients } = STATE.data;

  if (window.innerWidth <= 640) {
    if (window._openClientId) return clientFileHTML(window._openClientId);
    return _clientsMobileHTML(clients);
  }
  if (window.clientsDesktopHTML) return clientsDesktopHTML(clients);

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">// clients</div>
    <div class="page-sub">${clients.length} client${clients.length !== 1 ? "s" : ""} on record</div>
  </div>
  <div class="btn-row">
    <div style="position:relative;min-width:220px">
      <input id="client-search" placeholder="search clients…"
        style="padding-left:32px;width:100%"
        oninput="renderClientSearch(this.value)"
        onkeydown="if(event.key==='Escape'){this.value='';renderClientSearch('')}"/>
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                   color:var(--text-muted);font-size:14px;pointer-events:none">⌕</span>
    </div>
    <button class="btn btn-primary" onclick="openClientModal(null)">+ new client</button>
  </div>
</div>

<div id="client-list-container">
${clients.length === 0
  ? `<div class="empty">
      <div class="empty-icon" style="font-family:'JetBrains Mono',monospace">◎</div>
      <div class="empty-text">no clients yet.</div>
      <button class="btn btn-primary" onclick="openClientModal(null)">+ new client</button>
    </div>`
  : `<div class="projects-grid">
      ${clients.map(c => {
        const projects = (STATE.data.projects || []).filter(p => p.client_id === c.id);
        const docs     = (STATE.data.client_documents || []).filter(d => d.client_id === c.id);
        return `
        <div class="project-card" onclick="openClientFile('${c.id}')">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
            <div style="min-width:0">
              <div class="card-label">${c.company || "Client"}</div>
              <div class="project-card-name">${c.name}</div>
            </div>
            ${badge(c.status)}
          </div>
          ${c.email ? `<div class="project-card-desc" style="color:var(--accent)">${c.email}</div>` : ""}
          ${c.phone ? `<div class="project-card-desc">${c.phone}</div>` : ""}
          <div class="project-card-foot">
            <span>◫ ${projects.length} project${projects.length !== 1 ? "s" : ""}</span>
            <span>◻ ${docs.length} doc${docs.length !== 1 ? "s" : ""}</span>
          </div>
        </div>`;
      }).join("")}
    </div>`}
</div>`;
}

function _initials(name) {
  return (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ── Mobile: full-width row list (real project count + amount owed) ──
function _clientsMobileHTML(clients) {
  const invoices = STATE.data.invoices || [];
  const projects = STATE.data.projects || [];

  const rows = clients.map(c => {
    const projCt   = projects.filter(p => p.client_id === c.id).length;
    const clientInv = invoices.filter(i => i.client_id === c.id);
    const owed     = clientInv.filter(i => ["Sent","Overdue"].includes(i.status)).reduce((a, i) => a + Number(i.amount), 0);
    const late     = clientInv.some(i => i.status === "Overdue");
    const sub = c.status === "Inactive"
      ? `Archived${c.updated_at ? " · last " + fmtDate(c.updated_at) : ""}`
      : c.status === "Lead"
        ? "Lead"
        : `${projCt} project${projCt !== 1 ? "s" : ""}${owed ? " · " + usd(owed) + " owed" : ""}`;
    return `
    <div onclick="openClientFile('${c.id}')"
      style="display:flex;align-items:center;gap:12px;padding:14px 4px;border-top:1px solid var(--border);cursor:pointer">
      <div style="width:34px;height:34px;border-radius:10px;background:var(--bg-input);border:1px solid ${late ? "var(--border-2)" : "var(--border)"};
        display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;color:${late ? "var(--accent)" : "var(--text-muted)"};flex-shrink:0">${_initials(c.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:var(--text)">${c.name}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${sub}</div>
      </div>
      ${late ? `<span style="color:var(--danger);font-family:'JetBrains Mono',monospace;font-size:11px;flex-shrink:0">late</span>`
             : `<span style="color:var(--text-muted);flex-shrink:0">→</span>`}
    </div>`;
  }).join("");

  return `
<div style="font-family:Fraunces,Georgia,serif;font-size:26px;margin-bottom:2px">Clients</div>
<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">${clients.length} client${clients.length !== 1 ? "s" : ""} on record</div>
<div style="position:relative;margin-bottom:8px">
  <input id="client-search" placeholder="Search clients" style="padding-left:32px;width:100%" oninput="renderClientSearch(this.value)"/>
  <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:14px;pointer-events:none">⌕</span>
</div>
<button class="btn btn-primary" style="width:100%;margin-bottom:4px" onclick="openClientModal(null)">+ New Client</button>
<div id="client-list-container">
  ${clients.length === 0
    ? `<div class="empty"><div class="empty-text">No clients yet.</div></div>`
    : rows}
</div>`;
}

window.renderClientSearch = function(q) {
  const term = q.toLowerCase();
  const filtered = STATE.data.clients.filter(c =>
    !term ||
    c.name?.toLowerCase().includes(term) ||
    c.company?.toLowerCase().includes(term) ||
    c.email?.toLowerCase().includes(term)
  );
  // Re-render just the grid
  const container = document.getElementById("client-list-container");
  if (!container) return;
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty"><div class="empty-text">no clients match "${q}"</div></div>`;
    return;
  }
  if (window.innerWidth <= 640) {
    const invoices = STATE.data.invoices || [];
    const projects = STATE.data.projects || [];
    container.innerHTML = filtered.map(c => {
      const projCt    = projects.filter(p => p.client_id === c.id).length;
      const clientInv = invoices.filter(i => i.client_id === c.id);
      const owed      = clientInv.filter(i => ["Sent","Overdue"].includes(i.status)).reduce((a, i) => a + Number(i.amount), 0);
      const late      = clientInv.some(i => i.status === "Overdue");
      const sub = c.status === "Inactive" ? "Archived" : c.status === "Lead" ? "Lead"
        : `${projCt} project${projCt !== 1 ? "s" : ""}${owed ? " · " + usd(owed) + " owed" : ""}`;
      return `
      <div onclick="openClientFile('${c.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 4px;border-top:1px solid var(--border);cursor:pointer">
        <div style="width:34px;height:34px;border-radius:10px;background:var(--bg-input);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);flex-shrink:0">${_initials(c.name)}</div>
        <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:var(--text)">${c.name}</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">${sub}</div></div>
        ${late ? `<span style="color:var(--danger);font-family:'JetBrains Mono',monospace;font-size:11px;flex-shrink:0">late</span>` : `<span style="color:var(--text-muted);flex-shrink:0">→</span>`}
      </div>`;
    }).join("");
    return;
  }
  const selectedId = window._deskSelectedClientId;
  container.innerHTML = filtered.map(c => _clientDeskRowHTML(c, c.id === selectedId)).join("");
};

// Shared row renderer for the desktop client list rail (initial render + live search)
function _clientDeskRowHTML(c, isSelected) {
  const invoices  = (STATE.data.invoices || []).filter(i => i.client_id === c.id);
  const owed = invoices.filter(i => ["Sent","Overdue"].includes(i.status)).reduce((s,i)=>s+Number(i.amount),0);
  const late = invoices.some(i => i.status === "Overdue");
  return `
  <div class="desk-list-row${isSelected ? " active" : ""}" onclick="window._deskSelectedClientId='${c.id}';render()">
    <div class="desk-list-row-title">${c.name}</div>
    <div class="desk-list-row-sub" style="color:${late?'var(--danger)':'var(--text-muted)'}">${owed>0 ? usd(owed) + (late?" overdue":" open") : (c.company || c.status)}</div>
  </div>`;
}

window.openClientFile = function(id) {
  window._openClientId = id;
  render();
};

// ══════════════════════════════════════════════════════════════
//  CLIENT FILE
// ══════════════════════════════════════════════════════════════
function clientFileHTML(id) {
  const c        = STATE.data.clients.find(x => x.id === id);
  if (!c) { window._openClientId = null; return clientsHTML(); }

  const projects  = (STATE.data.projects || []).filter(p => p.client_id === id);
  const invoices  = (STATE.data.invoices || []).filter(i => i.client_id === id);
  const docs      = (STATE.data.client_documents || []).filter(d => d.client_id === id);
  const finances  = (STATE.data.finances || []).filter(f => f.client_id === id);
  const totalBilled = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid   = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + Number(i.amount), 0);
  const owedNow     = invoices.filter(i => ["Sent","Overdue"].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0);

  // Real recent activity — finance entries + invoice due dates for this client, newest first.
  const activity = [
    ...finances.map(f => ({ date: f.date, label: f.description || f.category, amt: f.type === "income" ? f.amount : -f.amount })),
    ...invoices.filter(i => i.due_date).map(i => ({ date: i.due_date, label: `${i.invoice_number} — ${i.status}`, amt: null })),
  ].filter(e => e.date).sort((a, b) => (b.date > a.date ? 1 : -1)).slice(0, 6);

  return `
<div class="breadcrumb">
  <span class="breadcrumb-link" onclick="window._openClientId=null;render()">← clients</span>
  <span>/</span>
  <span style="color:var(--text)">${c.name}</span>
</div>

<div class="page-section-header">
  <div>
    <div class="page-title">${c.name}</div>
    <div class="pf-meta">
      ${badge(c.status)}
      ${c.company ? `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">${c.company}</span>` : ""}
    </div>
  </div>
  <div class="btn-row">
    <button class="btn btn-ghost" onclick="openClientModal('${c.id}')">edit</button>
    <button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}')">delete</button>
  </div>
</div>

<!-- Mobile quick actions -->
<div class="mobile-only" style="display:flex;gap:8px;margin-bottom:20px">
  <div class="btn btn-primary" style="flex:1;text-align:center;cursor:pointer" onclick="navigate('invoices');setTimeout(()=>openInvModal(null),100)">New invoice</div>
  ${c.email ? `<a href="mailto:${c.email}" class="btn btn-ghost" style="flex:1;text-align:center;text-decoration:none">Email</a>` : ""}
</div>

<!-- Stats row -->
<div class="grid-4" style="margin-bottom:20px">
  ${[
    { label: "Projects",     val: projects.length,  color: "var(--accent)" },
    { label: "Invoices",     val: invoices.length,  color: "var(--text)" },
    { label: "Total Billed", val: usd(totalBilled), color: "var(--text)" },
    { label: "Owed Now",     val: usd(owedNow),     color: owedNow > 0 ? "var(--danger)" : "var(--money-pos)" },
  ].map(s => `
  <div class="card">
    <div class="card-label">${s.label}</div>
    <div class="card-value" style="font-size:18px;color:${s.color}">${s.val}</div>
  </div>`).join("")}
</div>

${activity.length > 0 ? `
<div class="card" style="margin-bottom:20px">
  <div class="section-title" style="margin-bottom:14px">recent activity</div>
  <div style="display:flex;flex-direction:column;gap:12px">
    ${activity.map(e => `
    <div style="display:flex;gap:12px">
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);width:60px;flex-shrink:0">${fmtDate(e.date)}</span>
      <span style="font-size:13px;flex:1;color:var(--text)">${e.label}${e.amt != null ? ` — <span style="color:${e.amt >= 0 ? "var(--money-pos)" : "var(--danger)"}">${e.amt >= 0 ? "+" : "−"}${usd(Math.abs(e.amt))}</span>` : ""}</span>
    </div>`).join("")}
  </div>
</div>` : ""}

<div class="grid-2" style="margin-bottom:20px">
  <!-- Contact info -->
  <div class="card">
    <div class="section-title" style="margin-bottom:14px">contact</div>
    ${[
      { label: "email", val: c.email, href: c.email ? `mailto:${c.email}` : null },
      { label: "phone", val: c.phone, href: c.phone ? `tel:${c.phone}` : null },
      { label: "company", val: c.company, href: null },
    ].map(f => `
    <div class="pf-detail-row">
      <span style="color:var(--text-muted)">${f.label}</span>
      ${f.href
        ? `<a href="${f.href}" style="color:var(--accent);font-family:'JetBrains Mono',monospace;font-size:12px;text-decoration:none">${f.val || "—"}</a>`
        : `<span style="font-family:'JetBrains Mono',monospace;font-size:12px">${f.val || "—"}</span>`}
    </div>`).join("")}
    ${c.notes ? `
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">notes</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);line-height:1.6">${c.notes}</div>
    </div>` : ""}
  </div>

  <!-- Projects -->
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div class="section-title">projects</div>
      <button class="btn btn-ghost btn-sm" onclick="navigate('projects')">+ new</button>
    </div>
    ${projects.length === 0
      ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">no projects yet.</div>`
      : projects.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer"
        onclick="window.openProject(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--text)">${p.name}</div>
          ${p.deadline ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)">${fmtDate(p.deadline)}</div>` : ""}
        </div>
        ${badge(p.status)}
      </div>`).join("")}
  </div>
</div>

<!-- Document Storage -->
<div class="card" style="margin-bottom:20px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <div class="section-title">documents</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:3px">
        service agreements, contracts, content forms, and more
      </div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openDocModal('${c.id}', null)">+ add doc</button>
  </div>

  ${docs.length === 0
    ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);padding:12px 0">
        no documents yet. paste Google Drive, Dropbox, or DocuSign links to keep everything in one place.
      </div>`
    : `<div style="display:flex;flex-direction:column;gap:8px">
        ${docs.map(d => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border:1px solid var(--border);border-radius:10px">
          <span style="font-family:'JetBrains Mono',monospace;font-size:18px;flex-shrink:0">${_docIcon(d.type)}</span>
          <div style="flex:1;min-width:0">
            <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text)">${d.name}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
              <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px">${d.type}</span>
              ${d.url ? `<span style="color:var(--text-muted);font-size:10px">·</span>
              <a href="${d.url}" target="_blank" rel="noopener"
                style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px"
                onclick="event.stopPropagation()">${d.url.replace(/^https?:\/\//,"")}</a>` : ""}
            </div>
            ${d.notes ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:4px">${d.notes}</div>` : ""}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            ${d.url ? `<a href="${d.url}" target="_blank" rel="noopener"
              class="btn btn-ghost btn-sm" style="font-size:10px;padding:4px 8px;text-decoration:none">open</a>` : ""}
            <button class="btn btn-ghost btn-sm" style="font-size:10px;padding:4px 8px"
              onclick="openDocModal('${c.id}','${d.id}')">edit</button>
            <button class="btn btn-danger btn-sm" style="font-size:10px;padding:4px 8px"
              onclick="deleteDoc('${d.id}')">×</button>
          </div>
        </div>`).join("")}
      </div>`}
</div>

<!-- Recent Invoices -->
${invoices.length > 0 ? `
<div class="card">
  <div class="section-title" style="margin-bottom:14px">invoices</div>
  <table class="tbl">
    <thead><tr><th>#</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
    <tbody>${invoices.map(i => `
    <tr>
      <td data-label="#" style="font-family:'JetBrains Mono',monospace;color:var(--text-muted)">${i.invoice_number}</td>
      <td data-label="Amount" style="font-weight:700">${usd(i.amount)}</td>
      <td data-label="Due" style="color:var(--text-muted)">${fmtDate(i.due_date)}</td>
      <td data-label="Status">${badge(i.status)}</td>
    </tr>`).join("")}</tbody>
  </table>
</div>` : ""}`;
}

function _docIcon(type) {
  const icons = {
    "Service Agreement": "📋", "Contract": "✍", "Content Form": "📝",
    "Proposal": "💼", "Invoice": "🧾", "NDA": "🔒", "Brief": "📄", "Other": "📎",
  };
  // Return mono symbol instead of emoji to match design system
  const symbols = {
    "Service Agreement": "◈", "Contract": "◆", "Content Form": "◻",
    "Proposal": "◫", "Invoice": "◇", "NDA": "◉", "Brief": "◎", "Other": "○",
  };
  return symbols[type] || "○";
}

// ══════════════════════════════════════════════════════════════
//  CLIENT MODAL
// ══════════════════════════════════════════════════════════════
window.openClientModal = function(id) {
  const c = id ? STATE.data.clients.find(x => x.id === id) : null;
  showModal(`
<div class="modal-header">
  <div class="modal-title">${c ? "edit client" : "new client"}</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-row">
  <div class="form-group"><label class="form-label">Name *</label>
    <input id="c-name" value="${c?.name || ""}" placeholder="Jane Smith"/></div>
  <div class="form-group"><label class="form-label">Company</label>
    <input id="c-company" value="${c?.company || ""}" placeholder="Acme Co."/></div>
</div>
<div class="form-row">
  <div class="form-group"><label class="form-label">Email</label>
    <input id="c-email" value="${c?.email || ""}" placeholder="jane@example.com"/></div>
  <div class="form-group"><label class="form-label">Phone</label>
    <input id="c-phone" value="${c?.phone || ""}" placeholder="+1 555 000 0000"/></div>
</div>
<div class="form-group"><label class="form-label">Status</label>
  <select id="c-status">
    ${["Active","Inactive","Lead"].map(s => `<option${c?.status === s ? " selected" : ""}>${s}</option>`).join("")}
  </select>
</div>
<div class="form-group"><label class="form-label">Notes</label>
  <textarea id="c-notes" rows="3">${c?.notes || ""}</textarea>
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" id="c-save-btn" onclick="saveClient('${id || ""}')">
    ${c ? "save changes" : "add client"}
  </button>
</div>`);
};

window.saveClient = async function(id) {
  const body = {
    name:    document.getElementById("c-name").value.trim(),
    company: document.getElementById("c-company").value.trim(),
    email:   document.getElementById("c-email").value.trim(),
    phone:   document.getElementById("c-phone").value.trim(),
    status:  document.getElementById("c-status").value,
    notes:   document.getElementById("c-notes").value.trim(),
  };
  if (!body.name) return;
  const btn = document.getElementById("c-save-btn");
  btn.disabled = true; btn.textContent = "saving…";
  try {
    if (id) await db.update("clients", id, body);
    else     await db.insert("clients", body);
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); btn.disabled = false; btn.textContent = "save"; }
};

window.deleteClient = async function(id) {
  if (!confirm("Delete this client? Their projects and invoices will be unlinked.")) return;
  await db.delete("clients", id);
  window._openClientId = null;
  window._deskSelectedClientId = null;
  loadAll();
};

// ══════════════════════════════════════════════════════════════
//  DOCUMENT MODAL
// ══════════════════════════════════════════════════════════════
window.openDocModal = function(clientId, docId) {
  const d = docId ? (STATE.data.client_documents || []).find(x => x.id === docId) : null;
  showModal(`
<div class="modal-header">
  <div class="modal-title">${d ? "edit document" : "add document"}</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-group">
  <label class="form-label">Document Name</label>
  <input id="doc-name" value="${d?.name || ""}" placeholder="Client Service Agreement 2026"/>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Type</label>
    <select id="doc-type">
      ${DOC_TYPES.map(t => `<option${d?.type === t ? " selected" : ""}>${t}</option>`).join("")}
    </select>
  </div>
</div>
<div class="form-group">
  <label class="form-label">Link / URL</label>
  <input id="doc-url" value="${d?.url || ""}" placeholder="https://drive.google.com/…" type="url"/>
  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:4px">
    Google Drive, Dropbox, DocuSign, OneDrive, or any link
  </div>
</div>
<div class="form-group">
  <label class="form-label">Notes</label>
  <input id="doc-notes" value="${d?.notes || ""}" placeholder="Signed Aug 2026, expires in 1 year…"/>
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" id="doc-save-btn" onclick="saveDoc('${clientId}','${docId || ""}')">
    ${d ? "save changes" : "add document"}
  </button>
</div>`);
};

window.saveDoc = async function(clientId, docId) {
  const body = {
    client_id: clientId,
    name:      document.getElementById("doc-name").value.trim(),
    type:      document.getElementById("doc-type").value,
    url:       document.getElementById("doc-url").value.trim(),
    notes:     document.getElementById("doc-notes").value.trim(),
  };
  if (!body.name) return;
  const btn = document.getElementById("doc-save-btn");
  btn.disabled = true; btn.textContent = "saving…";
  try {
    if (docId) await db.update("client_documents", docId, body);
    else        await db.insert("client_documents", body);
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); btn.disabled = false; btn.textContent = "save"; }
};

window.deleteDoc = async function(id) {
  if (!confirm("Remove this document?")) return;
  await db.delete("client_documents", id); loadAll();
};

window.clientsHTML    = clientsHTML;
window.clientFileHTML = clientFileHTML;

// ============================================================
//  DESKTOP — Clients
//  List rail + detail panel. History is composed from real,
//  already-timestamped records (invoice_activity + project
//  creation) rather than a fabricated event log.
// ============================================================
function _clientAvgDaysToPay(clientId) {
  const paid = (STATE.data.invoices || []).filter(i => i.client_id === clientId && i.status === "Paid" && i.issued_at && i.paid_at);
  if (!paid.length) return null;
  const total = paid.reduce((s,i)=> s + Math.max(0,(new Date(i.paid_at) - new Date(i.issued_at))/86400000), 0);
  return total / paid.length;
}

function _clientHoursLogged(clientId) {
  const projectIds = (STATE.data.projects || []).filter(p => p.client_id === clientId).map(p => p.id);
  const entries = (STATE.data.time_entries || []).filter(t => projectIds.includes(t.project_id));
  return entries.reduce((s,t)=> s + entryMinutes(t), 0) / 60;
}

function _clientHistory(c) {
  const invoices = (STATE.data.invoices || []).filter(i => i.client_id === c.id);
  const invIds = invoices.map(i => i.id);
  const activity = (STATE.data.invoice_activity || []).filter(a => invIds.includes(a.invoice_id));
  const projects = (STATE.data.projects || []).filter(p => p.client_id === c.id);

  const events = [
    ...activity.map(a => {
      const inv = invoices.find(i => i.id === a.invoice_id);
      return { date: a.created_at, label: `${a.note || a.type}${inv ? " — " + inv.invoice_number : ""}`, type: a.type };
    }),
    ...projects.filter(p => p.created_at).map(p => ({ date: p.created_at, label: `Project started — ${p.name}`, type: "project" })),
    ...(c.created_at ? [{ date: c.created_at, label: "Became a client", type: "client" }] : []),
  ];
  return events.filter(e => e.date).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
}

function clientsDesktopHTML(clients) {
  const selectedId = window._deskSelectedClientId || clients[0]?.id;
  const selected = clients.find(c => c.id === selectedId);
  const invoices = STATE.data.invoices || [];

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Clients</div>
    <div class="page-sub">${clients.length} client${clients.length!==1?"s":""} on record</div>
  </div>
  <button class="btn btn-primary" onclick="openClientModal(null)">+ New Client</button>
</div>

<div class="desk-shell">
  <div class="desk-col-list">
    <div style="padding:0 4px 12px">
      <input id="client-search" placeholder="search clients…" oninput="renderClientSearch(this.value)"/>
    </div>
    <div id="client-list-container">
    ${clients.length === 0
      ? `<div style="font-size:12px;color:var(--text-muted);padding:8px 4px">no clients yet.</div>`
      : clients.map(c => _clientDeskRowHTML(c, c.id===selectedId)).join("")}
    </div>
  </div>

  <div class="desk-col-main">
    ${selected ? _clientDetailPanelHTML(selected) : `<div class="empty"><div class="empty-text">select a client.</div></div>`}
  </div>
</div>`;
}
window.clientsDesktopHTML = clientsDesktopHTML;

function _clientDetailPanelHTML(c) {
  const projects  = (STATE.data.projects || []).filter(p => p.client_id === c.id);
  const invoices  = (STATE.data.invoices || []).filter(i => i.client_id === c.id);
  const owedNow   = invoices.filter(i => ["Sent","Overdue"].includes(i.status)).reduce((s,i)=>s+Number(i.amount),0);
  const totalBilled = invoices.reduce((s,i)=>s+Number(i.amount),0);
  const avgDays   = _clientAvgDaysToPay(c.id);
  const hours     = _clientHoursLogged(c.id);
  const history   = _clientHistory(c);

  return `
<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
  <div style="width:52px;height:52px;border-radius:999px;background:var(--bg-raised);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:16px;color:var(--accent);flex-shrink:0">${_initials(c.name)}</div>
  <div style="flex:1;min-width:0">
    <div style="display:flex;align-items:center;gap:10px"><div style="font-family:var(--font-serif);font-size:22px">${c.name}</div>${badge(c.status)}</div>
    <div style="font-size:12.5px;color:var(--text-muted);margin-top:2px">${[c.company, c.email, c.created_at ? "client since " + fmtDate(c.created_at) : null].filter(Boolean).join(" · ")}</div>
  </div>
  <div class="btn-row" style="flex-shrink:0">
    ${c.email ? `<a href="mailto:${c.email}" class="btn btn-ghost" style="text-decoration:none">Email</a>` : ""}
    <button class="btn btn-primary" onclick="navigate('finances');setTimeout(()=>openInvModal(null),100)">New invoice</button>
    <button class="btn btn-ghost" onclick="openClientModal('${c.id}')">Edit</button>
    <button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}')">Delete</button>
  </div>
</div>

<div class="desk-chip-row" style="margin-bottom:24px">
  <div class="desk-chip"><div class="desk-chip-label">Billed lifetime</div><div class="desk-chip-val">${usd(totalBilled)}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Owed now</div><div class="desk-chip-val" style="color:${owedNow>0?'var(--danger)':'var(--money-pos)'}">${usd(owedNow)}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Avg days to pay</div><div class="desk-chip-val">${avgDays!=null?avgDays.toFixed(0):"—"}</div></div>
  <div class="desk-chip"><div class="desk-chip-label">Hours logged</div><div class="desk-chip-val">${hours.toFixed(0)}</div></div>
</div>

<div class="desk-shell">
  <div class="desk-col-main">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px">
      <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)">Projects</div>
      <span onclick="navigate('projects')" style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--accent);cursor:pointer">+ new</span>
    </div>
    ${projects.length === 0
      ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:22px">no projects yet.</div>`
      : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:24px">
      ${projects.map(p => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer" onclick='openProject(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${p.name}</div>
          ${p.deadline ? `<div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);margin-top:2px">due ${fmtDate(p.deadline)}</div>` : ""}
        </div>
        ${badge(p.status)}
      </div>`).join("")}
      </div>`}

    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Invoices</div>
    ${invoices.length === 0
      ? `<div style="font-size:12px;color:var(--text-muted)">no invoices yet.</div>`
      : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      ${invoices.map(i => `
      <div class="desk-list-row" style="display:flex;align-items:center;gap:14px" onclick='openInvoice(${JSON.stringify(i).replace(/'/g,"&#39;")})'>
        <div style="flex:1;min-width:0">
          <div class="desk-list-row-title">${i.invoice_number}</div>
          <div class="desk-list-row-sub">${i.due_date ? "due " + fmtDate(i.due_date) : "—"}</div>
        </div>
        ${badge(i.status)}
        <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;width:80px;text-align:right">${usd(i.amount)}</div>
      </div>`).join("")}
      </div>`}
  </div>

  <div class="desk-rail narrow">
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">History</div>
    ${history.length === 0
      ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:22px">nothing recorded yet.</div>`
      : `<div style="margin-bottom:22px">${history.map(e => `
    <div class="desk-timeline-item">
      <div class="desk-timeline-rail"><div class="desk-timeline-dot" style="background:var(--border-2)"></div><div class="desk-timeline-line"></div></div>
      <div class="desk-timeline-body">
        <div style="font-size:12px;color:var(--text)">${e.label}</div>
        <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);margin-top:2px">${fmtDate(e.date)}</div>
      </div>
    </div>`).join("")}</div>`}

    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Notes</div>
    <div class="card" style="cursor:pointer" onclick="openClientModal('${c.id}')">
      ${c.notes ? `<div style="font-size:12.5px;color:var(--text);line-height:1.6;white-space:pre-wrap">${c.notes}</div>` : `<div style="font-size:12.5px;color:var(--text-muted)">click to add notes.</div>`}
    </div>
  </div>
</div>`;
}
