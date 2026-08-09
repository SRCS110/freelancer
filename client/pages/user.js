// ============================================================
//  Freelancer — client/pages/user.js
//  User settings — display name, timezone, tax rate, currency,
//  and per-project credential management (stored in DB).
// ============================================================

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "America/Honolulu", "America/Toronto", "America/Vancouver",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "Europe/Madrid", "Europe/Amsterdam", "Europe/Stockholm",
  "Europe/Moscow", "Asia/Dubai", "Asia/Kolkata", "Asia/Bangkok",
  "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai", "Asia/Seoul",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
  "Africa/Cairo", "Africa/Johannesburg", "America/Sao_Paulo",
  "America/Mexico_City", "America/Buenos_Aires",
];

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "BRL", label: "BRL — Brazilian Real" },
  { code: "MXN", label: "MXN — Mexican Peso" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "NZD", label: "NZD — New Zealand Dollar" },
];

function userSettingsHTML() {
  const s   = STATE.data.user_settings || {};
  const usr = STATE.user;

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Account & Settings</div>
    <div class="page-sub">Manage your profile, preferences, and project credentials</div>
  </div>
</div>

<div id="user-msg" style="display:none;margin-bottom:20px"></div>

<!-- ── Profile ─────────────────────────────────────────────── -->
<div class="card" style="margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border)">
    <span style="font-size:20px">◎</span>
    <div class="section-title" style="color:var(--accent)">Profile</div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label class="form-label">Display Name</label>
      <input id="us-display-name" value="${s.display_name || ""}" placeholder="Jane Smith"/>
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input value="${usr?.email || ""}" disabled style="opacity:.5;cursor:not-allowed"/>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">Business Name</label>
    <input id="us-business-name" value="${s.business_name || ""}" placeholder="Acme Freelance Co."/>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Used on invoice headers and exports.</div>
  </div>
</div>

<!-- ── Preferences ────────────────────────────────────────── -->
<div class="card" style="margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border)">
    <span style="font-size:20px">◳</span>
    <div class="section-title" style="color:var(--accent)">Preferences</div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label class="form-label">Currency</label>
      <select id="us-currency">
        ${CURRENCIES.map(c =>
          `<option value="${c.code}"${(s.currency || "USD") === c.code ? " selected" : ""}>${c.label}</option>`
        ).join("")}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tax Rate (%)</label>
      <input id="us-tax-rate" type="number" min="0" max="100" step="0.1"
        value="${s.tax_rate ?? 25}" placeholder="25"/>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Used for tax estimates on Dashboard and Finances.</div>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">Timezone</label>
      <select id="us-timezone">
        ${TIMEZONES.map(tz =>
          `<option${(s.timezone || "America/New_York") === tz ? " selected" : ""}>${tz}</option>`
        ).join("")}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Fiscal Year Start</label>
      <select id="us-fiscal-year">
        ${["January","February","March","April","May","June",
           "July","August","September","October","November","December"]
          .map((m, i) =>
            `<option value="${i + 1}"${(s.fiscal_year_start || 1) === (i + 1) ? " selected" : ""}>${m}</option>`
          ).join("")}
      </select>
    </div>
  </div>

  <div style="margin-top:8px">
    <button class="btn btn-primary" id="us-save-btn" onclick="saveUserSettings()">Save Settings</button>
  </div>
</div>

<!-- ── Security ───────────────────────────────────────────── -->
<div class="card" style="margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border)">
    <span style="font-size:20px">◆</span>
    <div class="section-title" style="color:var(--danger)">Security</div>
  </div>

  <!-- Credential PIN -->
  <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text)">Credential PIN</div>
      ${hasPinSet()
        ? `<span style="font-size:10px;color:var(--accent);font-weight:700;background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);padding:2px 8px;border-radius:3px;font-family:'JetBrains Mono',monospace">SET</span>`
        : `<span style="font-size:10px;color:var(--danger);font-weight:700;background:color-mix(in srgb,var(--danger) 10%,transparent);border:1px solid color-mix(in srgb,var(--danger) 30%,transparent);padding:2px 8px;border-radius:3px;font-family:'JetBrains Mono',monospace">NOT SET</span>`}
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.6">
      ${hasPinSet()
        ? "Required to view passwords and credentials. Session stays unlocked for 15 min after entry."
        : "Set a PIN to protect bookmark passwords and project credentials."}
    </div>
    <div class="btn-row">
      ${hasPinSet()
        ? `<button class="btn btn-ghost btn-sm" onclick="requirePin(()=>_showChangePinFlow())">change pin</button>
           <button class="btn btn-danger btn-sm" onclick="_showResetPinModal()">remove pin</button>
           ${pinSessionActive() ? `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent)">◆ session active</span>` : ""}`
        : `<button class="btn btn-primary btn-sm" onclick="requirePin(()=>{render()})">set up pin</button>`}
    </div>
  </div>

  <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border)">
    <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">Change Password</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);margin-bottom:12px">A reset link will be sent to <strong style="color:var(--text)">${usr?.email || ""}</strong></div>
    <button class="btn btn-ghost btn-sm" onclick="sendPasswordReset()">send reset email</button>
  </div>

  <div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">Sign Out</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);margin-bottom:12px">Clears your session tokens on this device.</div>
    <button class="btn btn-danger btn-sm" onclick="doSignOut()">sign out</button>
  </div>
</div>`;
}


// ── Save user settings ────────────────────────────────────────
window.saveUserSettings = async function() {
  const btn = document.getElementById("us-save-btn");
  const msg = document.getElementById("user-msg");
  btn.disabled = true; btn.textContent = "Saving…";

  try {
    const body = {
      display_name:       document.getElementById("us-display-name").value.trim(),
      business_name:      document.getElementById("us-business-name").value.trim(),
      currency:           document.getElementById("us-currency").value,
      tax_rate:           parseFloat(document.getElementById("us-tax-rate").value) || 25,
      timezone:           document.getElementById("us-timezone").value,
      fiscal_year_start:  parseInt(document.getElementById("us-fiscal-year").value),
      updated_at:         new Date().toISOString(),
    };

    const existing = STATE.data.user_settings;
    if (existing?.id) {
      await db.update("user_settings", existing.id, body);
    } else {
      await db.insert("user_settings", body);
    }

    msg.innerHTML = `<div class="msg-ok">settings saved.</div>`;
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 3000);
    await loadAll();
  } catch(e) {
    msg.innerHTML = `<div class="msg-error">${e.message}</div>`;
    msg.style.display = "block";
  }

  btn.disabled = false; btn.textContent = "Save Settings";
};

// ── Project credentials ───────────────────────────────────────



window._showChangePinFlow = function() {
  // After PIN verified, show create-PIN modal to set a new one
  // Clear existing hash first so _showCreatePinModal triggers
  const existing = STATE.data.user_settings;
  if (existing?.id) {
    db.update("user_settings", existing.id, { pin_hash: null }).then(() => {
      clearPinSession();
      loadAll().then(() => requirePin(() => render()));
    });
  }
};

window.sendPasswordReset = async function() {
  const email = STATE.user?.email;
  if (!email) return;
  try {
    await Auth.sendPasswordReset(email);
    const msg = document.getElementById("user-msg");
    msg.innerHTML = `<div class="msg-ok">reset email sent to ${email}.</div>`;
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 5000);
  } catch(e) {
    alert("Error: " + e.message);
  }
};

window.userSettingsHTML = userSettingsHTML;
