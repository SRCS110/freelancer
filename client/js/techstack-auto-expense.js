// ============================================================
//  Freelancer — client/js/techstack-auto-expense.js
//  Auto-logs finance expenses for tech stack subscriptions
//  when their billing date arrives.
//
//  Rules:
//  - Monthly: logs an expense on the same day each month
//  - Annual:  logs an expense on the renewal_date each year
//  - One-time: never auto-logged (already a sunk cost)
//
//  Duplicate detection: checks existing finances for a matching
//  description + month/year before inserting.
// ============================================================

window.autoLogTechStackExpenses = async function() {
  const stack    = STATE.data.tech_stack || [];
  const finances = STATE.data.finances   || [];
  const today    = new Date();
  const toLog    = [];

  for (const item of stack) {
    if (!item.amount || item.cycle === "one-time") continue;

    if (item.cycle === "monthly") {
      // Check if an expense for this item already exists this month
      const thisMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
      const key       = `Tech Stack: ${item.name}`;
      const alreadyLogged = finances.some(f =>
        f.description === key &&
        f.type        === "expense" &&
        f.date?.startsWith(thisMonth)
      );
      if (!alreadyLogged) {
        toLog.push({
          type:        "expense",
          description: key,
          amount:      Number(item.amount),
          category:    "Software",
          date:        today.toISOString().slice(0, 10),
          notes:       `Auto-logged from Tech Stack (${item.cycle})`,
        });
      }
    }

    if (item.cycle === "annual" && item.renewal_date) {
      // Check if renewal date is today or within the past 3 days (in case app wasn't open)
      const renewal    = new Date(item.renewal_date);
      const daysDiff   = Math.floor((today - renewal) / 86400000);
      if (daysDiff < 0 || daysDiff > 3) continue;

      const thisYear = today.getFullYear().toString();
      const key      = `Tech Stack: ${item.name}`;
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
          date:        item.renewal_date,
          notes:       `Auto-logged from Tech Stack (annual renewal)`,
        });

        // Advance renewal date by 1 year
        const nextRenewal = new Date(renewal);
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
        try {
          await db.update("tech_stack", item.id, {
            renewal_date: nextRenewal.toISOString().slice(0, 10),
          });
        } catch(e) { console.warn("Could not update renewal date:", e.message); }
      }
    }
  }

  // Log all new expenses
  if (toLog.length > 0) {
    for (const entry of toLog) {
      try {
        await db.insert("finances", entry);
      } catch(e) {
        console.warn("Auto-expense failed:", e.message);
      }
    }
    // Reload so new entries appear in finances
    if (STATE.data.tech_stack?.length > 0) {
      await loadAll();
    }
  }
};
