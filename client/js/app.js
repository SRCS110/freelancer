// ============================================================
//  Freelancer — client/js/app.js
//  App state, render router, and boot sequence.
// ============================================================

let STATE = {
  user:        null,
  page:        "dashboard",
  openProject: null,
  data: {
    clients: [], projects: [], finances: [], invoices: [],
    business_plan: null, user_settings: null,
    bookmarks: [], tech_stack: [],
    workflow_templates: [], workflow_steps: [], workflow_runs: [], workflow_run_steps: [],
    project_todos: [], project_todo_sections: [], client_documents: [],
    brainstorm: [], teams: [], team_members: [], team_invites: [],
  },
  loading: true,
};

// ── Data loader ───────────────────────────────────────────────
async function loadAll() {
  if (!STATE.user) return;
  try {
    const [
      clients, projects, finances, invoices,
      bpList, settingsList, bookmarks, techStack,
      wfTemplates, wfSteps, wfRuns, wfRunSteps,
      projectTodos, todoSections, clientDocs,
      brainstormNotes, teams, teamMembers, teamInvites
    ] = await Promise.all([
      db.list("clients"),
      db.list("projects"),
      db.list("finances"),
      db.list("invoices"),
      db.list("business_plan").catch(() => []),
      db.list("user_settings").catch(() => []),
      db.list("bookmarks").catch(() => []),
      db.list("tech_stack").catch(() => []),
      db.list("workflow_templates").catch(() => []),
      db.list("workflow_steps").catch(() => []),
      db.list("workflow_runs").catch(() => []),
      db.list("workflow_run_steps").catch(() => []),
      db.list("project_todos").catch(() => []),
      db.list("project_todo_sections").catch(() => []),
      db.list("client_documents").catch(() => []),
      db.list("brainstorm").catch(() => []),
      db.list("teams").catch(() => []),
      db.list("team_members").catch(() => []),
      db.list("team_invites").catch(() => []),
    ]);
    STATE.data = {
      clients:               clients        || [],
      projects:              projects       || [],
      finances:              finances       || [],
      invoices:              invoices       || [],
      business_plan:         (bpList || [])[0]       || null,
      user_settings:         (settingsList || [])[0]  || null,
      bookmarks:             bookmarks      || [],
      tech_stack:            techStack      || [],
      workflow_templates:    wfTemplates    || [],
      workflow_steps:        wfSteps        || [],
      workflow_runs:         wfRuns         || [],
      workflow_run_steps:    wfRunSteps     || [],
      project_todos:         projectTodos   || [],
      project_todo_sections: todoSections   || [],
      client_documents:      clientDocs     || [],
      brainstorm:            brainstormNotes || [],
      teams:                 teams          || [],
      team_members:          teamMembers    || [],
      team_invites:          teamInvites    || [],
    };
  } catch (e) {
    console.error("loadAll error:", e.message);
  }
  STATE.loading = false;

  // Auto-mark overdue invoices (non-blocking)
  _checkOverdueInvoices().catch(e => console.warn("overdue check:", e.message));

  try { render(); } catch(e) { console.error("render after loadAll:", e.message); }
}

async function _checkOverdueInvoices() {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = (STATE.data.invoices || []).filter(i =>
    i.due_date &&
    i.due_date < today &&
    i.status === "Sent"
  );
  for (const inv of overdue) {
    try {
      await db.update("invoices", inv.id, { status: "Overdue" });
      inv.status = "Overdue"; // update in-memory state too
    } catch(e) { console.warn("Could not mark overdue:", e.message); }
  }
}

// ── Navigation ────────────────────────────────────────────────
function navigate(page) {
  STATE.page        = page;
  STATE.openProject = null;
  if (page !== "clients") window._openClientId = null;
  render();
}

window.navigate    = navigate;
window.openProject = function(p) { STATE.openProject = p; STATE.page = "projects"; render(); };
window.doSignOut   = function() { Auth.signOut(); };

// ── Sidebar ─────────────────────────────────────────────────
const NAV_GROUPS = [
  { label: "Workspace", items: [
    { id: "dashboard",     label: "Dashboard",    icon: "◈" },
    { id: "clients",       label: "Clients",      icon: "◎" },
    { id: "projects",      label: "Projects",     icon: "◫" },
  ]},
  { label: "Money", items: [
    { id: "finances",      label: "Finances",     icon: "◇" },
    { id: "invoices",      label: "Invoices",     icon: "◻" },
  ]},
  { label: "Tools", items: [
    { id: "bookmarks",     label: "Bookmarks",    icon: "◉" },
    { id: "tech-stack",    label: "Tech Stack",   icon: "◳" },
    { id: "brainstorm",    label: "Brainstorm",   icon: "◆" },
  ]},
  { label: "Operations", items: [
    { id: "workflows",     label: "Workflows",    icon: "◳" },
    { id: "team",          label: "Team",         icon: "◎" },
    { id: "ai",            label: "AI Assistant", icon: "✦" },
  ]},
];

function sidebarHTML() {
  const s           = STATE.data.user_settings;
  const usr         = STATE.user;
  const displayName = s?.display_name || usr?.email?.split("@")[0] || "account";
  const bizName     = s?.business_name || STATE.data.business_plan?.business_name || "Freelancer";
  const overdueCt   = STATE.data.invoices.filter(i => i.status === "Overdue").length;
  const demoBanner  = window.DEMO_MODE ? demoBannerHTML() : "";
  const isLight     = _isLight();

  return `
<div class="sidebar">
  <div class="sidebar-logo" onclick="navigate('dashboard')" style="cursor:pointer">${bizName}</div>
  <div class="sidebar-sub">Business OS</div>
  ${demoBanner}

  ${NAV_GROUPS.map(group => `
  <div class="nav-group">
    <div class="nav-group-label">${group.label}</div>
    ${group.items.map(n => `
    <div class="nav-item${STATE.page === n.id ? " active" : ""}" onclick="navigate('${n.id}')">
      <span class="nav-icon">${n.icon}</span>
      <span>${n.label}</span>
      ${n.id === "invoices" && overdueCt > 0
        ? `<span class="nav-badge">${overdueCt}</span>` : ""}
    </div>`).join("")}
  </div>`).join("")}

  <div class="sidebar-footer">
    <div class="theme-toggle" onclick="toggleTheme()">
      <span>${isLight ? "light mode" : "dark mode"}</span>
      <div class="theme-toggle-track${isLight ? " on" : ""}">
        <div class="theme-toggle-thumb"></div>
      </div>
    </div>
    <div class="nav-item${STATE.page === "settings" ? " active" : ""}"
      onclick="navigate('settings')"
      style="padding:8px 12px;margin-bottom:4px">
      <span class="nav-icon">◈</span>
      ${displayName}
    </div>
    <button class="logout-btn" onclick="doSignOut()">sign out</button>
  </div>
</div>`;
}





// ── Mobile bar + drawer + bottom tabs ────────────────────────

const MOBILE_TABS = [
  { id: "workspace", icon: "◈", label: "Work",  pages: ["dashboard","clients","projects"] },
  { id: "money",     icon: "◇", label: "Money", pages: ["finances","invoices"] },
  { id: "tools",     icon: "◉", label: "Tools", pages: ["bookmarks","tech-stack","brainstorm"] },
  { id: "ops",       icon: "◳", label: "Ops",   pages: ["workflows","team","ai"] },
];

function mobileBarParts() {
  const s           = STATE.data?.user_settings;
  const bizName     = s?.business_name || STATE.data?.business_plan?.business_name || "Freelancer";
  const isLight     = _isLight();
  const overdueCt   = (STATE.data?.invoices || []).filter(i => i.status === "Overdue").length;
  const activeTab   = MOBILE_TABS.find(t => t.pages.includes(STATE.page))?.id || "workspace";

  const isMobile = window.innerWidth <= 640;
  const topBar = `<div class="mobile-bar" style="${isMobile ? 'display:flex' : ''}">
  <div class="mobile-bar-logo" onclick="navigate('dashboard')">${bizName}</div>
  <div class="mobile-bar-actions">
    <!-- Theme toggle -->
    <button class="mobile-bar-btn" onclick="toggleTheme()" title="${isLight ? "dark" : "light"} mode">
      ${isLight ? "◑" : "◐"}
    </button>
    <!-- AI Assistant -->
    <button class="mobile-bar-btn${STATE.page === "ai" ? " active" : ""}"
      onclick="navigate('ai')" title="AI Assistant">✦</button>
    <!-- Account -->
    <button class="mobile-bar-btn${STATE.page === "settings" ? " active" : ""}"
      onclick="navigate('settings')" title="Account">
      <span style="font-size:12px;font-weight:700">${(s?.display_name || "?").charAt(0).toUpperCase()}</span>
    </button>
  </div>
</div>

`;

  const drawer = `<div class="mobile-drawer" id="mobile-drawer" onclick="closeDrawerOnBackdrop(event)">
  <div class="mobile-drawer-backdrop"></div>
  <div class="mobile-drawer-panel">
    ${_drawerNav()}
  </div>
</div>

`;

  const bottomTabs = `<div class="mobile-tabs" style="${isMobile ? 'display:flex' : ''}">
  ${MOBILE_TABS.map(tab => {
    const isActive = tab.id === activeTab;
    const hasOverdue = tab.id === "money" && overdueCt > 0;
    return `
  <div class="mobile-tab${isActive ? " active" : ""}" onclick="mobileTabClick('${tab.id}')">
    <div style="position:relative;display:inline-flex">
      <span class="mobile-tab-icon">${tab.icon}</span>
      ${hasOverdue ? `<span style="position:absolute;top:-2px;right:-6px;width:7px;height:7px;background:var(--danger);border-radius:50%;border:1.5px solid var(--bg)"></span>` : ""}
    </div>
    <span class="mobile-tab-label">${tab.label}</span>
  </div>`;
  }).join("")}
</div>`;

  return { topBar, drawer, bottomTabs };
}

// Tapping a bottom tab:
// - If already on that tab's section → show drawer with sub-pages
// - If not → navigate to first page in that section
window.mobileTabClick = function(tabId) {
  const tab      = MOBILE_TABS.find(t => t.id === tabId);
  const isActive = tab?.pages.includes(STATE.page);
  if (isActive && tab.pages.length > 1) {
    // Show drawer with this tab's sub-pages
    window._drawerTabFilter = tabId;
    toggleDrawer();
  } else {
    navigate(tab.pages[0]);
  }
};

// Store which tab filter the drawer is showing
window._drawerTabFilter = null;


window.toggleDrawer = function() {
  const drawer = document.getElementById("mobile-drawer");
  const btn    = document.getElementById("hamburger-btn");
  if (!drawer) return;
  const isOpen = drawer.classList.contains("open");
  drawer.classList.toggle("open", !isOpen);
  if (btn) btn.classList.toggle("open", !isOpen);
};

window.closeDrawerOnBackdrop = function(e) {
  if (e.target.classList.contains("mobile-drawer-backdrop") ||
      e.target.classList.contains("mobile-drawer")) {
    closeDrawer();
  }
};

window.closeDrawer = function() {
  const drawer = document.getElementById("mobile-drawer");
  const btn    = document.getElementById("hamburger-btn");
  if (drawer) drawer.classList.remove("open");
  if (btn)    btn.classList.remove("open");
};

window.drawerNavigate = function(page) {
  closeDrawer();
  window._drawerTabFilter = null;
  navigate(page);
};

// ── Render router ─────────────────────────────────────────────
function render() {
  const root = document.getElementById("app");

  if (STATE.loading) {
    root.innerHTML = `<div class="spinner" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg,#0a0a0c)">Loading…</div>`;
    return;
  }

  let content = "";
  try {
    if      (STATE.page === "dashboard")                         content = dashboardHTML();
    else if (STATE.page === "clients")                           content = clientsHTML();
    else if (STATE.page === "projects" && STATE.openProject)     content = projectFileHTML(STATE.openProject);
    else if (STATE.page === "projects")                          content = projectsListHTML();
    else if (STATE.page === "finances")                          content = financesHTML();
    else if (STATE.page === "invoices")                          content = invoicesHTML();
    else if (STATE.page === "business-plan")                     content = businessPlanHTML();
    else if (STATE.page === "settings")                          content = userSettingsHTML();
    else if (STATE.page === "bookmarks")                         content = bookmarksHTML();
    else if (STATE.page === "tech-stack")                        content = techStackHTML();
    else if (STATE.page === "workflows")                         content = workflowsHTML();
    else if (STATE.page === "brainstorm")                        content = brainstormHTML();
    else if (STATE.page === "team")                              content = teamHTML();
    else if (STATE.page === "ai")                               content = aiPageHTML();
  } catch(e) {
    console.error("render error on page", STATE.page, ":", e.message, e.stack);
    content = `<div class="card" style="border-color:var(--danger)">
      <div style="font-family:'JetBrains Mono',monospace;color:var(--danger);font-size:13px;margin-bottom:8px">render error — ${STATE.page}</div>
      <div style="font-family:'JetBrains Mono',monospace;color:var(--text-muted);font-size:11px">${e.message}</div>
    </div>`;
  }

  let topBar = "", drawer = "", bottomTabs = "";
  try {
    const parts = mobileBarParts();
    topBar = parts.topBar || "";
    drawer = parts.drawer || "";
    bottomTabs = parts.bottomTabs || "";
  } catch(e) { console.warn("mobileBarParts:", e.message); }

  try {
    root.innerHTML = sidebarHTML() + topBar + drawer + `<div class="main">${content}</div>`;
  } catch(e) {
    console.error("sidebar render error:", e.message);
    root.innerHTML = `<div class="main">${content}</div>`;
  }

  try {
    let tabsEl = document.getElementById("mobile-tabs-bar");
    if (!tabsEl) {
      tabsEl = document.createElement("div");
      tabsEl.id = "mobile-tabs-bar";
      document.body.appendChild(tabsEl);
    }
    if (bottomTabs) tabsEl.innerHTML = bottomTabs;
  } catch(e) { console.warn("tabs inject:", e.message); }
}

// ── Nav group collapse ────────────────────────────────────────
window.toggleNavGroup = function(label) {
  collapsed[label] = !collapsed[label];
  localStorage.setItem("fh_nav_collapsed", JSON.stringify(collapsed));
  render();
};


// ── Section quick-add ─────────────────────────────────────────
window._sectionAdd = function(section) {
  switch(section) {
    case "workspace":
      // Ask what to add
      showModal(`
<div class="modal-header">
  <div class="modal-title">add new</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
  <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:12px 16px"
    onclick="closeModal();openClientModal(null)">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px">◎</span>
    <span>New Client</span>
  </button>
  <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:12px 16px"
    onclick="closeModal();navigate('projects');setTimeout(()=>openProjModal(null),100)">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px">◫</span>
    <span>New Project</span>
  </button>
</div>`);
      break;
    case "money":
      showModal(`
<div class="modal-header">
  <div class="modal-title">add new</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
  <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:12px 16px"
    onclick="closeModal();navigate('finances');setTimeout(()=>openFinModal(null),100)">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px">◇</span>
    <span>Log Income / Expense</span>
  </button>
  <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:12px 16px"
    onclick="closeModal();navigate('invoices');setTimeout(()=>openInvModal(null),100)">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px">◻</span>
    <span>New Invoice</span>
  </button>
</div>`);
      break;
    case "tools":
      showModal(`
<div class="modal-header">
  <div class="modal-title">add new</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div style="display:flex;flex-direction:column;gap:10px;margin-top:4px">
  <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:12px 16px"
    onclick="closeModal();navigate('bookmarks');setTimeout(()=>openBmModal(null),100)">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px">◉</span>
    <span>New Bookmark</span>
  </button>
  <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:12px 16px"
    onclick="closeModal();navigate('tech-stack');setTimeout(()=>openStackModal(null),100)">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px">◳</span>
    <span>Add Tech Stack Item</span>
  </button>
  <button class="btn btn-ghost" style="justify-content:flex-start;gap:12px;padding:12px 16px"
    onclick="closeModal();navigate('brainstorm');setTimeout(()=>newBsNote(),100)">
    <span style="font-family:'JetBrains Mono',monospace;font-size:14px">◆</span>
    <span>New Brainstorm Note</span>
  </button>
</div>`);
      break;
    case "ops":
      navigate("workflows");
      break;
    default:
      navigate(SECTION_ITEMS[section]?.[0]?.id || "dashboard");
  }
};


// ── Theme ─────────────────────────────────────────────────────
function _isLight() { return document.body.classList.contains("light"); }

window.toggleTheme = function() {
  const light = !_isLight();
  document.body.classList.toggle("light", light);
  localStorage.setItem("fh_theme", light ? "light" : "dark");
  render(); // re-render to update toggle state
};

// Apply saved theme immediately (before render)
(function applyTheme() {
  if (localStorage.getItem("fh_theme") === "light") {
    document.body.classList.add("light");
  }
})();

// ── Boot ──────────────────────────────────────────────────────
function waitForAuth(cb, tries = 0) {
  if (window.Auth) { cb(); return; }
  if (tries < 100) setTimeout(() => waitForAuth(cb, tries + 1), 50);
  else { window.location.href = "login.html"; }
}

waitForAuth(async function() {
  // ── Demo mode check ──────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("demo") === "true" || window.DEMO_MODE) {
    window.STATE   = STATE;
    window.loadAll = () => Promise.resolve(); // no-op in demo
    window.render  = render;
    activateDemo();
    render();
    return; // skip auth entirely
  }

  // ── Preserve invite token across auth redirect ────────────────
  const inviteToken = urlParams.get("invite");
  if (inviteToken) {
    localStorage.setItem("fh_pending_invite", inviteToken);
    // Clean URL so the token doesn't interfere with auth
    window.history.replaceState({}, "", window.location.pathname);
  }

  // ── Normal auth flow ─────────────────────────────────────────
  if (!hasConfig()) { window.location.href = "login.html"; return; }

  const session = await Auth.requireAuth();
  if (!session) {
    // Not logged in — redirect to login, carrying invite token hint
    const dest = inviteToken || localStorage.getItem("fh_pending_invite")
      ? "login.html?invite=pending"
      : "login.html";
    window.location.href = dest;
    return;
  }

  STATE.user     = session.user;
  window.STATE   = STATE;
  window.loadAll = loadAll;
  window.render  = render;

  Auth.onAuthStateChange((event, s) => {
    if (event === "SIGNED_OUT") window.location.href = "login.html";
  });

  await loadAll();
  await handleInviteToken();
  await autoLogTechStackExpenses();
  await runOnboarding();
  window.initAI();
});
