// ============================================================
//  Freelancer — client/pages/projects.js
//  Projects list + Project File (with connection credentials)
// ============================================================

// ── Projects List ─────────────────────────────────────────────
function projectsListHTML() {
  const { projects } = STATE.data;
  // Default to Active — the list you almost always want on open
  const filter   = window._projFilter || "Active";
  const filtered = filter === "All" ? projects : projects.filter(p => p.status === filter);

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Projects</div>
    <div class="page-sub">${projects.length} project${projects.length !== 1 ? "s" : ""} — click any card to open its file</div>
  </div>
  <div class="btn-row">
    <div style="position:relative;min-width:220px">
      <input id="project-search" placeholder="search projects…"
        style="padding-left:32px;width:100%"
        oninput="renderProjectSearch(this.value)"
        onkeydown="if(event.key==='Escape'){this.value='';renderProjectSearch('')}"/>
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                   color:var(--text-muted);font-size:14px;pointer-events:none">⌕</span>
    </div>
    <button class="btn btn-primary" onclick="openProjectModal(null)">+ New Project</button>
  </div>
</div>

<div class="filter-row">
  ${["All","Lead","Active","Review","Complete","Cancelled"].map(s =>
    `<button class="filter-btn${filter === s ? " active" : ""}" onclick="setProjFilter('${s}')">${s}</button>`
  ).join("")}
</div>

${filtered.length === 0
  ? `<div class="empty">
      <div class="empty-icon">📁</div>
      <div class="empty-text">${filter === "All" ? "No projects yet." : "No " + filter + " projects."}</div>
      ${filter === "All" ? `<button class="btn btn-primary" onclick="openProjectModal(null)">+ New Project</button>` : ""}
    </div>`
  : `<div class="projects-grid">
      ${filtered.map(p => {
        const col   = STATUS_COLORS[p.status] || "var(--text-muted)";
        return `
<div class="project-card" onclick='openProject(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
    <div style="min-width:0">
      <div class="card-label">${p.client_name || "No client"}</div>
      <div class="project-card-name">${p.name}</div>
    </div>
    ${badge(p.status)}
  </div>
  ${p.description ? `<div class="project-card-desc clamp-2">${p.description}</div>` : ""}

  <div class="project-card-foot">
    ${p.deadline ? `<span>${fmtDate(p.deadline)}</span>` : ""}
    ${p.budget   ? `<span>${usd(p.budget)}</span>` : ""}
  </div>
</div>`;
      }).join("")}
    </div>`}`;
}

window.setProjFilter = function(f) { window._projFilter = f; render(); };

// ── Project File ──────────────────────────────────────────────
function projectFileHTML(p) {
  const client = STATE.data.clients.find(c => c.id === p.client_id);
  const col    = STATUS_COLORS[p.status] || "#64748b";

  return `
<div class="breadcrumb">
  <span class="breadcrumb-link" onclick="navigate('projects')">Projects</span>
  <span style="color:#2a3048">/</span>
  <span style="color:var(--text)">${p.name}</span>
</div>

<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px">
  <div>
    <div style="height:3px;width:48px;background:${col};border-radius:2px;margin-bottom:10px"></div>
    <div class="page-title">${p.name}</div>
    <div class="pf-meta">
      ${badge(p.status)}
      ${client  ? `<span style="font-size:12px;color:var(--text-muted)">👥 ${client.name}</span>`     : ""}
      ${p.deadline ? `<span style="font-size:12px;color:var(--text-muted)">📅 ${fmtDate(p.deadline)}</span>` : ""}
      ${p.budget   ? `<span style="font-size:12px;color:var(--text-muted)">💰 ${usd(p.budget)}</span>`       : ""}
    </div>
  </div>
  <div class="btn-row">
    <button class="btn btn-ghost btn-sm" onclick="openProjectModal('${p.id}')">Edit</button>
    <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">Delete</button>
  </div>
</div>


<div class="pf-body">
  <div class="pf-block">
    <div class="pf-block-label">Description</div>
    ${p.description
      ? `<div class="pf-block-val">${p.description}</div>`
      : `<div class="pf-block-empty">No description added.</div>`}
  </div>
  <div class="pf-block">
    <div class="pf-block-label">Details</div>
    ${[
      { label: "Client",   val: client?.name || p.client_name || "—" },
      { label: "Status",   val: p.status },
      { label: "Deadline", val: fmtDate(p.deadline) },
      { label: "Budget",   val: p.budget ? usd(p.budget) : "—" },
    ].map(r => `
    <div class="pf-detail-row">
      <span style="color:var(--text-muted)">${r.label}</span>
      <span style="color:var(--text);font-weight:500">${r.val}</span>
    </div>`).join("")}
  </div>
  <div class="pf-block pf-full">
    <div class="pf-block-label">File Links &amp; Notes</div>
    ${p.files_notes
      ? `<div class="pf-block-val" style="font-family:monospace;font-size:13px">${p.files_notes}</div>`
      : `<div class="pf-block-empty">No files or links yet. Edit to paste Google Drive, Dropbox, or Figma links.</div>`}
  </div>
</div>

${typeof timeCardHTML === "function" ? timeCardHTML(p) : ""}

<div class="card" style="margin-top:16px;padding:0;overflow:visible">
  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="section-title">tasks</div>
      <span id="todo-count-${p.id}" style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)">
        ${_projectTodos(p.id).filter(t=>!t.completed).length} remaining
      </span>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost btn-sm" onclick="openAddSectionModal('${p.id}')" style="font-size:10px">+ section</button>
      <button class="btn btn-primary btn-sm" onclick="openTodoInput('${p.id}',null)" style="font-size:11px">+ task</button>
    </div>
  </div>

  <!-- Column headers -->
  <div class="todo-row todo-head" style="display:grid;grid-template-columns:1fr 110px 110px 60px 90px;gap:0;padding:6px 20px;background:var(--bg);border-bottom:1px solid var(--border)">
    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Task</div>
    <div class="todo-col-assignee" style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Assignee</div>
    <div class="todo-col-due" style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Due Date</div>
    <div class="todo-col-priority" style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Priority</div>
    <div></div>
  </div>

  <!-- Inline add row (hidden) — at TOP so new tasks appear above existing ones -->
  <div id="todo-input-${p.id}" style="display:none;padding:10px 20px;background:var(--bg);border-bottom:1px solid var(--border)">
    <div class="todo-add-row" style="display:grid;grid-template-columns:1fr 110px 110px 80px auto;gap:8px;align-items:center">
      <input id="todo-text-${p.id}" placeholder="Task name…" style="font-size:13px"
        onkeydown="if(event.key==='Enter')saveTodo('${p.id}',null);if(event.key==='Escape')closeTodoInput('${p.id}')"/>
      <input id="todo-assignee-${p.id}" placeholder="Name" style="font-size:11px"/>
      <input id="todo-due-${p.id}" type="date" style="font-size:11px"/>
      <select id="todo-pri-${p.id}" style="font-size:11px;padding:7px 4px">
        <option value="normal">normal</option>
        <option value="high">! high</option>
        <option value="low">low</option>
      </select>
      <div class="btn-row">
        <button class="btn btn-primary btn-sm" onclick="saveTodo('${p.id}',document.getElementById('todo-section-${p.id}')?.value||null)" style="font-size:10px">add</button>
        <button class="btn btn-ghost btn-sm" onclick="closeTodoInput('${p.id}')" style="font-size:10px">×</button>
      </div>
    </div>
    <input type="hidden" id="todo-section-${p.id}"/>
  </div>

  <!-- Task list -->
  <div id="todo-list-${p.id}">
    ${_todoListHTML(p.id)}
  </div>
</div>`;
}


window.openProjectModal = function(id) {
  const p = id ? STATE.data.projects.find(x => x.id === id) : null;
  const { clients } = STATE.data;
  showModal(`
<div class="modal-header">
  <div class="modal-title">${p ? "Edit Project" : "New Project"}</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-group"><label class="form-label">Project Name *</label>
  <input id="p-name" value="${p?.name || ""}" placeholder="Website Redesign"/>
</div>
<div class="form-row">
  <div class="form-group"><label class="form-label">Client</label>
    <select id="p-client">
      <option value="">— None —</option>
      ${clients.map(c => `<option value="${c.id}"${p?.client_id === c.id ? " selected" : ""}>${c.name}</option>`).join("")}
    </select>
  </div>
  <div class="form-group"><label class="form-label">Status</label>
    <select id="p-status">
      ${["Lead","Active","Review","Complete","Cancelled"].map(s => `<option${p?.status === s ? " selected" : ""}>${s}</option>`).join("")}
    </select>
  </div>
</div>
<div class="form-row">
  <div class="form-group"><label class="form-label">Deadline</label>
    <input id="p-deadline" type="date" value="${p?.deadline || ""}"/>
  </div>
  <div class="form-group"><label class="form-label">Hourly Rate ($)</label>
    <input id="p-rate" type="number" step="1" min="0" value="${p?.hourly_rate ?? ""}"
      placeholder="${STATE.data.user_settings?.default_hourly_rate || "e.g. 85"}"/>
  </div>
  <div class="form-group"><label class="form-label">Budget ($)</label>
    <input id="p-budget" type="number" value="${p?.budget || ""}" placeholder="0.00"/>
  </div>
</div>
<div class="form-group"><label class="form-label">Description</label>
  <textarea id="p-desc" rows="2" placeholder="What's this project about?">${p?.description || ""}</textarea>
</div>
<div class="form-group"><label class="form-label">File Links / Notes</label>
  <textarea id="p-files" rows="2" placeholder="Google Drive, Dropbox, Figma links…">${p?.files_notes || ""}</textarea>
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
  <button class="btn btn-primary" id="p-save-btn" onclick="saveProject('${id || ""}')">
    ${p ? "Save Changes" : "Create Project"}
  </button>
</div>`);
};

window.saveProject = async function(id) {
  const clId = document.getElementById("p-client").value;
  const cl   = STATE.data.clients.find(c => c.id === clId);
  const body = {
    name:        document.getElementById("p-name").value.trim(),
    client_id:   clId,
    client_name: cl ? cl.name : "",
    status:      document.getElementById("p-status").value,
    deadline:    document.getElementById("p-deadline").value,
    budget:      document.getElementById("p-budget").value,
    description: document.getElementById("p-desc").value.trim(),
    files_notes: document.getElementById("p-files").value.trim(),
  };
  if (!body.name) return;
  const btn = document.getElementById("p-save-btn");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    if (id) await db.update("projects", id, body);
    else     await db.insert("projects", body);
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); btn.disabled = false; btn.textContent = "Save"; }
};

window.deleteProject = async function(id) {
  if (!confirm("Delete this project?")) return;
  await db.delete("projects", id);
  STATE.openProject = null; STATE.page = "projects";
  loadAll();
};

window.renderProjectSearch = function(q) {
  const term     = (q || "").toLowerCase();
  const all      = STATE.data.projects || [];
  const filtered = !term ? all : all.filter(p =>
    p.name?.toLowerCase().includes(term) ||
    p.client_name?.toLowerCase().includes(term) ||
    p.description?.toLowerCase().includes(term) ||
    p.status?.toLowerCase().includes(term)
  );
  const container = document.querySelector(".projects-grid");
  if (!container) return;
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <div class="empty-text">no projects match "${q}"</div>
    </div>`;
    return;
  }
  container.innerHTML = filtered.map(p => {
    const col = STATUS_COLORS[p.status] || "var(--text-muted)";
    return `
<div class="project-card" onclick='openProject(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
    <div style="min-width:0">
      <div class="card-label">${p.client_name || "No client"}</div>
      <div class="project-card-name">${p.name}</div>
    </div>
    ${badge(p.status)}
  </div>
  ${p.description ? `<div class="project-card-desc clamp-2">${p.description}</div>` : ""}
  ${(p.deadline || p.budget) ? `
  <div class="project-card-foot">
    ${p.deadline ? `<span>${fmtDate(p.deadline)}</span>` : ""}
    ${p.budget   ? `<span>${usd(p.budget)}</span>`      : ""}
  </div>` : ""}
</div>`;
  }).join("");
};

window.projectsListHTML = projectsListHTML;
// ── Todo helpers ──────────────────────────────────────────────
function _projectTodos(pid) {
  return (STATE.data.project_todos || [])
    .filter(t => t.project_id === pid)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function _projectSections(pid) {
  return (STATE.data.project_todo_sections || [])
    .filter(s => s.project_id === pid)
    .sort((a, b) => a.sort_order - b.sort_order);
}

const PRI_COLOR = { high: "var(--danger)", normal: "var(--text-muted)", low: "var(--border-2)" };
const PRI_DOT   = { high: "●", normal: "◆", low: "○" };

function _todoRow(t, pid) {
  const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !t.completed;
  return `
<div class="todo-row" style="display:grid;grid-template-columns:1fr 110px 110px 60px 90px;gap:0;
  padding:8px 20px;border-bottom:1px solid var(--border);
  opacity:${t.completed ? ".45" : "1"};
  background:${t.completed ? "color-mix(in srgb,var(--bg) 60%,transparent)" : "transparent"};
  transition:background .12s"
  id="todo-row-${t.id}"
  onmouseover="this.style.background='color-mix(in srgb,var(--accent) 4%,transparent)'"
  onmouseout="this.style.background='${t.completed ? "color-mix(in srgb,var(--bg) 60%,transparent)" : "transparent"}'">

  <!-- Checkbox + title -->
  <div style="display:flex;align-items:center;gap:10px;min-width:0">
    <button onclick="toggleTodo('${t.id}',${t.completed})"
      style="width:16px;height:16px;flex-shrink:0;border-radius:8px;
             border:1.5px solid ${t.completed ? "var(--accent)" : "var(--border-2)"};
             background:${t.completed ? "var(--accent)" : "transparent"};
             cursor:pointer;display:flex;align-items:center;justify-content:center;
             font-size:9px;font-weight:900;color:var(--accent-fg);transition:all .12s">
      ${t.completed ? "✓" : ""}
    </button>
    <div style="min-width:0">
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;
        color:var(--text);${t.completed ? "text-decoration:line-through" : ""};
        white-space:normal;word-break:break-word;line-height:1.4">${t.title}</div>
      ${t.notes ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:3px;white-space:normal;word-break:break-word;line-height:1.4">${t.notes}</div>` : ""}
    </div>
  </div>

  <!-- Assignee -->
  <div class="todo-col-assignee" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);
    display:flex;align-items:center;padding-right:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
    ${t.assignee ? `<span style="background:var(--accent-l,color-mix(in srgb,var(--accent) 15%,transparent));color:var(--accent);padding:2px 6px;border-radius:8px;font-size:10px">${t.assignee}</span>` : `<span style="color:var(--border-2)">—</span>`}
  </div>

  <!-- Due date -->
  <div class="todo-col-due" style="font-family:'JetBrains Mono',monospace;font-size:11px;
    color:${isOverdue ? "var(--danger)" : "var(--text-muted)"};
    display:flex;align-items:center">
    ${t.due_date ? fmtDate(t.due_date) : `<span style="color:var(--border-2)">—</span>`}
  </div>

  <!-- Priority -->
  <div class="todo-col-priority" style="display:flex;align-items:center">
    <span style="font-size:10px;color:${PRI_COLOR[t.priority] || "var(--text-muted)"}" title="${t.priority}">
      ${PRI_DOT[t.priority] || "◆"}
    </span>
  </div>

  <!-- Actions — always visible -->
  <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
    <button onclick="editTodo('${t.id}')"
      style="background:none;border:1px solid var(--border);border-radius:8px;
             color:var(--text-muted);font-size:11px;cursor:pointer;padding:2px 6px;
             font-family:'JetBrains Mono',monospace;line-height:1.4;transition:all .12s"
      onmouseover="this.style.color='var(--accent)';this.style.borderColor='var(--accent)'"
      onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'"
      title="edit task">edit</button>
    <button onclick="deleteTodo('${t.id}')"
      style="background:none;border:1px solid var(--border);border-radius:8px;
             color:var(--text-muted);font-size:12px;cursor:pointer;padding:2px 5px;
             line-height:1.4;transition:all .12s"
      onmouseover="this.style.color='var(--danger)';this.style.borderColor='var(--danger)'"
      onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'"
      title="delete task">×</button>
  </div>
</div>`;
}

function _todoListHTML(pid) {
  const todos    = _projectTodos(pid);
  const sections = _projectSections(pid);
  const collapsed = window._collapsedSections || {};

  let html = "";

  if (sections.length === 0) {
    // Flat list — no sections
    const open   = todos.filter(t => !t.completed && !t.section_id);
    const closed = todos.filter(t =>  t.completed && !t.section_id);

    if (open.length === 0 && closed.length === 0) {
      return `<div style="padding:20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);text-align:center">
        no tasks yet — hit + task to add one, or + section to organize into phases.
      </div>`;
    }

    html += open.map(t => _todoRow(t, pid)).join("");
    if (closed.length > 0) {
      html += `<div style="padding:8px 20px;font-family:'JetBrains Mono',monospace;font-size:9px;
        color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid var(--border);
        background:var(--bg)">completed (${closed.length})</div>`;
      html += closed.map(t => _todoRow(t, pid)).join("");
    }
    return html;
  }

  // Sectioned layout
  sections.forEach(sec => {
    const secTodos  = todos.filter(t => t.section_id === sec.id && !t.completed);
    const secDone   = todos.filter(t => t.section_id === sec.id &&  t.completed);
    const isCollapsed = collapsed[sec.id];
    const total     = secTodos.length + secDone.length;

    html += `
    <div style="border-bottom:1px solid var(--border)">
      <!-- Section header -->
      <div style="display:flex;align-items:center;gap:8px;padding:8px 20px;
        background:var(--bg);cursor:pointer;user-select:none"
        onclick="toggleSection('${sec.id}')">
        <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);
          transition:transform .15s;display:inline-block;transform:rotate(${isCollapsed ? "-90deg" : "0deg"})">▾</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--text)">${sec.title}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)">${secDone.length}/${total}</span>
        <div style="flex:1"></div>
        <button onclick="event.stopPropagation();openTodoInput('${pid}','${sec.id}')"
          style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);
          background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:8px"
          onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-muted)'">+ task</button>
        <button onclick="event.stopPropagation();deleteSection('${sec.id}')"
          style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--border-2);
          background:none;border:none;cursor:pointer;padding:2px 4px"
          onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--border-2)'"
          title="delete section">×</button>
      </div>
      ${isCollapsed ? "" : `
      ${secTodos.length === 0 && secDone.length === 0
        ? `<div style="padding:10px 20px 10px 48px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted)">no tasks in this section yet.</div>`
        : secTodos.map(t => _todoRow(t, pid)).join("") +
          (secDone.length > 0 ? `
          <div style="padding:6px 20px;font-family:'JetBrains Mono',monospace;font-size:9px;
            color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;background:var(--bg)">
            completed (${secDone.length})</div>` +
            secDone.map(t => _todoRow(t, pid)).join("") : "")}
      `}
    </div>`;
  });

  // Unsectioned tasks at bottom
  const unsectioned = todos.filter(t => !t.section_id && !t.completed);
  const unsectionedDone = todos.filter(t => !t.section_id && t.completed);
  if (unsectioned.length > 0 || unsectionedDone.length > 0) {
    html += `<div style="padding:8px 20px;font-family:'JetBrains Mono',monospace;font-size:9px;
      color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;background:var(--bg);
      border-bottom:1px solid var(--border)">no section</div>`;
    html += unsectioned.map(t => _todoRow(t, pid)).join("");
    html += unsectionedDone.map(t => _todoRow(t, pid)).join("");
  }

  return html;
}

function _refreshTodoList(pid) {
  if (!pid) return;
  const el = document.getElementById("todo-list-" + pid);
  if (el) el.innerHTML = _todoListHTML(pid);
  const remaining = _projectTodos(pid).filter(t => !t.completed).length;
  const countEl = document.getElementById("todo-count-" + pid);
  if (countEl) countEl.textContent = `${remaining} remaining`;
}

// ── Section actions ───────────────────────────────────────────
window.toggleSection = function(sectionId) {
  window._collapsedSections = window._collapsedSections || {};
  window._collapsedSections[sectionId] = !window._collapsedSections[sectionId];
  const pid = STATE.openProject?.id;
  _refreshTodoList(pid);
};

window.openAddSectionModal = function(pid) {
  showModal(`
<div class="modal-header">
  <div class="modal-title">new section</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-group">
  <label class="form-label">Section Name</label>
  <input id="sec-title" placeholder="Phase 1: Discovery" autofocus
    onkeydown="if(event.key==='Enter') saveSection('${pid}')"/>
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" onclick="saveSection('${pid}')">add section</button>
</div>`);
  setTimeout(() => document.getElementById("sec-title")?.focus(), 100);
};

window.saveSection = async function(pid) {
  const title = document.getElementById("sec-title")?.value.trim();
  if (!title) return;
  const existing = _projectSections(pid);
  try {
    await db.insert("project_todo_sections", {
      project_id: pid, title, sort_order: existing.length,
    });
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); }
};

window.deleteSection = async function(id) {
  if (!confirm("Delete this section? Tasks inside will move to unsectioned.")) return;
  await db.delete("project_todo_sections", id); loadAll();
};

// ── Task input ────────────────────────────────────────────────
window.openTodoInput = function(pid, sectionId) {
  const wrap = document.getElementById("todo-input-" + pid);
  const secInput = document.getElementById("todo-section-" + pid);
  if (!wrap) return;
  wrap.style.display = "block";
  if (secInput) secInput.value = sectionId || "";
  setTimeout(() => document.getElementById("todo-text-" + pid)?.focus(), 50);
};

window.closeTodoInput = function(pid) {
  const wrap = document.getElementById("todo-input-" + pid);
  if (wrap) wrap.style.display = "none";
  ["todo-text-","todo-assignee-","todo-due-"].forEach(p => {
    const el = document.getElementById(p + pid);
    if (el) el.value = "";
  });
};

window.saveTodo = async function(pid, sectionId) {
  const title    = document.getElementById("todo-text-" + pid)?.value.trim();
  const assignee = document.getElementById("todo-assignee-" + pid)?.value.trim();
  const due      = document.getElementById("todo-due-" + pid)?.value;
  const priority = document.getElementById("todo-pri-" + pid)?.value || "normal";
  const secId    = sectionId || document.getElementById("todo-section-" + pid)?.value || null;
  if (!title) return;
  const todos = _projectTodos(pid);
  try {
    await db.insert("project_todos", {
      project_id: pid, title, assignee: assignee || null,
      priority, due_date: due || null,
      section_id: secId || null,
      sort_order: -Date.now(), completed: false, // negative timestamp = always sorts to top
    });
    await loadAll(); closeTodoInput(pid);
  } catch(e) { alert(e.message); }
};

window.toggleTodo = async function(id, currentlyDone) {
  try {
    await db.update("project_todos", id, {
      completed: !currentlyDone,
      completed_at: !currentlyDone ? new Date().toISOString() : null,
    });
    const todo = (STATE.data.project_todos || []).find(t => t.id === id);
    if (todo) { todo.completed = !currentlyDone; }
    _refreshTodoList(STATE.openProject?.id);
  } catch(e) { console.error(e); }
};

window.editTodo = function(id) {
  const t = (STATE.data.project_todos || []).find(x => x.id === id);
  if (!t) return;
  showModal(`
<div class="modal-header">
  <div class="modal-title">edit task</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-group">
  <label class="form-label">Task</label>
  <input id="todo-edit-title" value="${t.title.replace(/"/g,"&quot;")}"/>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Assignee</label>
    <input id="todo-edit-assignee" value="${t.assignee || ""}" placeholder="Name"/>
  </div>
  <div class="form-group">
    <label class="form-label">Priority</label>
    <select id="todo-edit-pri">
      <option value="low"${t.priority==="low"?" selected":""}>low</option>
      <option value="normal"${t.priority==="normal"?" selected":""}>normal</option>
      <option value="high"${t.priority==="high"?" selected":""}>! high</option>
    </select>
  </div>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Due Date</label>
    <input id="todo-edit-due" type="date" value="${t.due_date || ""}"/>
  </div>
</div>
<div class="form-group">
  <label class="form-label">Notes</label>
  <input id="todo-edit-notes" value="${t.notes || ""}" placeholder="Additional context…"/>
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" onclick="updateTodo('${t.id}')">save</button>
</div>`);
};

window.updateTodo = async function(id) {
  const body = {
    title:    document.getElementById("todo-edit-title")?.value.trim(),
    assignee: document.getElementById("todo-edit-assignee")?.value.trim() || null,
    priority: document.getElementById("todo-edit-pri")?.value,
    due_date: document.getElementById("todo-edit-due")?.value || null,
    notes:    document.getElementById("todo-edit-notes")?.value.trim() || null,
  };
  if (!body.title) return;
  try {
    await db.update("project_todos", id, body);
    closeModal(); await loadAll();
  } catch(e) { alert(e.message); }
};

window.deleteTodo = async function(id) {
  if (!confirm("Delete this task?")) return;
  try {
    await db.delete("project_todos", id);
    // Optimistic update in state
    if (STATE.data.project_todos) {
      STATE.data.project_todos = STATE.data.project_todos.filter(t => t.id !== id);
    }
    // Try fast DOM refresh first, fall back to full reload
    const pid = STATE.openProject?.id;
    if (pid) {
      _refreshTodoList(pid);
    } else {
      await loadAll();
    }
  } catch(e) {
    console.error("deleteTodo error:", e);
    alert(e.message);
  }
};


window.projectFileHTML  = projectFileHTML;
