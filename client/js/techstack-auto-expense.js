// ============================================================
//  Freelancer — client/js/techstack-auto-expense.js
//  Auto-logs finance expenses for tech stack subscriptions.
//
//  On every boot:
//  1. Checks last_login stored in user_settings
//  2. For every missed month between last login and today,
//     back-fills any monthly/annual expenses not yet logged
//  3. Updates last_login to today
//
//  Duplicate detection prevents double-logging.
// ============================================================

window.autoLogTechStackExpenses = async function() {
  const stack    = STATE.data.tech_stack    || [];
  const finances = STATE.data.finances      || [];
  const settings = STATE.data.user_settings || {};
  const today    = new Date();
  const toLog    = [];

  if (stack.length === 0) return;

  // ── Determine date range to check ───────────────────────────
  // Use last_login from user_settings, default to 35 days ago
  // so we always catch at least the previous month on first run
  const lastLoginStr = settings.last_login;
  const lastLogin    = lastLoginStr
    ? new Date(lastLoginStr)
    : new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  // ── Build list of months between last login and today ───────
  function monthsBetween(from, to) {
    const months = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end    = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= end) {
      months.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  const monthsToCheck = monthsBetween(lastLogin, today);

  // ── Check each stack item against each month ─────────────────
  for (const item of stack) {
    if (!item.amount || Number(item.amount) === 0) continue;
    if (item.cycle === "one-time") continue;

    const key        = `Tech Stack: ${item.name}`;
    const renewalDay = item.renewal_date
      ? new Date(item.renewal_date).getUTCDate()
      : 1;

    if (item.cycle === "monthly") {
      for (const monthStart of monthsToCheck) {
        const year  = monthStart.getFullYear();
        const month = monthStart.getMonth();

        // Billing date for this month
        const billingDate = new Date(year, month, renewalDay);

        // Skip if billing date hasn't arrived yet
        if (billingDate > today) continue;

        // Skip if item didn't exist yet (renewal_date after billing date)
        if (item.renewal_date && new Date(item.renewal_date) > billingDate) continue;

        // Check if already logged this month
        const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
        const alreadyLogged = finances.some(f =>
          f.description === key &&
          f.type        === "expense" &&
          f.date?.startsWith(monthKey)
        ) || toLog.some(e =>
          e.description === key &&
          e.date?.startsWith(monthKey)
        );

        if (!alreadyLogged) {
          toLog.push({
            type:        "expense",
            description: key,
            amount:      Number(item.amount),
            category:    "Software",
            date:        billingDate.toISOString().slice(0, 10),
            notes:       `Auto-logged from Tech Stack (monthly)`,
          });
        }
      }
    }

    if (item.cycle === "annual" && item.renewal_date) {
      const renewal  = new Date(item.renewal_date);
      const thisYear = today.getFullYear().toString();

      // Check if annual renewal falls within the missed period
      const renewalThisYear = new Date(today.getFullYear(), renewal.getMonth(), renewal.getDate());
      if (renewalThisYear > lastLogin && renewalThisYear <= today) {
        const alreadyLogged = finances.some(f =>
          f.description === key &&
          f.type        === "expense" &&
          f.date?.startsWith(thisYear)
        );
        if (!alreadyLogged) {
          toLog.push({
            type:        "expense",
            description: key,
            amount:      Number(item.amount),
            category:    "Software",
            date:        renewalThisYear.toISOString().slice(0, 10),
            notes:       `Auto-logged from Tech Stack (annual renewal)`,
          });

          // Advance renewal date by 1 year
          try {
            const nextRenewal = new Date(renewal);
            nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
            await db.update("tech_stack", item.id, {
              renewal_date: nextRenewal.toISOString().slice(0, 10),
            });
          } catch(e) { console.warn("Could not advance renewal date:", e.message); }
        }
      }
    }
  }

  // ── Insert all missing entries ───────────────────────────────
  if (toLog.length > 0) {
    console.log(`Auto-logging ${toLog.length} missed tech stack expense(s)`);
    for (const entry of toLog) {
      try {
        await db.insert("finances", entry);
      } catch(e) {
        console.warn("Auto-expense failed:", entry.description, e.message);
      }
    }
    await loadAll();
  }

  // ── Update last_login to today ───────────────────────────────
  try {
    const todayStr = today.toISOString().slice(0, 10);
    if (settings?.id) {
      await db.update("user_settings", settings.id, { last_login: todayStr });
    } else {
      await db.upsert("user_settings", { last_login: todayStr }, "user_id");
    }
  } catch(e) {
    console.warn("Could not update last_login:", e.message);
  }
};
