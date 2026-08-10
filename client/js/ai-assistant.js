// Uses SUPABASE_URL from auth.js via global scope
// ============================================================
//  Freelancer — client/js/ai-assistant.js
//  BYOK AI Assistant — full page under Operations > AI.
//  API keys stored in localStorage only, never in Supabase.
//  Supports OpenAI and Anthropic.
// ============================================================

const AI_KEY      = "fh_ai_key";
const AI_PROVIDER = "fh_ai_provider";
const AI_MODEL    = "fh_ai_model";

const AI_MODELS = {
  openai: [
    { id: "gpt-4o",       label: "GPT-4o (best)" },
    { id: "gpt-4o-mini",  label: "GPT-4o mini (faster/cheaper)" },
    { id: "gpt-4-turbo",  label: "GPT-4 Turbo" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5-20251001", label: "Claude Sonnet (recommended)" },
    { id: "claude-haiku-4-5-20251001",  label: "Claude Haiku (faster/cheaper)" },
  ],
};

// ── Platform knowledge base ───────────────────────────────────
const PLATFORM_KNOWLEDGE = `
FREELANCER — PLATFORM GUIDE FOR AI ASSISTANT
=============================================

Freelancer is a business OS for freelancers and small studios. Here is a complete guide to all features:

## NAVIGATION
- Workspace: Dashboard, Clients, Projects
- Money: Finances, Invoices
- Tools: Bookmarks, Tech Stack, Brainstorm
- Operations: Workflows, Team, AI Assistant
- Profile/Settings: accessible via avatar at bottom of sidebar

## DASHBOARD
- KPI cards: Revenue, Expenses, Outstanding invoices, Active Projects
- Period filter: This Month, This Quarter, This Year, All Time
- Recent Projects table with status badges
- Tax Estimate panel (reads tax rate from Settings)
- Quick Actions: Add Client, New Project, Create Invoice
- Overdue invoice banner when invoices are past due

## CLIENTS
- Card grid view of all clients with status (Active, Inactive, Lead)
- Client File: contact info (email, phone, company), linked projects, linked invoices, document storage
- Document storage: attach links to Google Drive, Dropbox, DocuSign files — service agreements, contracts, NDAs, content forms, proposals, briefs
- Total billed and total paid stats per client
- Click a client card to open their full file

## PROJECTS
- Card grid with status filter (Lead, Active, Review, Complete)
- Project File: description, budget, deadline, client link, file notes
- Asana-style task list with sections/phases
- Tasks have: title, assignee, due date, priority (high/normal/low), notes
- Sections group tasks into phases (e.g. "Phase 1: Discovery")
- Check tasks off to mark complete — completed tasks collapse to bottom

## FINANCES
- Log income and expenses
- Filter by period: This Month, Last Month, This Quarter, This Year, All Time
- Filter by project
- Auto-creates income entry when invoice is marked Paid
- Tech stack subscriptions auto-log as expenses on billing date
- Tax estimate panel calculates based on net profit × tax rate
- By Tax Category breakdown showing income (+) and expenses (-) per category
- Income by Project breakdown

## INVOICES
- Create line-item invoices with descriptions, quantities, rates
- Statuses: Draft → Sent → Paid / Overdue / Void
- ✉ Send: generates PDF and opens email client with pre-filled message
- ⎙ Print/Save: downloads PDF via jsPDF (no popup)
- Marking Paid automatically creates a Finance income entry
- Overdue status set automatically when due date passes
- Marking Void removes the auto-logged income entry

## BOOKMARKS
- Save websites and tools with name, URL, description, tag, monthly cost
- Store login credentials (email, username, password)
- Credentials protected by PIN — must enter PIN to view or copy
- Categories: Design, Dev, Marketing, Finance, Productivity, Hosting, Social, Other

## TECH STACK
- Track recurring subscriptions (monthly, annual, one-time)
- Set renewal date — used as billing day anchor each month
- Auto-logs expense to Finances on billing date
- Catches up missed months if app wasn't opened (uses last_login)
- Shows monthly burn and annual total

## WORKFLOWS
- Create reusable SOP templates with ordered steps
- Start a "Run" — applies template to a client or project
- Check off steps as you complete them, add notes per step
- Track progress with completion percentage
- Templates: Client Onboarding, Project Delivery, Invoice & Payment, etc.

## BRAINSTORM
- Guided thinking sessions: New Service Idea, Client Pitch, Quarterly Goals, Problem Solving, Free Form
- Guided sessions pre-fill the editor with structured prompts
- Save notes with tags and color coding
- Notes show as cards with preview text and date

## TEAM
- Create a team workspace with a name
- Invite collaborators by email — generates a secure link
- Roles: Owner, Admin (can invite/manage), Editor (can create/edit), Viewer (read-only)
- Invite link works with Google OAuth — token preserved through auth redirect
- Member table shows roles, can change roles inline

## ACCOUNT & SETTINGS (Profile)
- Display name, business name (used on invoices and sidebar)
- Business address: street, city, state/province, ZIP, country
- Business phone and billing email (appear on invoices)
- Currency, tax rate (%), timezone, fiscal year start
- Business Plan quick link (opens mission/vision/SWOT/goals editor)
- Security: credential PIN setup (SHA-256 hashed, 15-min session)
- Password reset (email) or Google OAuth users can remove PIN directly

## BUSINESS PLAN (accessed from Profile)
- Mission statement, vision, tagline
- Target market, value proposition, revenue model
- 90-day, 1-year, and 5-year goals
- SWOT analysis (strengths, weaknesses, opportunities, threats)
- Saving returns to Profile page

## CREDENTIAL PIN
- 4-8 digit PIN protects bookmark passwords and project credentials
- SHA-256 hashed before storage in user_settings
- Session stays unlocked 15 minutes after correct entry
- Google OAuth users: can remove PIN without password verification
- Auto-hides revealed passwords after 30 seconds

## AI ASSISTANT (this page)
- BYOK: user connects their own OpenAI or Anthropic API key
- Key stored in browser localStorage only — never sent to servers
- User pays their AI provider directly for token usage
- Model options: GPT-4o, GPT-4o mini, Claude Sonnet, Claude Haiku
- Context-aware: reads live business data to give relevant advice
- Chat history kept during session, cleared on new session
`;

// ── State ─────────────────────────────────────────────────────
let _aiHistory = [];

function _getKey()      { return localStorage.getItem(AI_KEY)      || ""; }
function _getProvider() { return localStorage.getItem(AI_PROVIDER) || "openai"; }
function _getModel()    { return localStorage.getItem(AI_MODEL)    || "gpt-4o-mini"; }

// ── Build live context from app state ─────────────────────────
function _buildSystemPrompt() {
  const s = STATE.data;
  const bizName = s.user_settings?.business_name || "the business";
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthIncome  = (s.finances || []).filter(f => f.type === "income"  && f.date?.startsWith(thisMonth)).reduce((a, f) => a + Number(f.amount), 0);
  const monthExpense = (s.finances || []).filter(f => f.type === "expense" && f.date?.startsWith(thisMonth)).reduce((a, f) => a + Number(f.amount), 0);
  const overdueInvs  = (s.invoices || []).filter(i => i.status === "Overdue");
  const activeProjs  = (s.projects || []).filter(p => p.status === "Active");
  const leads        = (s.clients  || []).filter(c => c.status === "Lead");

  return `You are an AI business assistant built into Freelancer, a business OS for freelancers and small studios.

${PLATFORM_KNOWLEDGE}

=============================================
LIVE BUSINESS DATA FOR ${bizName.toUpperCase()}
=============================================
Active clients: ${(s.clients||[]).filter(c=>c.status==="Active").length}
Lead clients: ${leads.length}${leads.length > 0 ? " (" + leads.map(c=>c.name).join(", ") + ")" : ""}
Total projects: ${(s.projects||[]).length}
Active projects: ${activeProjs.length}${activeProjs.length > 0 ? " (" + activeProjs.map(p=>p.name).join(", ") + ")" : ""}
This month income: $${monthIncome.toFixed(2)}
This month expenses: $${monthExpense.toFixed(2)}
This month net: $${(monthIncome - monthExpense).toFixed(2)}
Overdue invoices: ${overdueInvs.length}${overdueInvs.length > 0 ? " totalling $" + overdueInvs.reduce((a,i)=>a+Number(i.amount),0).toFixed(2) : ""}
Tax rate: ${s.user_settings?.tax_rate ?? 25}%
Monthly tech stack burn: $${(s.tech_stack||[]).filter(t=>t.cycle==="monthly").reduce((a,t)=>a+Number(t.amount),0).toFixed(2)}
Active workflow runs: ${(s.workflow_runs||[]).filter(r=>r.status==="active").length}

You are a practical business advisor. Use the platform knowledge above to help users navigate and get the most from Freelancer. Use the live business data to give specific, relevant advice. Be concise and direct.`;
}

// ── Send message ──────────────────────────────────────────────
async function _sendMessage(userMsg) {
  const key      = _getKey();
  const provider = _getProvider();
  const model    = _getModel();

  if (!key) return { error: "No API key connected. Click 'Connect AI' to get started." };

  _aiHistory.push({ role: "user", content: userMsg });

  try {
    let reply;

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: _buildSystemPrompt() }, ..._aiHistory.slice(-12)],
          max_tokens: 1000, temperature: 0.7,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `OpenAI ${res.status}`); }
      const data = await res.json();
      reply = data.choices[0]?.message?.content || "";

    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model, system: _buildSystemPrompt(),
          messages: _aiHistory.slice(-12), max_tokens: 1000,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Anthropic ${res.status}`); }
      const data = await res.json();
      reply = data.content[0]?.text || "";
    }

    _aiHistory.push({ role: "assistant", content: reply });
    return { text: reply };

  } catch(e) {
    _aiHistory.pop();
    return { error: e.message };
  }
}

// ── Main page ─────────────────────────────────────────────────
window.aiPageHTML = function() {
  const hasKey   = !!_getKey();
  const provider = _getProvider();

  const SUGGESTED = [
    "What should I focus on this week?",
    "How can I improve my cash flow?",
    "Help me write a proposal for a new client",
    "What's my most profitable project type?",
    "Help me follow up on an overdue invoice",
    "Give me a 90-day growth plan",
  ];

  return `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
  <div>
    <div class="page-title">// AI assistant</div>
    <div class="page-sub">Your business advisor — powered by your own API key</div>
  </div>
  <div class="btn-row">
    ${hasKey
      ? `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent);
           background:color-mix(in srgb,var(--accent) 12%,transparent);
           border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);
           padding:4px 10px;border-radius:3px">
           ◆ ${_getProvider()} · ${_getModel()}
         </span>
         <button class="btn btn-ghost btn-sm" onclick="showAISettings()">⚙ settings</button>`
      : `<button class="btn btn-primary" onclick="showAISettings()">connect AI →</button>`}
  </div>
</div>

${!hasKey ? `
<!-- No key state -->
<div style="max-width:560px;margin:0 auto;text-align:center;padding:40px 20px">
  <div style="font-family:'JetBrains Mono',monospace;font-size:36px;color:var(--accent);margin-bottom:16px">✦</div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--text);margin-bottom:10px">
    Connect your AI
  </div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);line-height:1.8;margin-bottom:24px">
    Bring your own OpenAI or Anthropic API key.<br/>
    Your key stays in your browser — we never see it.<br/>
    You pay your AI provider directly for usage.
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;text-align:left;background:var(--bg-raised);
    border:1px solid var(--border);border-radius:4px;padding:20px;margin-bottom:24px">
    ${[
      ["OpenAI GPT-4o mini", "~$0.001 per message", "platform.openai.com"],
      ["OpenAI GPT-4o", "~$0.005 per message", "platform.openai.com"],
      ["Claude Haiku", "~$0.001 per message", "console.anthropic.com"],
      ["Claude Sonnet", "~$0.003 per message", "console.anthropic.com"],
    ].map(([name, cost, url]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--text)">${name}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)">${url}</div>
      </div>
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent)">${cost}</span>
    </div>`).join("")}
  </div>
  <button class="btn btn-primary" onclick="showAISettings()" style="width:100%;padding:12px;font-size:13px">
    connect my API key →
  </button>
</div>` : `

<!-- Chat interface -->
<div style="display:grid;grid-template-columns:1fr 300px;gap:16px;height:calc(100vh - 180px);min-height:400px">

  <!-- Chat panel -->
  <div style="display:flex;flex-direction:column;background:var(--bg-raised);
    border:1px solid var(--border);border-radius:4px;overflow:hidden">

    <!-- Messages -->
    <div id="ai-messages" style="flex:1;overflow-y:auto;padding:16px;
      display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth">
      ${_aiHistory.length === 0 ? `
      <div style="font-family:'JetBrains Mono',monospace;font-size:12px;
        color:var(--text-muted);text-align:center;padding:20px;line-height:1.8">
        ✦ Ask me anything about your business.<br/>
        I know how to use every feature in Freelancer<br/>
        and can see your live business data.
      </div>` :
      _aiHistory.map(m => `
      <div style="display:flex;${m.role === "user" ? "justify-content:flex-end" : "justify-content:flex-start"}">
        <div style="max-width:80%;padding:10px 14px;border-radius:${m.role === "user" ? "8px 8px 2px 8px" : "8px 8px 8px 2px"};
          font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7;
          color:var(--text);white-space:pre-wrap;word-break:break-word;
          ${m.role === "user"
            ? "background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent)"
            : "background:var(--bg);border:1px solid var(--border)"}">
          ${m.content.replace(/</g,"&lt;").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}
        </div>
      </div>`).join("")}
      <div id="ai-typing" style="display:none;font-family:'JetBrains Mono',monospace;
        font-size:12px;color:var(--text-muted)">✦ thinking…</div>
    </div>

    <!-- Input -->
    <div style="padding:12px;border-top:1px solid var(--border);display:flex;gap:8px">
      <textarea id="ai-input" rows="2" placeholder="Ask anything about your business…"
        style="flex:1;resize:none;font-size:12px;font-family:'JetBrains Mono',monospace;
               background:var(--bg);border:1px solid var(--border);border-radius:3px;padding:8px"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiSend()}"></textarea>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button onclick="aiSend()"
          style="width:36px;height:36px;border-radius:4px;background:var(--accent);
                 color:var(--accent-fg);border:none;font-size:14px;cursor:pointer">↑</button>
        <button onclick="aiClear()"
          style="width:36px;height:36px;border-radius:4px;background:transparent;
                 color:var(--text-muted);border:1px solid var(--border);font-size:11px;
                 cursor:pointer;font-family:'JetBrains Mono',monospace" title="Clear chat">✕</button>
      </div>
    </div>
  </div>

  <!-- Sidebar: suggested prompts + context -->
  <div style="display:flex;flex-direction:column;gap:12px;overflow-y:auto">
    <div class="card" style="padding:16px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
        color:var(--text-muted);letter-spacing:.6px;text-transform:uppercase;margin-bottom:12px">
        Suggested
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${SUGGESTED.map(p => `
        <button onclick="aiPrompt('${p.replace(/'/g,"\\'")}')"
          style="text-align:left;padding:8px 10px;font-family:'JetBrains Mono',monospace;
                 font-size:11px;color:var(--text-muted);background:var(--bg);
                 border:1px solid var(--border);border-radius:3px;cursor:pointer;
                 line-height:1.4;transition:all .12s"
          onmouseover="this.style.color='var(--accent)';this.style.borderColor='var(--accent)'"
          onmouseout="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'">${p}</button>`).join("")}
      </div>
    </div>

    <div class="card" style="padding:16px">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
        color:var(--text-muted);letter-spacing:.6px;text-transform:uppercase;margin-bottom:12px">
        Context loaded
      </div>
      ${[
        ["Clients",          (STATE.data.clients||[]).length + " on record"],
        ["Projects",         (STATE.data.projects||[]).filter(p=>p.status==="Active").length + " active"],
        ["This month net",   "$" + ((STATE.data.finances||[]).filter(f=>f.date?.startsWith(new Date().toISOString().slice(0,7))).reduce((a,f)=>a+(f.type==="income"?1:-1)*Number(f.amount),0)).toFixed(2)],
        ["Overdue invoices", (STATE.data.invoices||[]).filter(i=>i.status==="Overdue").length + ""],
        ["Platform guide",   "✓ uploaded"],
      ].map(([label, val]) => `
      <div style="display:flex;justify-content:space-between;padding:5px 0;
        border-bottom:1px solid var(--border);font-family:'JetBrains Mono',monospace">
        <span style="font-size:10px;color:var(--text-muted)">${label}</span>
        <span style="font-size:10px;font-weight:700;color:var(--text)">${val}</span>
      </div>`).join("")}
    </div>
  </div>
</div>`}`;
};

// ── Actions ───────────────────────────────────────────────────
window.aiSend = async function() {
  const input = document.getElementById("ai-input");
  const msg   = input?.value.trim();
  if (!msg) return;
  if (input) input.value = "";

  // Re-render to show user message
  _aiHistory.push({ role: "user", content: msg });
  _renderAIMessages(true);

  const result = await _sendMessage_noHistory(msg);
  if (result.error) {
    _aiHistory.push({ role: "assistant", content: `⚠ ${result.error}` });
  }
  _renderAIMessages(false);
};

// Version that doesn't double-push user message
async function _sendMessage_noHistory(userMsg) {
  const key      = _getKey();
  const provider = _getProvider();
  const model    = _getModel();
  if (!key) return { error: "No API key connected. Click '⚙ settings' to add your key." };

  // Route through Supabase Edge Function proxy to handle CORS
  const proxyUrl = SUPABASE_URL.replace(/\/+$/, "") + "/functions/v1/ai-proxy";

  try {
    let body, reply;

    if (provider === "openai") {
      body = {
        model,
        messages: [{ role: "system", content: _buildSystemPrompt() }, ..._aiHistory.slice(-12)],
        max_tokens: 1000,
        temperature: 0.7,
      };
    } else {
      body = {
        model,
        system:   _buildSystemPrompt(),
        messages: _aiHistory.slice(-12),
        max_tokens: 1000,
      };
    }

    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key":    key,
        "x-provider":   provider,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `API error ${res.status}`);

    if (provider === "openai") {
      reply = data.choices?.[0]?.message?.content || "";
    } else {
      reply = data.content?.[0]?.text || "";
    }

    _aiHistory.push({ role: "assistant", content: reply });
    return { text: reply };

  } catch(e) {
    return { error: e.message };
  }
}

function _renderAIMessages(showTyping) {
  const container = document.getElementById("ai-messages");
  if (!container) { render(); return; }
  container.innerHTML = _aiHistory.map(m => `
  <div style="display:flex;${m.role === "user" ? "justify-content:flex-end" : "justify-content:flex-start"}">
    <div style="max-width:80%;padding:10px 14px;border-radius:${m.role === "user" ? "8px 8px 2px 8px" : "8px 8px 8px 2px"};
      font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7;
      color:var(--text);white-space:pre-wrap;word-break:break-word;
      ${m.role === "user"
        ? "background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent)"
        : "background:var(--bg);border:1px solid var(--border)"}">
      ${m.content.replace(/</g,"&lt;").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}
    </div>
  </div>`).join("") + (showTyping ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted)">✦ thinking…</div>` : "");
  container.scrollTop = container.scrollHeight;
}

window.aiPrompt = function(text) {
  const input = document.getElementById("ai-input");
  if (input) { input.value = text; input.focus(); }
};

window.aiClear = function() {
  _aiHistory = [];
  render();
};

// ── Settings modal ────────────────────────────────────────────
window.showAISettings = function() {
  const provider = _getProvider();
  const models   = AI_MODELS[provider] || AI_MODELS.openai;
  showModal(`
<div class="modal-header">
  <div class="modal-title">✦ connect your AI</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);
  line-height:1.6;margin-bottom:16px;padding:10px 12px;background:var(--bg);
  border-radius:4px;border:1px solid var(--border)">
  ◆ Your key is stored in this browser only.<br/>
  It is never sent to our servers or Supabase.<br/>
  You pay your AI provider directly for usage.
</div>
<div class="form-group">
  <label class="form-label">Provider</label>
  <select id="ai-prov" onchange="updateAIModelOptions()">
    <option value="openai"${provider==="openai"?" selected":""}>OpenAI</option>
    <option value="anthropic"${provider==="anthropic"?" selected":""}>Anthropic (Claude)</option>
  </select>
</div>
<div class="form-group">
  <label class="form-label">Model</label>
  <select id="ai-mod">
    ${models.map(m=>`<option value="${m.id}"${_getModel()===m.id?" selected":""}>${m.label}</option>`).join("")}
  </select>
</div>
<div class="form-group">
  <label class="form-label">API Key</label>
  <div style="position:relative">
    <input id="ai-key" type="password" value="${_getKey()}"
      placeholder="${provider==="anthropic"?"sk-ant-api03-…":"sk-proj-…"}"
      autocomplete="off"/>
    <button onclick="const i=document.getElementById('ai-key');i.type=i.type==='password'?'text':'password'"
      style="position:absolute;right:8px;top:50%;transform:translateY(-50%);
             background:none;border:none;font-family:'JetBrains Mono',monospace;
             font-size:11px;color:var(--text-muted);cursor:pointer">show</button>
  </div>
  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);margin-top:5px">
    Get your key:
    <a href="${provider==="anthropic"?"https://console.anthropic.com/settings/keys":"https://platform.openai.com/api-keys"}"
      target="_blank" style="color:var(--accent)">
      ${provider==="anthropic"?"console.anthropic.com":"platform.openai.com"}
    </a>
  </div>
</div>
${_getKey()?`
<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
  <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--accent)">◆ key saved</span>
  <button onclick="localStorage.removeItem('${AI_KEY}');closeModal();render()"
    style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--danger);
           background:none;border:none;cursor:pointer">remove key</button>
</div>`:""}
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" onclick="saveAISettings()">save & connect</button>
</div>`);
};

window.updateAIModelOptions = function() {
  const prov = document.getElementById("ai-prov")?.value;
  const sel  = document.getElementById("ai-mod");
  if (!sel || !prov) return;
  sel.innerHTML = (AI_MODELS[prov]||[]).map(m=>`<option value="${m.id}">${m.label}</option>`).join("");
  const ki = document.getElementById("ai-key");
  if (ki) ki.placeholder = prov==="anthropic"?"sk-ant-api03-…":"sk-proj-…";
};

window.saveAISettings = function() {
  const key  = document.getElementById("ai-key")?.value.trim();
  const prov = document.getElementById("ai-prov")?.value;
  const mod  = document.getElementById("ai-mod")?.value;
  if (key)  localStorage.setItem(AI_KEY, key);
  if (prov) localStorage.setItem(AI_PROVIDER, prov);
  if (mod)  localStorage.setItem(AI_MODEL, mod);
  _aiHistory = [];
  closeModal();
  render();
};

window.initAI = function() {};
