// ============================================================
//  Freelancer — client/js/time-tracking.js
//  Timer + time entry management.
//  Lives inside Projects; no top-level nav entry.
//
//  A running entry has ended_at = null.  A unique partial index
//  in Postgres guarantees only one runs per user at a time.
// ============================================================

// ── Helpers ───────────────────────────────────────────────────
window.runningEntry = function() {
  return (STATE.data.time_entries || []).find(t => !t.ended_at) || null;
};

window.entryMinutes = function(t) {
  if (t.duration_min != null) return t.duration_min;
  const pausedSec = Number(t.paused_total_sec) || 0;
  // Currently paused — freeze the clock at the moment pause began, minus
  // whatever had already been paused in earlier pause/resume cycles.
  const end = t.ended_at ? new Date(t.ended_at) : (t.paused_at ? new Date(t.paused_at) : new Date());
  const rawMs = end - new Date(t.started_at);
  return Math.max(0, Math.round(rawMs / 60000 - pausedSec / 60));
};

window.isEntryPaused = function(t) { return !!(t && t.paused_at && !t.ended_at); };

window.fmtDur = function(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

window.projectRate = function(projectId) {
  const p = (STATE.data.projects || []).find(x => x.id === projectId);
  return Number(p?.hourly_rate)
      || Number(STATE.data.user_settings?.default_hourly_rate)
      || 0;
};

window.entryValue = function(t) {
  return (entryMinutes(t) / 60) * Number(t.hourly_rate || 0);
};

window.projectEntries = function(projectId) {
  return (STATE.data.time_entries || [])
    .filter(t => t.project_id === projectId)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
};

window.unbilledEntries = function(projectId) {
  return projectEntries(projectId).filter(t => t.billable && !t.invoiced && t.ended_at);
};

// ── Timer control ─────────────────────────────────────────────
let _tickHandle = null;

window.startTimer = async function(projectId, description) {
  const running = runningEntry();
  if (running) {
    // Roll the existing timer over rather than silently discarding it
    if (!confirm("A timer is already running. Stop it and start this one?")) return;
    await stopTimer(true);
  }
  const proj = (STATE.data.projects || []).find(p => p.id === projectId);
  try {
    await db.insert("time_entries", {
      project_id:  projectId,
      client_id:   proj?.client_id || null,
      description: description || null,
      started_at:  new Date().toISOString(),
      hourly_rate: projectRate(projectId),
      billable:    true,
      invoiced:    false,
    });
    await loadAll();
    _startTick();
  } catch (e) { alert(e.message); }
};

window.stopTimer = async function(silent) {
  const t = runningEntry();
  if (!t) return;
  const mins = entryMinutes(t);
  try {
    await db.update("time_entries", t.id, {
      ended_at:     new Date().toISOString(),
      duration_min: mins,
      paused_at:    null,
    });
    _stopTick();
    if (!silent) await loadAll();
  } catch (e) { alert(e.message); }
};

// ── Pause / resume ──────────────────────────────────────────────
// paused_at marks the moment the current pause began; paused_total_sec
// accumulates every prior pause span for this entry so entryMinutes()
// can subtract paused time from the elapsed clock.
window.pauseTimer = async function(id) {
  const t = (STATE.data.time_entries || []).find(x => x.id === id);
  if (!t || t.ended_at || t.paused_at) return;
  try {
    await db.update("time_entries", id, { paused_at: new Date().toISOString() });
    await loadAll();
  } catch (e) { alert(e.message); }
};

window.resumeTimer = async function(id) {
  const t = (STATE.data.time_entries || []).find(x => x.id === id);
  if (!t || t.ended_at || !t.paused_at) return;
  try {
    const addedSec = Math.max(0, Math.round((new Date() - new Date(t.paused_at)) / 1000));
    await db.update("time_entries", id, {
      paused_at:        null,
      paused_total_sec: (Number(t.paused_total_sec) || 0) + addedSec,
    });
    await loadAll();
  } catch (e) { alert(e.message); }
};

// Live-update the running clock without re-rendering the page
function _startTick() {
  _stopTick();
  _tickHandle = setInterval(() => {
    const t = runningEntry();
    if (!t) return _stopTick();
    document.querySelectorAll("[data-timer-clock]").forEach(el => {
      el.textContent = fmtDur(entryMinutes(t));
    });
  }, 1000);
}
function _stopTick() {
  if (_tickHandle) clearInterval(_tickHandle);
  _tickHandle = null;
}
window.initTimerTick = function() { if (runningEntry()) _startTick(); };

// ── Manual entry ──────────────────────────────────────────────
window.openTimeModal = function(projectId, entryId) {
  const t    = entryId ? (STATE.data.time_entries || []).find(x => x.id === entryId) : null;
  const proj = (STATE.data.projects || []).find(p => p.id === projectId);
  const mins = t ? entryMinutes(t) : 0;

  showModal(`
<div class="modal-header">
  <div class="modal-title">${t ? "edit" : "log"} time</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-group">
  <label class="form-label">Project</label>
  <input value="${proj?.name || ""}" disabled style="opacity:.65"/>
</div>
<div class="form-group">
  <label class="form-label">What did you work on?</label>
  <input id="te-desc" value="${(t?.description || "").replace(/"/g, "&quot;")}"
    placeholder="Homepage build, client call…"/>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Date</label>
    <input id="te-date" type="date"
      value="${(t?.started_at || new Date().toISOString()).slice(0, 10)}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Hours</label>
    <input id="te-hours" type="number" step="0.25" min="0"
      value="${t ? (mins / 60).toFixed(2) : ""}" placeholder="1.５"/>
  </div>
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">Rate ($/hr)</label>
    <input id="te-rate" type="number" step="1" min="0"
      value="${t?.hourly_rate ?? projectRate(projectId)}"/>
  </div>
  <div class="form-group">
    <label class="form-label">Billable</label>
    <select id="te-billable">
      <option value="1"${t?.billable !== false ? " selected" : ""}>Yes — bill this</option>
      <option value="0"${t?.billable === false ? " selected" : ""}>No — internal</option>
    </select>
  </div>
</div>
${t?.invoiced ? `
<div style="padding:10px 12px;border-radius:var(--radius-sm);
  background:color-mix(in srgb,var(--accent) 10%,transparent);
  border:1px solid color-mix(in srgb,var(--accent) 28%,transparent);
  font-family:var(--font-mono);font-size:11px;color:var(--accent)">
  Already invoiced — edits won't change the invoice.
</div>` : ""}
<div class="modal-actions">
  ${t ? `<button class="btn btn-danger" onclick="deleteTimeEntry('${t.id}')">delete</button>` : ""}
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" onclick="saveTimeEntry('${projectId}','${t?.id || ""}')">save</button>
</div>`);
};

window.saveTimeEntry = async function(projectId, entryId) {
  const desc  = document.getElementById("te-desc")?.value.trim();
  const date  = document.getElementById("te-date")?.value;
  const hours = parseFloat(document.getElementById("te-hours")?.value);
  const rate  = parseFloat(document.getElementById("te-rate")?.value) || 0;
  const bill  = document.getElementById("te-billable")?.value === "1";

  if (!hours || hours <= 0) return alert("Enter the hours worked.");
  if (!date) return alert("Pick a date.");

  const mins    = Math.round(hours * 60);
  const started = new Date(date + "T09:00:00");
  const ended   = new Date(started.getTime() + mins * 60000);
  const proj    = (STATE.data.projects || []).find(p => p.id === projectId);

  const body = {
    project_id:   projectId,
    client_id:    proj?.client_id || null,
    description:  desc || null,
    started_at:   started.toISOString(),
    ended_at:     ended.toISOString(),
    duration_min: mins,
    hourly_rate:  rate,
    billable:     bill,
  };

  try {
    if (entryId) await db.update("time_entries", entryId, body);
    else         await db.insert("time_entries", body);
    closeModal();
    await loadAll();
  } catch (e) { alert(e.message); }
};

window.deleteTimeEntry = async function(id) {
  if (!confirm("Delete this time entry?")) return;
  try {
    await db.delete("time_entries", id);
    closeModal();
    await loadAll();
  } catch (e) { alert(e.message); }
};

// ============================================================
//  UI — rendered inside the project file
// ============================================================
window.timeCardHTML = function(p) {
  const entries  = projectEntries(p.id);
  const running  = runningEntry();
  const isThis   = running && running.project_id === p.id;
  const unbilled = unbilledEntries(p.id);

  const totalMin   = entries.filter(t => t.ended_at).reduce((a, t) => a + entryMinutes(t), 0);
  const unbilledVal = unbilled.reduce((a, t) => a + entryValue(t), 0);
  const budget      = Number(p.budget) || 0;
  const rate        = projectRate(p.id);
  const budgetHrs   = rate ? budget / rate : 0;
  const usedPct     = budgetHrs ? Math.min(100, (totalMin / 60 / budgetHrs) * 100) : 0;
  const over        = budgetHrs && (totalMin / 60) > budgetHrs;

  return `
<div class="card" style="margin-top:16px;padding:0;overflow:hidden">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;
    padding:16px 20px;border-bottom:1px solid var(--border);flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="section-title">time</div>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">
        ${fmtDur(totalMin)} logged${unbilled.length ? ` · ${usd(unbilledVal)} unbilled` : ""}
      </span>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost btn-sm" onclick="openTimeModal('${p.id}')"
        style="font-size:11px">+ log time</button>
      ${isThis
        ? `${isEntryPaused(running)
            ? `<button class="btn btn-primary btn-sm" onclick="resumeTimer('${running.id}')" style="font-size:11px">▶ resume</button>`
            : `<button class="btn btn-ghost btn-sm" onclick="pauseTimer('${running.id}')" style="font-size:11px">⏸ pause</button>`}
           <button class="btn btn-danger btn-sm" onclick="stopTimer()" style="font-size:11px">■ stop</button>`
        : `<button class="btn btn-primary btn-sm" onclick="startTimer('${p.id}')" style="font-size:11px">▶ start</button>`}
    </div>
  </div>

  <!-- Running banner -->
  ${isThis ? `
  <div style="display:flex;align-items:center;gap:10px;padding:12px 20px;
    background:color-mix(in srgb,${isEntryPaused(running) ? "var(--warning)" : "var(--accent)"} 10%,transparent);
    border-bottom:1px solid color-mix(in srgb,${isEntryPaused(running) ? "var(--warning)" : "var(--accent)"} 25%,transparent)">
    <span style="width:8px;height:8px;border-radius:50%;background:${isEntryPaused(running) ? "var(--warning)" : "var(--accent)"};
      ${isEntryPaused(running) ? "" : "animation:fhpulse 1.6s ease-in-out infinite"};flex-shrink:0"></span>
    <span style="font-family:var(--font-mono);font-size:15px;font-weight:700;
      color:${isEntryPaused(running) ? "var(--warning)" : "var(--accent)"}" data-timer-clock>${fmtDur(entryMinutes(running))}</span>
    <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);
      flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
      ${isEntryPaused(running) ? "paused — " : ""}${running.description || "running…"}
    </span>
  </div>` : ""}

  <!-- Budget burn -->
  ${budgetHrs ? `
  <div style="padding:12px 20px;border-bottom:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;
      font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">
      <span>${(totalMin / 60).toFixed(1)}h of ${budgetHrs.toFixed(1)}h budgeted</span>
      <span style="color:${over ? "var(--danger)" : "var(--text-muted)"}">
        ${over ? "over budget" : `${Math.round(100 - usedPct)}% left`}
      </span>
    </div>
    <div style="height:5px;border-radius:3px;background:var(--border);overflow:hidden">
      <div style="height:100%;width:${usedPct}%;border-radius:3px;
        background:${over ? "var(--danger)" : "var(--accent)"};transition:width .3s"></div>
    </div>
  </div>` : ""}

  <!-- Unbilled → invoice -->
  ${unbilled.length ? `
  <div style="display:flex;align-items:center;gap:12px;padding:12px 20px;
    border-bottom:1px solid var(--border);flex-wrap:wrap">
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--text)">
        ${unbilled.length} unbilled ${unbilled.length === 1 ? "entry" : "entries"} · ${usd(unbilledVal)}
      </div>
      <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">
        ${fmtDur(unbilled.reduce((a, t) => a + entryMinutes(t), 0))} at ${usd(rate)}/hr
      </div>
    </div>
    <button class="btn btn-primary btn-sm" style="font-size:11px"
      onclick="invoiceUnbilled('${p.id}')">create invoice →</button>
  </div>` : ""}

  <!-- Entries -->
  <div>
    ${entries.length === 0
      ? `<div style="padding:18px 20px;font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">
           No time logged yet. Hit ▶ start, or + log time for past work.
         </div>`
      : entries.slice(0, 8).map(t => `
      <div class="time-row" onclick="openTimeModal('${p.id}','${t.id}')"
        style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;
          padding:10px 20px;border-bottom:1px solid var(--border);cursor:pointer">
        <div style="min-width:0">
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--text);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${t.description || "Untitled"}
          </div>
          <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);margin-top:2px">
            ${fmtDate(t.started_at)}
            ${!t.billable ? " · internal" : t.invoiced ? " · invoiced" : ""}
          </div>
        </div>
        <span style="font-family:var(--font-mono);font-size:12px;font-weight:700;
          color:var(--text);white-space:nowrap">${fmtDur(entryMinutes(t))}</span>
        <span style="font-family:var(--font-mono);font-size:11px;white-space:nowrap;
          color:${t.invoiced ? "var(--text-muted)" : t.billable ? "var(--accent)" : "var(--text-muted)"}">
          ${t.billable ? usd(entryValue(t)) : "—"}
        </span>
      </div>`).join("")
        + (entries.length > 8
            ? `<div style="padding:10px 20px;font-family:var(--font-mono);font-size:10px;
                 color:var(--text-muted)">+ ${entries.length - 8} more</div>`
            : "")}
  </div>
</div>`;
};

// ── Unbilled hours → draft invoice ────────────────────────────
window.invoiceUnbilled = async function(projectId) {
  const entries = unbilledEntries(projectId);
  if (!entries.length) return;

  const proj  = (STATE.data.projects || []).find(p => p.id === projectId);
  const mins  = entries.reduce((a, t) => a + entryMinutes(t), 0);
  const hours = mins / 60;
  const rate  = Number(entries[0].hourly_rate) || projectRate(projectId);
  const total = entries.reduce((a, t) => a + entryValue(t), 0);

  if (!confirm(`Create a draft invoice for ${fmtDur(mins)} (${usd(total)})?`)) return;

  try {
    // Next invoice number
    const nums = (STATE.data.invoices || [])
      .map(i => parseInt(String(i.invoice_number).replace(/\D/g, ""), 10))
      .filter(n => !isNaN(n));
    const next = `INV-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;

    const due = new Date();
    due.setDate(due.getDate() + 30);

    const created = await db.insert("invoices", {
      invoice_number: next,
      client_id:      proj?.client_id  || null,
      client_name:    proj?.client_name || null,
      project_id:     projectId,
      project_name:   proj?.name || null,
      amount:         Number(total.toFixed(2)),
      status:         "Draft",
      due_date:       due.toISOString().slice(0, 10),
    });
    const invId = Array.isArray(created) ? created[0]?.id : created?.id;
    if (!invId) throw new Error("Invoice was not created");

    // One line item summarising the hours.
    // `amount` is a generated column — the DB computes quantity × unit_price,
    // so it must not be sent.
    const lineItem = {
      invoice_id:  invId,
      description: `${proj?.name || "Project"} — ${hours.toFixed(2)} hrs`,
      quantity:    Number(hours.toFixed(2)),
      unit_price:  rate,
    };
    try {
      await db.insert("invoice_items", { ...lineItem, time_entry_ids: entries.map(t => t.id) });
    } catch (e) {
      // time_entry_ids only exists after migration 6 — retry without it
      await db.insert("invoice_items", lineItem);
    }

    // Mark the hours as invoiced so they can't be billed twice
    for (const t of entries) {
      await db.update("time_entries", t.id, { invoiced: true, invoice_id: invId });
    }

    await loadAll();
    navigate("invoices");
  } catch (e) {
    alert("Could not create invoice: " + e.message);
  }
};

// ============================================================
//  DESKTOP — Time
//  Standalone page (pinned in the sidebar). Running/paused timer,
//  this-week hours per project, and the full entry log — all from
//  real time_entries rows.
// ============================================================
function timeDesktopHTML() {
  const running  = runningEntry();
  const paused   = isEntryPaused(running);
  const entries  = STATE.data.time_entries || [];
  const projects = STATE.data.projects || [];

  const now       = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0,0,0,0);
  const thisWeek  = entries.filter(t => new Date(t.started_at) >= weekStart);
  const weekMin   = thisWeek.reduce((s,t)=>s + entryMinutes(t), 0);
  const weekVal   = thisWeek.filter(t=>t.billable).reduce((s,t)=>s + entryValue(t), 0);
  const unbilledAll = entries.filter(t => t.billable && !t.invoiced && t.ended_at);
  const unbilledVal  = unbilledAll.reduce((s,t)=>s + entryValue(t), 0);

  // Per-project rollup for the week
  const byProject = {};
  thisWeek.forEach(t => {
    if (!t.project_id) return;
    byProject[t.project_id] = (byProject[t.project_id] || 0) + entryMinutes(t);
  });
  const projectRows = Object.entries(byProject)
    .map(([pid, min]) => ({ p: projects.find(x=>x.id===pid), min }))
    .filter(r => r.p)
    .sort((a,b) => b.min - a.min);

  const recent = [...entries]
    .filter(t => t.ended_at || t === running)
    .sort((a,b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, 25);

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Time</div>
    <div class="page-sub">${fmtDur(weekMin)} logged this week · ${usd(unbilledVal)} unbilled</div>
  </div>
</div>

<div class="desk-shell">
  <div class="desk-col-main">
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">This week by project</div>
    ${projectRows.length === 0
      ? `<div class="empty" style="padding:28px;margin-bottom:26px"><div class="empty-text">no time logged this week.</div></div>`
      : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:26px">
      ${projectRows.map(r => `
      <div style="display:flex;align-items:center;gap:14px;padding:13px 16px;border-bottom:1px solid var(--border);cursor:pointer" onclick='openProject(${JSON.stringify(r.p).replace(/'/g,"&#39;")})'>
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:600;color:var(--text)">${r.p.name}</div>
          <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);margin-top:2px">${r.p.client_name || "—"}</div>
        </div>
        <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--text)">${fmtDur(r.min)}</div>
      </div>`).join("")}
      </div>`}

    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Recent entries</div>
    ${recent.length === 0
      ? `<div class="empty" style="padding:28px"><div class="empty-text">no time logged yet.</div></div>`
      : `<div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      ${recent.map(t => {
        const p = projects.find(x => x.id === t.project_id);
        const isRunning = t === running;
        return `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border);${isRunning ? "" : "cursor:pointer"}" ${isRunning ? "" : `onclick="openTimeModal('${t.project_id}','${t.id}')"`}>
        <div style="flex:1;min-width:0">
          <div style="font-size:12.5px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description || p?.name || "Untitled"}</div>
          <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);margin-top:2px">${p?.name || "—"} · ${fmtDate(t.started_at)}${!t.billable ? " · internal" : t.invoiced ? " · invoiced" : ""}</div>
        </div>
        ${isRunning ? `<span style="font-family:var(--font-mono);font-size:11px;color:${isEntryPaused(t)?'var(--warning)':'var(--money-pos)'}">${isEntryPaused(t)?'paused':'running'}</span>` : ""}
        <span style="font-family:var(--font-mono);font-size:12.5px;font-weight:700;color:var(--text)" ${isRunning ? "data-timer-clock" : ""}>${fmtDur(entryMinutes(t))}</span>
      </div>`;
      }).join("")}
      </div>`}
  </div>

  <div class="desk-rail narrow">
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Timer</div>
    ${running ? (() => {
      const proj = projects.find(p => p.id === running.project_id);
      return `
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="width:7px;height:7px;border-radius:999px;background:${paused?'var(--warning)':'var(--money-pos)'};${paused?'':'animation:fhpulse 1.8s ease-in-out infinite'}"></span>
        <span style="font-family:var(--font-mono);font-size:11px;color:${paused?'var(--warning)':'var(--money-pos)'}">${paused?'paused':'running'}</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;margin-bottom:6px" data-timer-clock>${fmtDur(entryMinutes(running))}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px;cursor:pointer" onclick='openProject(${JSON.stringify(proj||{}).replace(/'/g,"&#39;")})'>${running.description || proj?.name || "Untitled"}</div>
      <div style="display:flex;gap:8px">
        ${paused
          ? `<button class="btn btn-primary" style="flex:1" onclick="resumeTimer('${running.id}')">Resume</button>`
          : `<button class="btn btn-ghost" style="flex:1" onclick="pauseTimer('${running.id}')">Pause</button>`}
        <button class="btn btn-danger" style="flex:1" onclick="stopTimer()">Stop</button>
      </div>
    </div>`;
    })() : `
    <div class="card" style="margin-bottom:20px">
      <div class="card-sub" style="margin-bottom:10px">No timer running.</div>
      <button class="btn btn-primary" style="width:100%" onclick="navigate('projects')">Start from a project →</button>
    </div>`}

    <div class="desk-chip-row" style="margin-bottom:8px">
      <div class="desk-chip"><div class="desk-chip-label">This week</div><div class="desk-chip-val">${fmtDur(weekMin)}</div></div>
      <div class="desk-chip"><div class="desk-chip-label">Week value</div><div class="desk-chip-val" style="color:var(--money-pos)">${usd(weekVal)}</div></div>
    </div>
    <div class="desk-chip-row">
      <div class="desk-chip" style="flex:1 1 100%"><div class="desk-chip-label">Unbilled total</div><div class="desk-chip-val" style="color:var(--warning)">${usd(unbilledVal)}</div></div>
    </div>
  </div>
</div>`;
}
window.timeDesktopHTML = timeDesktopHTML;
