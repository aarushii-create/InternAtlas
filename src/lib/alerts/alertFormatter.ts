import { NotificationPayload, FormattedAlertMessage } from '../../types';

/**
 * Escapes characters for Telegram MarkdownV2 syntax.
 * Characters to escape: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdownV2(text: string): string {
  if (!text) return '';
  return text.replace(/([_\*\[\]\(\)~`>#\+\-\=\|\{\}\.\!])/g, '\\$1');
}

/**
 * Generates mobile-optimized Telegram messages (HTML and MarkdownV2)
 */
export function formatTelegramAlert(payload: NotificationPayload): {
  html: string;
  markdownV2: string;
  inlineButtons: Array<{ text: string; url: string }>;
} {
  const scoreEmoji = payload.matchPercentage >= 90 ? '🌟' : payload.matchPercentage >= 75 ? '⚡' : '🔍';
  const scorePercentStr = `${payload.matchPercentage}%`;
  
  // Matched and missing skills
  const matchedPills = payload.matchedSkills && payload.matchedSkills.length > 0 
    ? payload.matchedSkills.slice(0, 6).join(', ') 
    : 'General CS fundamentals';
  const missingPills = payload.missingSkills && payload.missingSkills.length > 0 
    ? payload.missingSkills.slice(0, 4).join(', ') 
    : 'None detected (Full stack match)';

  // Layer 2 Real Expectation summary
  const l2 = payload.layer2Expectations || {};
  const oaNote = l2.oaDifficulty ? `\n• <b>OA Standard:</b> ${l2.oaDifficulty}` : '';
  const gpaNote = l2.gpaBar ? `\n• <b>GPA Filter:</b> ${l2.gpaBar}` : '';
  const criteriaNote = l2.unspokenCriteria ? `\n• <b>Hidden Criteria:</b> ${l2.unspokenCriteria}` : '';
  const timeNote = l2.timeWindow ? `\n• <b>Speed Window:</b> ${l2.timeWindow}` : '';

  // HTML format (clean, readable on Telegram client)
  const html = `🎯 <b>HIGH MATCH SCOUT ALERT: ${scorePercentStr}</b> ${scoreEmoji}

🏢 <b>${payload.companyName}</b> — <i>${payload.jobTitle}</i>
📍 <code>${payload.location || 'Remote / Hybrid'}</code>
📊 <b>Match Verdict:</b> <code>${payload.verdict.replace(/_/g, ' ')}</code> ${payload.salarySnippet ? `| 💰 <b>${payload.salarySnippet}</b>` : ''}

───────────────
✅ <b>Matched Skills:</b>
<code>${matchedPills}</code>

⚠️ <b>Gap Areas to Prepare:</b>
<code>${missingPills}</code>

───────────────
🧠 <b>Layer 2 Reality Check (Crucial Insights):</b>${oaNote || '\n• <b>OA Standard:</b> LeetCode Medium/Hard'}${criteriaNote || '\n• <b>Hidden Criteria:</b> Rolling admissions - early applicants prioritized'}${gpaNote}${timeNote}

⚡ <b>Action:</b> High match threshold met for <b>${payload.candidateName}</b>. Apply immediately before quota closes!

🔗 <a href="${payload.applyUrl}"><b>👉 DIRECT APPLY LINK & ATS PORTAL</b></a>`;

  // MarkdownV2 format
  const escCompany = escapeMarkdownV2(payload.companyName);
  const escTitle = escapeMarkdownV2(payload.jobTitle);
  const escLoc = escapeMarkdownV2(payload.location || 'Remote / Hybrid');
  const escScore = escapeMarkdownV2(scorePercentStr);
  const escVerdict = escapeMarkdownV2(payload.verdict.replace(/_/g, ' '));
  const escMatched = escapeMarkdownV2(matchedPills);
  const escMissing = escapeMarkdownV2(missingPills);
  const escCandidate = escapeMarkdownV2(payload.candidateName);
  const escUrl = payload.applyUrl;

  const mdOa = l2.oaDifficulty ? `\n• *OA Standard:* ${escapeMarkdownV2(l2.oaDifficulty)}` : '';
  const mdCriteria = l2.unspokenCriteria ? `\n• *Hidden Criteria:* ${escapeMarkdownV2(l2.unspokenCriteria)}` : '';

  const markdownV2 = `🎯 *HIGH MATCH SCOUT ALERT: ${escScore}* ${scoreEmoji}

🏢 *${escCompany}* — _${escTitle}_
📍 \`${escLoc}\`
📊 *Match Verdict:* \`${escVerdict}\`

───────────────
✅ *Matched Skills:*
\`${escMatched}\`

⚠️ *Gap Areas to Prepare:*
\`${escMissing}\`

───────────────
🧠 *Layer 2 Reality Check:*${mdOa || '\n• *OA Standard:* LeetCode Medium/Hard'}${mdCriteria || '\n• *Hidden Criteria:* Rolling admissions \\- apply early'}

⚡ *Action:* Threshold met for *${escCandidate}*\\.
[👉 DIRECT APPLY LINK](${escUrl})`;

  const candidateIdEnc = encodeURIComponent(payload.candidateName.toLowerCase().replace(/\s+/g, '-'));
  const jobIdEnc = encodeURIComponent(payload.jobId);
  const scoreEnc = encodeURIComponent(String(payload.matchScore));
  const baseUrl = 'https://internship-scout.ai';

  return {
    html,
    markdownV2,
    inlineButtons: [
      { text: `🚀 Apply to ${payload.companyName}`, url: payload.applyUrl },
      { text: '✅ Applied', url: `${baseUrl}/api/feedback/action?jobId=${jobIdEnc}&action=APPLIED&candidateId=${candidateIdEnc}&score=${scoreEnc}` },
      { text: '⏭️ Skip', url: `${baseUrl}/api/feedback/action?jobId=${jobIdEnc}&action=SKIPPED&candidateId=${candidateIdEnc}&score=${scoreEnc}` },
      { text: '🚫 Irrelevant', url: `${baseUrl}/api/feedback/action?jobId=${jobIdEnc}&action=IRRELEVANT&candidateId=${candidateIdEnc}&score=${scoreEnc}` },
    ],
  };
}

/**
 * Generates modern, responsive HTML Email alert formatted for mobile & desktop clients
 */
export function formatEmailAlert(payload: NotificationPayload): {
  subject: string;
  html: string;
  plainText: string;
} {
  const scorePercent = payload.matchPercentage;
  const scoreColor = scorePercent >= 90 ? '#10b981' : scorePercent >= 75 ? '#6366f1' : '#f59e0b';
  const scoreBg = scorePercent >= 90 ? '#064e3b' : scorePercent >= 75 ? '#312e81' : '#78350f';
  const scoreEmoji = scorePercent >= 90 ? '🌟' : scorePercent >= 75 ? '⚡' : '🎯';

  const subject = `[${scorePercent}% Match] ${payload.companyName} is hiring: ${payload.jobTitle} ${scoreEmoji}`;

  const matchedPills = (payload.matchedSkills || ['Core CS fundamentals'])
    .slice(0, 8)
    .map(
      (s) =>
        `<span style="display:inline-block; background-color: #064e3b; color: #6ee7b7; border: 1px solid #059669; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin: 3px 4px 3px 0;">✓ ${escapeHtml(
          s
        )}</span>`
    )
    .join('');

  const missingPills =
    payload.missingSkills && payload.missingSkills.length > 0
      ? payload.missingSkills
          .slice(0, 4)
          .map(
            (s) =>
              `<span style="display:inline-block; background-color: #451a03; color: #fdba74; border: 1px solid #b45309; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin: 3px 4px 3px 0;">⚡ ${escapeHtml(
                s
              )}</span>`
          )
          .join('')
      : `<span style="color: #94a3b8; font-size: 13px; font-style: italic;">No critical gaps detected! Full stack alignment.</span>`;

  const l2 = payload.layer2Expectations || {};

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 24px; border-bottom: 1px solid #374151; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 14px; font-weight: 750; letter-spacing: 0.5px; }
    .content { padding: 24px; }
    .reality-box { background: linear-gradient(to right, rgba(99,102,241,0.1), rgba(16,185,129,0.08)); border-left: 4px solid #6366f1; padding: 16px; border-radius: 0 12px 12px 0; margin: 20px 0; }
    .button { display: block; text-align: center; background: linear-gradient(135deg, #4f46e5 0%, #10b981 100%); color: #ffffff !important; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 28px; border-radius: 12px; margin: 24px 0 12px 0; box-shadow: 0 10px 15px -3px rgba(79,70,229,0.4); }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19;">
  <div class="container">
    <div class="card">
      <!-- Top Banner -->
      <div class="header">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #a5b4fc; font-weight: 700;">AI Internship Scout • Instant Match Alert</span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; color: #ffffff; font-weight: 800; line-height: 1.3;">
                ${escapeHtml(payload.companyName)}
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 16px; color: #cbd5e1; font-weight: 500;">
                ${escapeHtml(payload.jobTitle)}
              </p>
            </td>
            <td align="right" valign="top" style="width: 110px;">
              <div style="background-color: ${scoreBg}; color: ${scoreColor}; border: 1.5px solid ${scoreColor}; padding: 8px 12px; border-radius: 12px; text-align: center;">
                <div style="font-size: 24px; font-weight: 900; line-height: 1;">${scorePercent}%</div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 3px; letter-spacing: 0.5px;">Match Score</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Body -->
      <div class="content">
        <!-- Metadata Pill Row -->
        <div style="margin-bottom: 20px; font-size: 13px; color: #94a3b8;">
          <span>📍 <strong>Location:</strong> ${escapeHtml(payload.location || 'Remote / US')}</span>
          ${payload.salarySnippet ? `<span style="margin-left: 16px;">💰 <strong>Comp:</strong> ${escapeHtml(payload.salarySnippet)}</span>` : ''}
          ${payload.sourceAts ? `<span style="margin-left: 16px;">🏢 <strong>ATS:</strong> ${escapeHtml(payload.sourceAts.toUpperCase())}</span>` : ''}
        </div>

        <!-- Matched Skills Section -->
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #34d399; font-weight: 700;">
            ✓ High-Value Matched Skills (${payload.matchedSkills?.length || 0})
          </h3>
          <div>${matchedPills}</div>
        </div>

        <!-- Missing Skills / Gap Areas -->
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #fbbf24; font-weight: 700;">
            ⚡ Quick-Prep Topics & Potential Gaps
          </h3>
          <div>${missingPills}</div>
        </div>

        <!-- Layer 2 Reality Check Box -->
        <div class="reality-box">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 16px; margin-right: 6px;">🧠</span>
            <strong style="color: #a5b4fc; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
              Layer 2 Reality Expectation Note
            </strong>
          </div>
          <table width="100%" cellpadding="4" cellspacing="0" border="0" style="font-size: 13px; color: #e2e8f0;">
            ${l2.oaDifficulty ? `<tr><td style="width: 140px; color: #94a3b8; font-weight: 600;">• OA Standard:</td><td><strong>${escapeHtml(l2.oaDifficulty)}</strong></td></tr>` : '<tr><td style="width: 140px; color: #94a3b8; font-weight: 600;">• OA Standard:</td><td><strong>LeetCode Medium (DP/Graphs)</strong></td></tr>'}
            ${l2.unspokenCriteria ? `<tr><td style="color: #94a3b8; font-weight: 600;">• Hidden Filter:</td><td>${escapeHtml(l2.unspokenCriteria)}</td></tr>` : '<tr><td style="color: #94a3b8; font-weight: 600;">• Hidden Filter:</td><td>Rolling applications; first 250 reviewed within 48h</td></tr>'}
            ${l2.gpaBar ? `<tr><td style="color: #94a3b8; font-weight: 600;">• Academic Filter:</td><td>${escapeHtml(l2.gpaBar)}</td></tr>` : ''}
            ${l2.timeWindow ? `<tr><td style="color: #94a3b8; font-weight: 600;">• Turnaround:</td><td>${escapeHtml(l2.timeWindow)}</td></tr>` : ''}
          </table>
        </div>

        <!-- Call to Action -->
        <a href="${payload.applyUrl}" class="button" target="_blank" rel="noopener noreferrer">
          🚀 Apply to ${escapeHtml(payload.companyName)} Immediately →
        </a>

        <!-- Interactive 1-Click Feedback Action Bar -->
        <div style="margin-top: 16px; padding: 14px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px;">
            ⚡ Quick Action Feedback (Calibrates Future Alert Thresholds)
          </div>
          <table width="100%" cellpadding="0" cellspacing="4" border="0">
            <tr>
              <td width="33%" align="center">
                <a href="https://internship-scout.ai/api/feedback/action?jobId=${encodeURIComponent(payload.jobId)}&action=APPLIED&candidateId=${encodeURIComponent(payload.candidateName.toLowerCase().replace(/\s+/g, '-'))}&score=${encodeURIComponent(String(payload.matchScore))}" style="display: block; padding: 8px 6px; background-color: #064e3b; color: #6ee7b7; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid #059669;" target="_blank">
                  ✅ Applied
                </a>
              </td>
              <td width="33%" align="center">
                <a href="https://internship-scout.ai/api/feedback/action?jobId=${encodeURIComponent(payload.jobId)}&action=SKIPPED&candidateId=${encodeURIComponent(payload.candidateName.toLowerCase().replace(/\s+/g, '-'))}&score=${encodeURIComponent(String(payload.matchScore))}" style="display: block; padding: 8px 6px; background-color: #1e293b; color: #cbd5e1; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid #334155;" target="_blank">
                  ⏭️ Skip
                </a>
              </td>
              <td width="33%" align="center">
                <a href="https://internship-scout.ai/api/feedback/action?jobId=${encodeURIComponent(payload.jobId)}&action=IRRELEVANT&candidateId=${encodeURIComponent(payload.candidateName.toLowerCase().replace(/\s+/g, '-'))}&score=${encodeURIComponent(String(payload.matchScore))}" style="display: block; padding: 8px 6px; background-color: #450a0a; color: #fca5a5; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid #dc2626;" target="_blank">
                  🚫 Irrelevant
                </a>
              </td>
            </tr>
          </table>
        </div>

        <p style="text-align: center; margin: 12px 0 0 0; font-size: 12px; color: #64748b;">
          Candidate Profile: <strong>${escapeHtml(payload.candidateName)}</strong> • Dispatched in real-time
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        You are receiving this alert because your composite match score exceeds your threshold.
        <br>
        AI Internship Scout • Continuous Pipeline & High-Precision Matching
      </div>
    </div>
  </div>
</body>
</html>`;

  const plainText = `[${scorePercent}% Match Alert] ${payload.companyName} - ${payload.jobTitle}

Company: ${payload.companyName}
Role: ${payload.jobTitle}
Location: ${payload.location || 'Remote'}
Match Score: ${scorePercent}% (${payload.verdict})

Matched Skills: ${payload.matchedSkills?.join(', ') || 'General fundamentals'}
Missing Skills: ${payload.missingSkills?.join(', ') || 'None'}

Layer 2 Reality Expectation:
- OA Standard: ${l2.oaDifficulty || 'LeetCode Medium'}
- Hidden Criteria: ${l2.unspokenCriteria || 'Rolling admissions'}
- Speed Window: ${l2.timeWindow || 'Apply within 24h'}

Direct Apply Link:
${payload.applyUrl}

Candidate: ${payload.candidateName}
Dispatched by AI Internship Scout.`;

  return { subject, html, plainText };
}

/**
 * Escape HTML special chars
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a comprehensive alert message payload containing both Telegram and Email representations
 */
export function formatAlertMessage(payload: NotificationPayload): FormattedAlertMessage {
  const telegram = formatTelegramAlert(payload);
  const email = formatEmailAlert(payload);

  return {
    telegram: {
      text: telegram.html,
      parseMode: 'HTML',
      inlineButtons: telegram.inlineButtons,
    },
    email,
  };
}
