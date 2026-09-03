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
    <div class="page-sub">Manage your profile, preferences and business plan</div>
  </div>
</div>

<div id="user-msg" style="display:none;margin-bottom:20px"></div>

<!-- Business Plan quick link -->
<div style="display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;background:var(--bg-raised);border:1px solid var(--border);
  border-radius:10px;margin-bottom:20px;cursor:pointer;transition:border-color .15s"
  onclick="navigate('business-plan')"
  onmouseover="this.style.borderColor='color-mix(in srgb,var(--accent) 40%,transparent)'"
  onmouseout="this.style.borderColor='var(--border)'">
  <div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text)">
      Business Plan
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:3px">
      ${STATE.data.business_plan?.business_name
        ? (STATE.data.business_plan.business_name + (STATE.data.business_plan.tagline ? " · " + STATE.data.business_plan.tagline : ""))
        : "Mission, vision, SWOT, goals — click to define your strategy"}
    </div>
  </div>
  <span style="font-family:'JetBrains Mono',monospace;font-size:16px;color:var(--accent);flex-shrink:0;margin-left:16px">→</span>
</div>

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
    <label class="form-label">Default Hourly Rate ($)</label>
    <input id="us-hourly-rate" type="number" step="1" min="0"
      value="${s.default_hourly_rate ?? ""}" placeholder="85"/>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Used for time tracking when a project has no rate of its own.</div>
  </div>

  <div class="form-group">
    <label class="form-label">Business Name</label>
    <input id="us-business-name" value="${s.business_name || ""}" placeholder="Acme Freelance Co."/>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Used on invoice headers and exports.</div>
  </div>

  <div class="form-group">
    <label class="form-label">Street Address</label>
    <input id="us-address-street" value="${s.address_street || ""}" placeholder="123 Main Street, Suite 100"/>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">City</label>
      <input id="us-address-city" value="${s.address_city || ""}" placeholder="San Francisco"/>
    </div>
    <div class="form-group">
      <label class="form-label">State / Province</label>
      <input id="us-address-state" value="${s.address_state || ""}" placeholder="CA"/>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label">ZIP / Postal Code</label>
      <input id="us-address-zip" value="${s.address_zip || ""}" placeholder="94102"/>
    </div>
    <div class="form-group">
      <label class="form-label">Country</label>
      <input id="us-address-country" value="${s.address_country || ""}" placeholder="United States"/>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label">Business Phone</label>
    <input id="us-business-phone" value="${s.business_phone || ""}" placeholder="+1 555 000 0000"/>
  </div>
  <div class="form-group">
    <label class="form-label">Business Email</label>
    <input id="us-business-email" value="${s.business_email || ""}" placeholder="billing@yourbusiness.com"/>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Shown on invoices as the payment contact.</div>
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
        ? `<span style="font-size:10px;color:var(--accent);font-weight:700;background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);padding:2px 8px;border-radius:8px;font-family:'JetBrains Mono',monospace">SET</span>`
        : `<span style="font-size:10px;color:var(--danger);font-weight:700;background:color-mix(in srgb,var(--danger) 10%,transparent);border:1px solid color-mix(in srgb,var(--danger) 30%,transparent);padding:2px 8px;border-radius:8px;font-family:'JetBrains Mono',monospace">NOT SET</span>`}
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
      default_hourly_rate: parseFloat(document.getElementById("us-hourly-rate").value) || null,
      address_street:     document.getElementById("us-address-street").value.trim(),
      address_city:       document.getElementById("us-address-city").value.trim(),
      address_state:      document.getElementById("us-address-state").value.trim(),
      address_zip:        document.getElementById("us-address-zip").value.trim(),
      address_country:    document.getElementById("us-address-country").value.trim(),
      business_phone:     document.getElementById("us-business-phone").value.trim(),
      business_email:     document.getElementById("us-business-email").value.trim(),
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

// ============================================================
//  DESKTOP — Account & Settings
//  Same fields/ids as the editor above (reuses saveUserSettings
//  unmodified) behind a section nav, with a real invoice-header
//  preview and a real setup checklist. No fabricated "Plan &
//  billing" panel — this app has no real subscription/billing
//  system to reflect there.
// ============================================================
function userSettingsDesktopHTML() {
  const s   = STATE.data.user_settings || {};
  const usr = STATE.user;
  const d   = STATE.data;
  const lastInvoice = [...(d.invoices||[])].sort((a,b)=> new Date(b.created_at||0)-new Date(a.created_at||0))[0];

  const checklist = [
    { label: "Business name set", done: !!s.business_name },
    { label: "First client added", done: (d.clients||[]).length > 0 },
    { label: "First invoice sent", done: (d.invoices||[]).some(i => i.status !== "Draft") },
    { label: "Business plan started", done: !!d.business_plan },
  ];
  const doneCt = checklist.filter(c=>c.done).length;

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">Account &amp; Settings</div>
    <div class="page-sub">Profile, invoice details, preferences and security</div>
  </div>
</div>
<div id="user-msg" style="display:none;margin-bottom:20px"></div>

<div class="desk-shell">
  <div class="desk-col-list">
    <div class="desk-list-row active" style="cursor:default">Profile</div>
    <div class="desk-list-row" style="cursor:default;color:var(--text-muted)">Invoice details</div>
    <div class="desk-list-row" style="cursor:default;color:var(--text-muted)">Preferences</div>
    <div class="desk-list-row" style="cursor:default;color:var(--text-muted)">Security</div>
    <div class="desk-list-row" onclick="navigate('business-plan')" style="display:flex;align-items:center;gap:9px;margin-top:8px">
      <span style="font-family:var(--font-mono);font-size:12px;color:var(--accent)">◈</span><span style="flex:1;font-size:12.5px;font-weight:600">Business plan</span><span style="color:var(--text-muted)">→</span>
    </div>
  </div>

  <div class="desk-col-main" style="max-width:620px">
    <!-- Profile -->
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:16px">
      <span style="font-family:var(--font-mono);font-size:14px;color:var(--accent)">◎</span>
      <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)">Profile</span>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Display Name</label><input id="us-display-name" value="${s.display_name || ""}" placeholder="Jane Smith"/></div>
      <div class="form-group"><label class="form-label">Email</label><input value="${usr?.email || ""}" disabled style="opacity:.5;cursor:not-allowed"/></div>
    </div>
    <div class="form-group">
      <label class="form-label">Default Hourly Rate ($)</label>
      <input id="us-hourly-rate" type="number" step="1" min="0" value="${s.default_hourly_rate ?? ""}" placeholder="85"/>
    </div>
    <div class="form-group"><label class="form-label">Business Name</label><input id="us-business-name" value="${s.business_name || ""}" placeholder="Acme Freelance Co."/></div>

    <!-- Invoice details -->
    <div style="display:flex;align-items:center;gap:9px;margin:24px 0 16px;padding-top:20px;border-top:1px solid var(--border)">
      <span style="font-family:var(--font-mono);font-size:14px;color:var(--accent)">◻</span>
      <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)">Invoice details</span>
    </div>
    <div class="form-group"><label class="form-label">Street Address</label><input id="us-address-street" value="${s.address_street || ""}" placeholder="123 Main Street, Suite 100"/></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">City</label><input id="us-address-city" value="${s.address_city || ""}" placeholder="San Francisco"/></div>
      <div class="form-group"><label class="form-label">State</label><input id="us-address-state" value="${s.address_state || ""}" placeholder="CA"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">ZIP</label><input id="us-address-zip" value="${s.address_zip || ""}" placeholder="94102"/></div>
      <div class="form-group"><label class="form-label">Country</label><input id="us-address-country" value="${s.address_country || ""}" placeholder="United States"/></div>
    </div>
    <div class="form-group"><label class="form-label">Business Phone</label><input id="us-business-phone" value="${s.business_phone || ""}" placeholder="+1 555 000 0000"/></div>
    <div class="form-group"><label class="form-label">Business Email</label><input id="us-business-email" value="${s.business_email || ""}" placeholder="billing@yourbusiness.com"/></div>

    <!-- Preferences -->
    <div style="display:flex;align-items:center;gap:9px;margin:24px 0 16px;padding-top:20px;border-top:1px solid var(--border)">
      <span style="font-family:var(--font-mono);font-size:14px;color:var(--accent)">◳</span>
      <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted)">Preferences</span>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Currency</label>
        <select id="us-currency">${CURRENCIES.map(c => `<option value="${c.code}"${(s.currency||"USD")===c.code?" selected":""}>${c.label}</option>`).join("")}</select>
      </div>
      <div class="form-group"><label class="form-label">Tax Rate (%)</label><input id="us-tax-rate" type="number" min="0" max="100" step="0.1" value="${s.tax_rate ?? 25}"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Timezone</label>
        <select id="us-timezone">${TIMEZONES.map(tz => `<option${(s.timezone||"America/New_York")===tz?" selected":""}>${tz}</option>`).join("")}</select>
      </div>
      <div class="form-group"><label class="form-label">Fiscal Year Start</label>
        <select id="us-fiscal-year">${["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=>`<option value="${i+1}"${(s.fiscal_year_start||1)===(i+1)?" selected":""}>${m}</option>`).join("")}</select>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:14px;background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:26px">
      <div style="flex:1"><div style="font-size:13.5px;font-weight:600">Appearance</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">Toggle from the sidebar</div></div>
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${_isLight() ? "Light" : "Dark"}</div>
    </div>
    <button class="btn btn-primary" id="us-save-btn" onclick="saveUserSettings()" style="margin-bottom:26px">Save Settings</button>

    <!-- Security -->
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:16px;padding-top:20px;border-top:1px solid var(--border)">
      <span style="font-family:var(--font-mono);font-size:14px;color:var(--danger)">◆</span>
      <span style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--danger)">Security</span>
    </div>
    <div style="background:var(--bg-raised);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-bottom:1px solid var(--border)">
        <div style="flex:1"><div style="font-size:13.5px;font-weight:600">Credential PIN</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">Unlocks Bookmarks for ${typeof PIN_SESSION_MINUTES !== "undefined" ? PIN_SESSION_MINUTES : 15} minutes</div></div>
        ${hasPinSet()
          ? `<span style="font-family:var(--font-mono);font-size:11.5px;font-weight:700;color:var(--money-pos)">On</span><button class="btn btn-ghost btn-sm" onclick="requirePin(()=>_showChangePinFlow())">Change</button><button class="btn btn-danger btn-sm" onclick="_showResetPinModal()">Remove</button>`
          : `<button class="btn btn-primary btn-sm" onclick="requirePin(()=>{render()})">Set up PIN</button>`}
      </div>
      <div style="display:flex;align-items:center;gap:14px;padding:14px 16px">
        <div style="flex:1"><div style="font-size:13.5px;font-weight:600">Password</div><div style="font-size:12px;color:var(--text-muted);margin-top:2px">Send a reset link to ${usr?.email || ""}</div></div>
        <button class="btn btn-ghost btn-sm" onclick="sendPasswordReset()">Reset by email</button>
      </div>
    </div>
    <button class="btn btn-danger btn-sm" onclick="doSignOut()">Sign out</button>
  </div>

  <div class="desk-rail narrow">
    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Invoice header preview</div>
    <div style="background:#FAF7F3;color:#241C17;border-radius:12px;padding:18px;margin-bottom:22px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px">
        <div>
          <div style="font-family:var(--font-serif);font-size:18px;line-height:1.15">${s.business_name || "Your Business"}</div>
          <div style="font-family:var(--font-mono);font-size:9.5px;color:#7A6C63;margin-top:5px;line-height:1.6">${[s.address_street, [s.address_city,s.address_state,s.address_zip].filter(Boolean).join(", "), s.business_email].filter(Boolean).join("<br>") || "Add your invoice details above"}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-mono);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7A6C63">Invoice</div>
          <div style="font-family:var(--font-mono);font-size:13px;font-weight:700;margin-top:3px">${lastInvoice?.invoice_number || "INV-0001"}</div>
        </div>
      </div>
      ${lastInvoice ? `<div style="border-top:1px solid #EAE2D9;padding-top:11px;display:flex;justify-content:space-between"><span style="font-family:var(--font-mono);font-size:10px;color:#7A6C63">Total · ${s.currency||"USD"} · ${s.tax_rate ?? 25}% tax</span><span style="font-family:var(--font-mono);font-size:13px;font-weight:700">${usd(lastInvoice.amount)}</span></div>` : ""}
    </div>

    <div style="font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:11px">Setup checklist</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${checklist.map(c => `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:15px;height:15px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--bg);background:${c.done?'var(--money-pos)':'transparent'};border:1px solid ${c.done?'transparent':'var(--border-2)'}">${c.done?'✓':''}</span>
        <span style="flex:1;font-size:12.5px;${c.done?'color:var(--text-muted);text-decoration:line-through':''}">${c.label}</span>
      </div>`).join("")}
      <div style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-muted);margin-top:4px">${doneCt} of ${checklist.length} done</div>
    </div>
  </div>
</div>`;
}
window.userSettingsDesktopHTML = userSettingsDesktopHTML;
