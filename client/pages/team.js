// ============================================================
//  Freelancer — client/pages/team.js
//  Team management — invite members, set roles, manage access.
// ============================================================

const ROLES = ["admin", "editor", "viewer"];
const ROLE_DESC = {
  admin:  "Can invite members, edit all data, manage settings",
  editor: "Can create and edit clients, projects, invoices, tasks",
  viewer: "Read-only access — can view but not edit anything",
};

function teamHTML() {
  const { teams, team_members, team_invites } = STATE.data;
  const team    = teams?.[0] || null; // single team per account for now
  const members = team_members || [];
  const invites = (team_invites || []).filter(i => !i.accepted);

  if (!team) return _noTeamHTML();
  return _teamDashboardHTML(team, members, invites);
}

// ── No team yet ───────────────────────────────────────────────
function _noTeamHTML() {
  return `
<div class="page-section-header">
  <div>
    <div class="page-title">// team</div>
    <div class="page-sub">collaborate with your crew</div>
  </div>
</div>

<div style="max-width:520px">
  <div class="card">
    <div style="font-family:'JetBrains Mono',monospace;font-size:28px;color:var(--accent);margin-bottom:12px">◎</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px">
      Set up your team
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);line-height:1.7;margin-bottom:20px">
      Create a team workspace to invite collaborators. Members can access clients, projects, and data based on the role you assign them.
    </div>
    <div class="form-group">
      <label class="form-label">Team / Studio Name</label>
      <input id="team-name-input" placeholder="Meridian Creative" style="font-size:13px"/>
    </div>
    <button class="btn btn-primary" onclick="createTeam()">create team →</button>
  </div>
</div>`;
}

// ── Team dashboard ────────────────────────────────────────────
function _teamDashboardHTML(team, members, invites) {
  const currentUserId = STATE.user?.id;
  const myMembership  = members.find(m => m.user_id === currentUserId);
  const isOwner       = team.owner_id === currentUserId;
  const canManage     = isOwner || myMembership?.role === "admin";

  return `
<div class="page-section-header">
  <div>
    <div class="page-title">// team</div>
    <div class="page-sub">${team.name} · ${members.length} member${members.length !== 1 ? "s" : ""}</div>
  </div>
  ${canManage ? `<button class="btn btn-primary" onclick="openInviteModal()">+ invite member</button>` : ""}
</div>

<div id="team-msg" style="display:none;margin-bottom:16px"></div>

<!-- Members -->
<div class="card" style="margin-bottom:20px;padding:0;overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
    <div class="section-title">members</div>
    <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)">${members.length} active</span>
  </div>
  <table class="tbl">
    <thead><tr><th>Member</th><th>Role</th><th>Joined</th>${canManage ? "<th>Actions</th>" : ""}</tr></thead>
    <tbody>
      <!-- Owner row -->
      <tr>
        <td>
          <div style="font-weight:700;color:var(--text)">${STATE.user?.email || "You"}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)">account owner</div>
        </td>
        <td>
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
            color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);
            padding:2px 8px;border-radius:3px;text-transform:uppercase">owner</span>
        </td>
        <td style="color:var(--text-muted);font-family:'JetBrains Mono',monospace;font-size:11px">
          ${fmtDate(team.created_at)}
        </td>
        ${canManage ? "<td>—</td>" : ""}
      </tr>
      ${members.filter(m => m.user_id !== currentUserId).map(m => `
      <tr>
        <td>
          <div style="font-weight:600;color:var(--text)">${m.email || m.user_id}</div>
        </td>
        <td>
          ${canManage
            ? `<select onchange="changeRole('${m.id}',this.value)"
                style="font-family:'JetBrains Mono',monospace;font-size:11px;padding:4px 6px;width:auto;border-radius:3px">
                ${ROLES.map(r => `<option value="${r}"${m.role===r?" selected":""}>${r}</option>`).join("")}
              </select>`
            : `<span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
                color:var(--text-muted);background:var(--border);padding:2px 8px;border-radius:3px;text-transform:uppercase">${m.role}</span>`}
        </td>
        <td style="color:var(--text-muted);font-family:'JetBrains Mono',monospace;font-size:11px">
          ${fmtDate(m.created_at)}
        </td>
        ${canManage ? `<td>
          <button class="btn btn-danger btn-sm" style="font-size:10px" onclick="removeMember('${m.id}','${m.email||m.user_id}')">remove</button>
        </td>` : ""}
      </tr>`).join("")}
    </tbody>
  </table>
</div>

<!-- Pending invites -->
${invites.length > 0 ? `
<div class="card" style="padding:0;overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
    <div class="section-title">pending invites</div>
    <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--warning)">${invites.length} awaiting</span>
  </div>
  <table class="tbl">
    <thead><tr><th>Email</th><th>Role</th><th>Expires</th><th>Actions</th></tr></thead>
    <tbody>
      ${invites.map(i => `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px">${i.email}</td>
        <td><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted);text-transform:uppercase">${i.role}</span></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted)">${fmtDate(i.expires_at)}</td>
        <td>
          <div class="btn-row">
            <button class="btn btn-ghost btn-sm" style="font-size:10px" onclick="copyInviteLink('${i.token}')">copy link</button>
            <button class="btn btn-danger btn-sm" style="font-size:10px" onclick="cancelInvite('${i.id}')">cancel</button>
          </div>
        </td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- Role guide -->
<div class="card" style="margin-top:20px">
  <div class="section-title" style="margin-bottom:14px">role permissions</div>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${Object.entries(ROLE_DESC).map(([role, desc]) => `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
        color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);
        padding:2px 8px;border-radius:3px;text-transform:uppercase;flex-shrink:0;margin-top:2px">${role}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);line-height:1.5">${desc}</span>
    </div>`).join("")}
    <div style="display:flex;gap:12px;align-items:flex-start">
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;
        color:var(--text);background:var(--border);
        padding:2px 8px;border-radius:3px;text-transform:uppercase;flex-shrink:0;margin-top:2px">owner</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);line-height:1.5">Full access — can delete the team, transfer ownership, and manage all billing</span>
    </div>
  </div>
</div>`;
}

// ── Create team ───────────────────────────────────────────────
window.createTeam = async function() {
  const name = document.getElementById("team-name-input")?.value.trim();
  if (!name) return;
  try {
    const team = await db.insert("teams", { name, owner_id: STATE.user.id });
    const teamId = Array.isArray(team) ? team[0]?.id : team?.id;
    // Add owner as member
    if (teamId) {
      await db.insert("team_members", {
        team_id: teamId, user_id: STATE.user.id, role: "owner",
      });
    }
    await loadAll(); render();
  } catch(e) { alert(e.message); }
};

// ── Invite modal ──────────────────────────────────────────────
window.openInviteModal = function() {
  const team = STATE.data.teams?.[0];
  if (!team) return;

  showModal(`
<div class="modal-header">
  <div class="modal-title">invite team member</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div class="form-group">
  <label class="form-label">Email Address</label>
  <input id="invite-email" type="email" placeholder="colleague@example.com"
    onkeydown="if(event.key==='Enter') sendInvite()"/>
</div>
<div class="form-group">
  <label class="form-label">Role</label>
  <select id="invite-role">
    ${ROLES.map(r => `<option value="${r}"${r==="editor"?" selected":""}>${r} — ${ROLE_DESC[r]}</option>`).join("")}
  </select>
</div>
<div style="padding:10px 14px;background:var(--bg);border-radius:4px;border:1px solid var(--border);
  font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted);line-height:1.6;margin-bottom:4px">
  An email with a secure invite link will be sent. The link expires in 7 days.
</div>
<div class="modal-actions">
  <button class="btn btn-ghost" onclick="closeModal()">cancel</button>
  <button class="btn btn-primary" id="invite-btn" onclick="sendInvite()">send invite →</button>
</div>`);
  setTimeout(() => document.getElementById("invite-email")?.focus(), 100);
};

window.sendInvite = async function() {
  const email = document.getElementById("invite-email")?.value.trim();
  const role  = document.getElementById("invite-role")?.value;
  const team  = STATE.data.teams?.[0];
  if (!email || !team) return;

  const btn = document.getElementById("invite-btn");
  btn.disabled = true; btn.textContent = "sending…";

  try {
    // Generate a random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2,"0")).join("");

    await db.insert("team_invites", {
      team_id:    team.id,
      email,
      role,
      token,
      invited_by: STATE.user.id,
    });

    // Send invite email via Supabase Edge Function (or show link to copy)
    const inviteUrl = `${window.location.origin}/index.html?invite=${token}`;

    closeModal();
    await loadAll();

    // Show the invite link so it can be copied/sent manually
    // (full email delivery requires an Edge Function — see docs)
    showModal(`
<div class="modal-header">
  <div class="modal-title">invite sent</div>
  <button class="modal-close" onclick="closeModal()">×</button>
</div>
<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);margin-bottom:16px;line-height:1.6">
  Share this link with <strong style="color:var(--text)">${email}</strong>.<br/>
  It expires in 7 days.
</div>
<div style="display:flex;gap:8px;align-items:center">
  <input value="${inviteUrl}" readonly
    style="flex:1;font-size:11px;background:var(--bg);border-color:var(--border);cursor:text"/>
  <button class="btn btn-primary btn-sm" onclick="navigator.clipboard.writeText('${inviteUrl}');this.textContent='copied!';setTimeout(()=>this.textContent='copy',1500)">copy</button>
</div>
<div class="modal-actions" style="margin-top:16px">
  <button class="btn btn-primary" onclick="closeModal()">done</button>
</div>`);
  } catch(e) {
    alert(e.message);
    btn.disabled = false; btn.textContent = "send invite →";
  }
};

// ── Role change ───────────────────────────────────────────────
window.changeRole = async function(memberId, newRole) {
  try {
    await db.update("team_members", memberId, { role: newRole });
    loadAll();
  } catch(e) { alert(e.message); }
};

// ── Remove member ─────────────────────────────────────────────
window.removeMember = async function(memberId, name) {
  if (!confirm(`Remove ${name} from the team?`)) return;
  try {
    await db.delete("team_members", memberId);
    loadAll();
  } catch(e) { alert(e.message); }
};

// ── Invite actions ────────────────────────────────────────────
window.copyInviteLink = function(token) {
  const url = `${window.location.origin}/index.html?invite=${token}`;
  navigator.clipboard.writeText(url);
  const msg = document.getElementById("team-msg");
  if (msg) {
    msg.innerHTML = `<div class="msg-ok">Invite link copied to clipboard.</div>`;
    msg.style.display = "block";
    setTimeout(() => msg.style.display = "none", 3000);
  }
};

window.cancelInvite = async function(id) {
  if (!confirm("Cancel this invite?")) return;
  await db.delete("team_invites", id); loadAll();
};

// ── Accept invite (runs on boot if ?invite= param present) ───
window.handleInviteToken = async function() {
  const token = new URLSearchParams(window.location.search).get("invite");
  if (!token) return;

  try {
    // Fetch invite by token (public read needed — or use Edge Function)
    const invites = await db.list("team_invites", `token=eq.${token}&accepted=eq.false`);
    const invite  = invites?.[0];
    if (!invite) { alert("This invite link is invalid or has expired."); return; }
    if (new Date(invite.expires_at) < new Date()) { alert("This invite link has expired."); return; }

    // Add user to team
    await db.insert("team_members", {
      team_id:   invite.team_id,
      user_id:   STATE.user.id,
      role:      invite.role,
    });

    // Mark invite accepted
    await db.update("team_invites", invite.id, { accepted: true });

    // Clear URL param
    window.history.replaceState({}, "", window.location.pathname);

    await loadAll();
    showModal(`
<div class="modal-header"><div class="modal-title">welcome to the team!</div><button class="modal-close" onclick="closeModal()">×</button></div>
<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-muted);margin-bottom:20px;line-height:1.6">
  You've joined the team as <strong style="color:var(--accent)">${invite.role}</strong>. You now have access to the shared workspace.
</div>
<div class="modal-actions"><button class="btn btn-primary" onclick="closeModal()">get started</button></div>`);
  } catch(e) {
    console.warn("Invite handling error:", e.message);
  }
};

window.teamHTML = teamHTML;
