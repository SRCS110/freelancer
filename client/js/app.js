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
  render();
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
// Two-panel Asana-style: narrow icon rail + expanded section panel

const SIDEBAR_SECTIONS = [
  { id: "workspace", icon: "◈", label: "Workspace",  pages: ["dashboard","clients","projects"] },
  { id: "money",     icon: "◇", label: "Money",      pages: ["finances","invoices"] },
  { id: "business",  icon: "◆", label: "Business",   pages: ["business-plan","brainstorm"] },
  { id: "tools",     icon: "◉", label: "Tools",      pages: ["bookmarks","tech-stack"] },
  { id: "ops",       icon: "◳", label: "Operations", pages: ["workflows","team"] },
];

const SECTION_ITEMS = {
  workspace: [
    { id: "dashboard",    label: "Dashboard",    icon: "◈" },
    { id: "clients",      label: "Clients",      icon: "◎" },
    { id: "projects",     label: "Projects",     icon: "◫" },
  ],
  money: [
    { id: "finances",     label: "Finances",     icon: "◇" },
    { id: "invoices",     label: "Invoices",     icon: "◻" },
  ],
  business: [
    { id: "business-plan",label: "Business Plan",icon: "◈" },
    { id: "brainstorm",   label: "Brainstorm",   icon: "◆" },
  ],
  tools: [
    { id: "bookmarks",    label: "Bookmarks",    icon: "◉" },
    { id: "tech-stack",   label: "Tech Stack",   icon: "◳" },
  ],
  ops: [
    { id: "workflows",    label: "Workflows",    icon: "◳" },
    { id: "team",         label: "Team",         icon: "◎" },
  ],
};

// Recents per section — pulled from STATE.data
function _sectionRecents(sectionId) {
  switch(sectionId) {
    case "workspace":
      return [
        ...(STATE.data.projects || []).slice(0,3).map(p => ({
          label: p.name, action: `openProjectById('${p.id}')`, sub: p.client_name || ""
        })),
        ...(STATE.data.clients || []).slice(0,2).map(c => ({
          label: c.name, action: `openClientFile('${c.id}')`, sub: c.company || ""
        })),
      ].slice(0, 4);
    case "money":
      // Open invoices — unpaid and overdue
      return (STATE.data.invoices || [])
        .filter(i => i.status === "Sent" || i.status === "Overdue" || i.status === "Draft")
        .slice(0, 5)
        .map(i => ({
          label: i.invoice_number,
          action: `navigate('invoices')`,
          sub: i.client_name || "",
          badge: i.status,
          badgeColor: i.status === "Overdue" ? "var(--danger)"
                    : i.status === "Sent"    ? "var(--accent)"
                    : "var(--text-muted)",
        }));
    case "tools":
      // Quick links — bookmarks with URLs
      return (STATE.data.bookmarks || [])
        .filter(b => b.url)
        .slice(0, 5)
        .map(b => ({
          label: b.name,
          url:   b.url,
          action: `window.open('${b.url}','_blank')`,
          sub:   b.url.replace(/^https?:\/\//, "").split("/")[0],
          isLink: true,
        }));
    case "ops":
      return (STATE.data.workflow_runs || [])
        .filter(r => r.status === "active").slice(0,3).map(r => ({
          label: r.name, action: `openWfRun('${r.id}')`, sub: r.client_name || ""
        }));
    default:
      return [];
  }
}

function _activeSection() {
  return SIDEBAR_SECTIONS.find(s => s.pages.includes(STATE.page))?.id || "workspace";
}

function sidebarHTML() {
  const s           = STATE.data.user_settings;
  const usr         = STATE.user;
  const displayName = s?.display_name || usr?.email?.split("@")[0] || "account";
  const activeSection = window._sidebarSection || _activeSection();
  const items       = SECTION_ITEMS[activeSection] || [];
  const recents     = _sectionRecents(activeSection);
  const section     = SIDEBAR_SECTIONS.find(s => s.id === activeSection);
  const overdueCt   = STATE.data.invoices.filter(i => i.status === "Overdue").length;
  const demoBanner  = window.DEMO_MODE ? demoBannerHTML() : "";

  return `
<div class="sidebar-rail" id="sidebar-rail"
  onmouseenter="expandSidebar()"
  onmouseleave="collapseSidebar()">
  <div class="rail-logo" onclick="navigate('dashboard')" title="Home">
    ${(STATE.data.user_settings?.business_name || STATE.data.business_plan?.business_name || "F").charAt(0).toUpperCase()}
  </div>

  ${SIDEBAR_SECTIONS.map(sec => `
  <div class="rail-item${activeSection === sec.id ? " active" : ""}"
    onclick="setSidebarSection('${sec.id}')"
    title="${sec.label}">
    <span class="rail-icon">${sec.icon}</span>
    <span class="rail-label">${sec.label}</span>
    ${sec.id === "money" && overdueCt > 0
      ? `<span class="rail-dot"></span>` : ""}
  </div>`).join("")}

  <div class="rail-spacer"></div>

  <div class="rail-item${STATE.page === "settings" ? " active" : ""}"
    onclick="navigate('settings')" title="${displayName}">
    <span class="rail-icon" style="font-size:10px;font-weight:700;background:var(--accent);
      color:var(--accent-fg);width:22px;height:22px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;margin:0 auto">
      ${displayName.charAt(0).toUpperCase()}
    </span>
    <span class="rail-label">${displayName.split(" ")[0]}</span>
  </div>
</div>

<div class="sidebar-panel" id="sidebar-panel"
  onmouseenter="expandSidebar()"
  onmouseleave="collapseSidebar()">
  ${demoBanner}

  <!-- Company header -->
  <div class="panel-header">
    <div class="panel-company">${STATE.data.user_settings?.business_name || STATE.data.business_plan?.business_name || "Freelancer"}</div>
    <div class="panel-os-label">Business OS</div>
  </div>

  <!-- Section label -->
  <div class="panel-section-title">${section?.label || ""}</div>

  <!-- Nav items -->
  ${items.map(n => `
  <div class="panel-item${STATE.page === n.id ? " active" : ""}" onclick="navigate('${n.id}')">
    <span class="panel-icon">${n.icon}</span>
    <span>${n.label}</span>
    ${n.id === "invoices" && overdueCt > 0
      ? `<span class="nav-badge" style="margin-left:auto">${overdueCt}</span>` : ""}
  </div>`).join("")}

  <!-- Recents -->
  ${recents.length > 0 ? `
  <div class="panel-recents-header">
    <span>${activeSection === "money" ? "Open Invoices" : activeSection === "tools" ? "Quick Links" : "Recent"}</span>
    <span onclick="_sectionAdd('${activeSection}')"
      style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;
      font-weight:700;background:var(--accent);color:var(--accent-fg);
      padding:2px 8px;border-radius:3px">+ add</span>
  </div>
  ${recents.map(r => `
  <div class="panel-recent-item" onclick="${r.action}">
    <span class="panel-recent-dot">${r.isLink ? "↗" : "◫"}</span>
    <div style="min-width:0;flex:1">
      <div class="panel-recent-label">${r.label}</div>
      ${r.sub ? `<div class="panel-recent-sub">${r.sub}</div>` : ""}
    </div>
    ${r.badge
      ? `<span style="flex-shrink:0;font-size:9px;font-family:'JetBrains Mono',monospace;font-weight:700;
           color:${r.badgeColor || "var(--accent)"};white-space:nowrap">${r.badge}</span>`
      : ""}
  </div>`).join("")}` : ""}

  <!-- Footer: theme toggle + sign out -->
  <div class="panel-footer">
    <div class="theme-toggle" onclick="toggleTheme()" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:4px 0">
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);letter-spacing:.4px;text-transform:uppercase">
        ${_isLight() ? "light mode" : "dark mode"}
      </span>
      <div class="theme-toggle-track${_isLight() ? " on" : ""}">
        <div class="theme-toggle-thumb"></div>
      </div>
    </div>
    <button class="logout-btn" onclick="doSignOut()">sign out</button>
  </div>
</div>`;
}

window.setSidebarSection = function(id) {
  window._sidebarSection = id;
  render();
};


// ── Mobile bar + drawer ───────────────────────────────────────
function mobileBarHTML() {
  return `
<div class="mobile-bar">
  <div class="mobile-bar-logo" onclick="navigate('dashboard')" style="cursor:pointer">${STATE.data.user_settings?.business_name || STATE.data.business_plan?.business_name || "Freelancer"}</div>
  <button class="hamburger" id="hamburger-btn" onclick="toggleDrawer()">
    <span></span><span></span><span></span>
  </button>
</div>

<div class="mobile-drawer" id="mobile-drawer" onclick="closeDrawerOnBackdrop(event)">
  <div class="mobile-drawer-backdrop"></div>
  <div class="mobile-drawer-panel">
    ${_drawerNav()}
  </div>
</div>`;
}

function _drawerNav() {
  const demoBanner = window.DEMO_MODE ? demoBannerHTML() : "";
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
    { label: "Business", items: [
      { id: "business-plan", label: "Business Plan",icon: "◈" },
      { id: "brainstorm",    label: "Brainstorm",   icon: "◆" },
    ]},
    { label: "Tools", items: [
      { id: "bookmarks",     label: "Bookmarks",    icon: "◉" },
      { id: "tech-stack",    label: "Tech Stack",   icon: "◳" },
    ]},
    { label: "Operations", items: [
      { id: "workflows",     label: "Workflows",    icon: "◳" },
      { id: "team",          label: "Team",         icon: "◎" },
    ]},
  ];
  const overdueCt   = STATE.data.invoices.filter(i => i.status === "Overdue").length;
  const s           = STATE.data.user_settings;
  const usr         = STATE.user;
  const displayName = s?.display_name || usr?.email?.split("@")[0] || "account";
  const isLight     = document.body.classList.contains("light");

  return demoBanner + NAV_GROUPS.map(group => `
  <div class="nav-group">
    <div class="nav-group-label">${group.label}</div>
    ${group.items.map(n => `
    <div class="nav-item${STATE.page === n.id ? " active" : ""}" onclick="drawerNavigate('${n.id}')">
      <span class="nav-icon">${n.icon}</span>
      <span>${n.label}</span>
      ${n.id === "invoices" && overdueCt > 0
        ? `<span class="nav-badge">${overdueCt}</span>`
        : ""}
    </div>`).join("")}
  </div>`).join("") + `
  <div style="margin-top:auto;padding:16px 20px;border-top:1px solid var(--border)">
    <div class="theme-toggle" onclick="toggleTheme()" style="margin-bottom:10px">
      <span>${isLight ? "light" : "dark"} mode</span>
      <div class="theme-toggle-track${isLight ? " on" : ""}">
        <div class="theme-toggle-thumb"></div>
      </div>
    </div>
    <div class="nav-item${STATE.page === "settings" ? " active" : ""}"
      onclick="drawerNavigate('settings')"
      style="padding:8px 0;margin-bottom:6px">
      <span style="font-family:'JetBrains Mono',monospace;width:20px;text-align:center;font-size:13px">◈</span>
      ${displayName}
    </div>
    <button class="logout-btn" onclick="doSignOut()">sign out</button>
  </div>`;
}
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
  } catch(e) {
    console.error("render error on page", STATE.page, ":", e.message, e.stack);
    content = `<div class="card" style="border-color:var(--danger)">
      <div style="font-family:'JetBrains Mono',monospace;color:var(--danger);font-size:13px;margin-bottom:8px">render error — ${STATE.page}</div>
      <div style="font-family:'JetBrains Mono',monospace;color:var(--text-muted);font-size:11px">${e.message}</div>
    </div>`;
  }

  root.innerHTML = sidebarHTML() + mobileBarHTML() + `<div class="main">${content}</div>`;
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
</div>`);
      break;
    case "ops":
      navigate("workflows");
      break;
    default:
      navigate(SECTION_ITEMS[section]?.[0]?.id || "dashboard");
  }
};


// ── Sidebar hover expand/collapse ────────────────────────────
let _sidebarHoverTimer = null;

window.expandSidebar = function() {
  clearTimeout(_sidebarHoverTimer);
  document.getElementById("app")?.classList.remove("sidebar-collapsed");
};

window.collapseSidebar = function() {
  // Small delay so moving between rail and panel doesn't flicker
  _sidebarHoverTimer = setTimeout(() => {
    // Only collapse if not on mobile
    if (window.innerWidth > 640) {
      document.getElementById("app")?.classList.add("sidebar-collapsed");
    }
  }, 300);
};

// Start collapsed on desktop (expand on hover)
(function initSidebarState() {
  if (window.innerWidth > 640) {
    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("app")?.classList.add("sidebar-collapsed");
    });
    // Also set immediately in case DOM is already ready
    if (document.readyState !== "loading") {
      document.getElementById("app")?.classList.add("sidebar-collapsed");
    }
  }
})();

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
  await runOnboarding();
});
