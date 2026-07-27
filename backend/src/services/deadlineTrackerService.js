// backend/src/services/deadlineTrackerService.js
//
// DEADLINE TRACKER
//
// A senior advocate doesn't wait to be asked "what's due soon?" — they
// track it proactively across every open file. The `cases` table already
// has hearing_date and next_action columns, and intake.routes.js now
// writes limitationDeadline/limitationUrgency into cases.metadata when the
// intake orchestrator finds one. This service pulls all of that together
// into one ranked "what needs attention" list instead of the user having
// to open each case individually to check.

const { query } = require('../config/database');

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyFromDays(days) {
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 3) return 'critical';
  if (days <= 14) return 'high';
  if (days <= 30) return 'moderate';
  return 'low';
}

const URGENCY_RANK = { expired: 0, critical: 1, high: 2, moderate: 3, low: 4, unknown: 5 };

/**
 * @param {string} userId
 * @returns {Promise<Array>} one entry per case with an upcoming
 *   hearing_date and/or a stored limitation deadline, sorted most urgent first
 */
async function getUpcomingDeadlines(userId) {
  const { rows } = await query(
    `SELECT id, title, case_number, court_name, hearing_date, next_action, status, metadata
     FROM cases
     WHERE user_id = $1 AND is_archived = FALSE AND status != 'closed'
       AND (hearing_date IS NOT NULL OR metadata->>'limitationDeadline' IS NOT NULL)`,
    [userId]
  );

  const items = [];
  for (const c of rows) {
    if (c.hearing_date) {
      const days = daysUntil(c.hearing_date);
      items.push({
        caseId: c.id,
        title: c.title,
        caseNumber: c.case_number,
        courtName: c.court_name,
        type: 'hearing',
        date: c.hearing_date,
        daysRemaining: days,
        urgency: urgencyFromDays(days),
        note: c.next_action,
      });
    }
    const limitationDeadline = c.metadata?.limitationDeadline;
    if (limitationDeadline) {
      const days = daysUntil(limitationDeadline);
      items.push({
        caseId: c.id,
        title: c.title,
        caseNumber: c.case_number,
        courtName: c.court_name,
        type: 'limitation_deadline',
        date: limitationDeadline,
        daysRemaining: days,
        urgency: c.metadata?.limitationUrgency || urgencyFromDays(days),
        note: 'Filing deadline computed by the limitation calculator — verify independently.',
      });
    }
  }

  items.sort((a, b) => (URGENCY_RANK[a.urgency] ?? 9) - (URGENCY_RANK[b.urgency] ?? 9) || (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));
  return items;
}

module.exports = { getUpcomingDeadlines };
