'use strict';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const seed = [
  {
    id: 'CS-1042', initial: 'AM', name: 'Alex Morgan',
    subject: 'Remote Monitor data transfer issue', type: 'Technical support', priority: 'Follow-up due',
    owner: 'Unassigned', monitor: 'Model 5106 · Tablet Remote Monitor',
    deviceId: 'DEMO-RM-5106-74219', rga: 'RGA-DEMO-318', nextContact: 'Today · by 3:00 PM',
    report: 'My Remote Monitor has not been sending my RNS System data since yesterday. It shows a connection message. I would like help figuring out what to do next.',
    impact: 'My morning routine is getting interrupted, and I do not want to wonder whether my care team is receiving what they need.',
    note: '', quality: false, complaintRequired: true, reviewed: false, service: 0,
    events: ['Support request received · Today, 09:12']
  },
  {
    id: 'CS-1041', initial: 'JL', name: 'Jordan Lee',
    subject: 'Care-partner assistance with the data-sharing routine', type: 'Care-partner support', priority: 'Permission check needed',
    owner: 'Unassigned', monitor: 'Model 5100 · Laptop Remote Monitor',
    deviceId: 'DEMO-RM-5100-73104', rga: 'Not applicable · no replacement', nextContact: 'Today · agree a time with Jordan',
    report: 'My partner helps me with the Remote Monitor. Can you walk us through the right information together? I want to stay involved, but I get overwhelmed when too much is explained at once.',
    impact: 'I want help that lets me keep control of my routine, without my partner having to guess what to do.',
    note: '', quality: false, complaintRequired: false, reviewed: false, service: 0,
    events: ['Joint support request received · Today, 10:20']
  },
  {
    id: 'CS-1039', initial: 'TC', name: 'Taylor Casey',
    subject: 'New sensation reported; asks about device settings', type: 'Clinical handoff & device concern', priority: 'Prompt escalation required',
    owner: 'Unassigned', monitor: 'Implanted RNS System · model not yet verified',
    deviceId: 'Not verified · do not infer', rga: 'Not applicable · no replacement authorized', nextContact: 'Prompt handoff · confirm next update',
    report: 'I have noticed an unfamiliar sensation near my implant. I do not know if it is related. Can someone change my device settings?',
    impact: 'I want someone to take this seriously and tell me who can help, without having to retell the whole story.',
    note: '', quality: false, complaintRequired: true, reviewed: false, service: 0,
    events: ['Patient report received · Today, 11:05']
  }
];

function freshCases() {
  return structuredClone(seed).map(x => ({...x, returnReceived: false, qualityAccepted: false,
    evidence: [], replacementId: x.id === 'CS-1042' ? x.deviceId + '-R' : 'Not applicable',
    additionalReport: x.id === 'CS-1042' ? 'The Remote Monitor has repeatedly stopped functioning.' : ''}));
}
let cases = freshCases();
let page = 'overview';
let selected = 'CS-1042';
let subtab = 'intake';
let guided = false;
let inventoryResolved = false;
let planSaved = false;
let insightPeriod = '30';
let managerChoice = '';
let priorityChoice = '';
let orderChoice = '';
let coachingChoice = '';

const names = {
  overview: 'The support journey',
  cases: 'Case workspace',
  inventory: 'Device operations',
  insights: 'Service insights',
  leadership: 'Leading the operation',
  about: 'About this project'
};

const main = $('#main');
const currentCase = () => cases.find((item) => item.id === selected);
const tag = (label, className = '') => `<span class="tag ${className}">${esc(label)}</span>`;
const serviceNames = ['Open', 'Replacement prepared', 'Replacement dispatched', 'Delivery confirmed', 'Support follow-up confirmed', 'Service resolved'];

const caseStages = {
  'CS-1041': ['Open', 'Permission verified', 'Support preferences agreed', 'Approved guidance reviewed together', 'Understanding checked', 'Service resolved'],
  'CS-1039': ['Open', 'Report preserved and routed', 'Clinical handoff requested', 'Clinical handoff accepted', 'Next communication confirmed', 'Service coordination complete']
};
const statusOf = x => (caseStages[x.id] || serviceNames)[x.service];
const caseScenario = x => x.id === 'CS-1041' ? 'Patient-led assistance' : x.id === 'CS-1039' ? 'Clinical handoff' : 'Technical service';

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 3500);
}

function addEvent(message) {
  currentCase().events.unshift(`${message} · Just now`);
}

function go(nextPage, focus = false) {
  if (!names[nextPage]) return;
  page = nextPage;
  if (nextPage === 'overview') selected = 'CS-1042';
  history.replaceState(null, '', `#${nextPage}`);
  render();
  $('#nav').classList.remove('open');
  $('#menu').setAttribute('aria-expanded', 'false');
  $('#menu').textContent = 'Menu ☰';
  if (focus) main.focus();
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function openCase(id, start = false) {
  if (!cases.some((item) => item.id === id)) throw Error('Unknown case');
  selected = id;
  subtab = 'intake';
  guided = start;
  go('cases', true);
}

function head(kicker, title, description, action = '') {
  return `<div class="page-head"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}

function stats() {
  const items = [
    ['Active service cases', cases.filter((item) => item.service < 5).length, 'In this sample queue', '▤'],
    ['Quality handoffs pending', cases.filter((item) => item.complaintRequired && !item.qualityAccepted).length, 'Routing is not acceptance', '↗'],
    ['Operations exceptions', 2 + Number(!inventoryResolved), 'Record integrity / RGA / stock', '▣'],
    ['Unassigned cases', cases.filter((item) => item.owner === 'Unassigned').length, 'Ownership should be visible', '◎']
  ];
  return `<div class="stats">${items.map(([label, value, note, icon]) => `<article class="card stat"><div class="stat-top">${label}<span class="icon-well" aria-hidden="true">${icon}</span></div><span class="value">${String(value).padStart(2, '0')}</span><small>${note}</small></article>`).join('')}</div>`;
}

function chapter(number, id, title, intro, body, complete = false) {
  return `<section class="story-chapter" id="${id}" aria-labelledby="${id}-title"><div class="chapter-heading"><span class="chapter-number" aria-label="Step ${number}">${number}</span><div><p class="eyebrow">${complete ? 'ACTION RECORDED' : 'THE SUPPORT JOURNEY'}</p><h2 id="${id}-title">${title}</h2><p>${intro}</p></div></div><div class="chapter-content">${body}</div></section>`;
}

function overview() {
  const x = currentCase();
  return `<section class="story-intro">
    <p class="eyebrow">PATIENT SUPPORT & DEVICE OPERATIONS · A CONCEPT BY JOE HU</p>
    <h1>Support that leaves more room for life.</h1>
    <p class="lead">In Janie’s story, independence means being able to take her children somewhere without arranging help. That detail stayed with me. For someone living with epilepsy, an ordinary plan can carry extraordinary meaning. I built CareOps to show how I would lead the quieter work that supports those lives: a clear answer today, and records the next team can trust tomorrow.</p>
    <a class="source-note" href="https://www.neuropace.com/stories/janies-story/" target="_blank" rel="noopener">Read Janie’s account on NeuroPace’s site ↗</a>
    <p class="story-disclosure">Three interactive, fictional cases informed by public NeuroPace patient resources and stories. Individual clinical outcomes vary. No real patient information, clinical triage or medical advice.</p>
    <div class="thesis-line"><strong>My operating principle:</strong> ask what matters to the person, then make a promise the team can keep. Give that promise an owner and evidence of follow-through.</div>
    <a class="button primary" href="#listen">Follow Alex’s case <span aria-hidden="true">↓</span></a>
    <div class="reviewer-path"><span>Explore my approach</span><a href="#listen">Follow a patient case</a><button data-nav="leadership">Make a manager’s decision →</button><button data-nav="about">See the experience behind it →</button></div>
  </section>
  <section class="case-entry card"><p class="eyebrow">THREE PEOPLE · THREE DIFFERENT SUPPORT NEEDS</p><h2>The workflow should fit the person.</h2><div class="scenario-facts">${cases.map(c => `<div><strong>${esc(c.name)}</strong><p>${caseScenario(c)}</p><p class="note">${c.id === 'CS-1042' ? 'Restore the data-sharing routine while preserving a device-performance concern.' : c.id === 'CS-1041' ? 'Include a care partner with permission. Let the patient set the pace.' : 'Take a concern seriously without diagnosing it or changing device settings.'}</p><button data-case="${c.id}">Open ${esc(c.name.split(' ')[0])}’s case →</button></div>`).join('')}</div><p class="note">The guided journey below follows Alex. Each case has its own interactive support pathway in Case records.</p></section>
  <nav class="journey-nav" aria-label="Journey chapters"><a href="#listen" aria-label="Step 1">1</a><a href="#coordinate" aria-label="Step 2">2</a><a href="#follow" aria-label="Step 3">3</a><a href="#reconcile" aria-label="Step 4">4</a><a href="#learn" aria-label="Step 5">5</a></nav>` +
  chapter(1, 'listen', 'Start with what Alex needs.', 'Alex wants to know what happens next. Preserve the report, ask how they would prefer to hear back, and agree on a realistic update time. Invite a care partner only with the patient’s permission.', `
    <div class="patient-story">
      <p class="eyebrow">ALEX MORGAN · FICTIONAL PATIENT</p>
      <blockquote>“${esc(x.report)}”</blockquote>
      <small>Original report · ${x.id}</small>
      <div class="patient-goal"><span>IMPACT ON THE PATIENT’S ROUTINE</span><strong>${esc(x.impact)}</strong></div>
    </div>
    <div class="story-action card">
      <div class="story-pair">
        <div><h3>Make the next update useful.</h3><p class="muted">“Alex, I hear that this is interrupting your morning and leaving you unsure about the data transfer. I’ll check the right support path for your monitor. We’ll agree on a callback time, and I’ll update you then even if the next step is still pending.”</p><h3>Keep the original report.</h3><p class="muted">The original wording may matter later to Service, Quality, or another teammate. Summaries can be useful, but the source report should remain available.</p></div>
        <div><h3>Match the resource to the device.</h3><p class="muted">${esc(x.monitor)}. NeuroPace publishes separate patient materials for tablet and laptop Remote Monitors. Model awareness should happen before guidance is sent.</p></div>
      </div>
      <form id="intake-form"><div class="field-inline">
        <label class="field"><span>Service owner</span><select id="owner" required><option value="">Select an owner</option>${['Joe Hu', 'Sam Chen', 'Morgan Patel'].map((name) => `<option ${x.owner === name ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
        <label class="field"><span>Next action</span><input id="note" maxlength="1200" required placeholder="Enter a fictional follow-up action" value="${esc(x.note)}"></label>
      </div><label class="field"><span>Agreed next update (demo)</span><input id="next-contact" maxlength="160" required value="${esc(x.nextContact)}"></label><button type="submit" class="primary">Save next step</button>${x.owner !== 'Unassigned' ? `<p class="recorded">✓ Follow-up assigned to ${esc(x.owner)}.</p>` : ''}</form>
      <div class="resource-story"><h3>Use the approved patient resource.</h3><p class="note">The Remote Monitor supports the data-sharing routine directed by the patient’s physician. This demo links to NeuroPace’s current resources instead of reproducing device-use instructions.</p><a class="resource" href="https://www.neuropace.com/patients/current-rns-system-patients/" target="_blank" rel="noopener">NeuroPace · Current-patient manuals, videos & FAQ ↗</a><button data-action="review" ${x.reviewed ? 'disabled' : ''}>${x.reviewed ? '✓ Resource review recorded' : 'Record resource review'}</button></div>
    </div><a class="continue-link" href="#coordinate">Next: route the concern ↓</a>`, x.owner !== 'Unassigned' && x.reviewed) +
  chapter(2, 'coordinate', 'Help now. Preserve the concern.', 'When Alex adds that the Remote Monitor has repeatedly stopped functioning, that information should not wait for a service rep to decide whether it is “serious enough.” The support path and the Quality path move in parallel.', `
    <div class="story-action card">
      <div class="dual-track">
        <div class="track-card"><p class="eyebrow">SERVICE</p><h3>Remove the operational barrier.</h3><p class="muted">Use approved resources, own the next communication, and restore the support pathway with as little patient effort as possible.</p></div>
        <div class="track-card"><p class="eyebrow">QUALITY</p><h3>Preserve the reported performance concern.</h3><p class="muted">The service team preserves what was reported and routes it under company procedure. It does not determine cause, complaint classification, or regulatory outcome.</p></div>
      </div>
      <div class="required-route ${x.quality ? 'complete' : ''}">
        <div><p class="eyebrow">REQUIRED PARALLEL PATH</p><h3>Potential device complaint identified</h3><p class="note">Additional report: “The Remote Monitor has repeatedly stopped functioning.” The report is linked to the service case verbatim so Quality receives the signal without slowing service recovery.</p></div>
        ${x.quality ? '<span class="tag good">Routed to Quality</span>' : '<button class="primary" data-action="quality">Record required Quality routing ↗</button>'}
      </div>
      ${qualityReceipt(x)}
      <div class="boundary-note"><strong>Why I designed it this way</strong><p class="note">In a medical-device environment, fast customer service and disciplined complaint handling are not competing goals. A patient can receive help while an authorized Quality process evaluates the reported concern independently.</p></div>
      <p class="note footnote">Workflow example only. Real complaint handling, escalation, investigation, and regulatory assessment follow NeuroPace procedures and applicable requirements.</p>
    </div><a class="continue-link" href="#follow">Next: restore the routine ↓</a>`, x.quality) +
  chapter(3, 'follow', 'Make every promise traceable.', 'Replacement is a conditional branch after approved support and authorization. This example concerns an external Remote Monitor. It does not model replacement of an implanted neurostimulator.', `
    <div class="story-action card">
      <div class="trace-grid">
        <div class="well"><small>Service owner</small><strong>${esc(x.owner)}</strong></div>
        <div class="well"><small>Device identifier</small><strong>${esc(x.deviceId)}</strong></div>
        <div class="well"><small>Return / RGA</small><strong>${esc(x.rga)}</strong></div>
        <div class="well"><small>Next communication</small><strong>${esc(x.nextContact)}</strong></div>
      </div>
      <div class="milestone-track">${['Prepared', 'Dispatched', 'Delivered', 'Supported', 'Resolved'].map((label, index) => `<div class="milestone ${x.service > index ? 'done' : ''}"><span>${x.service > index ? '✓' : index + 1}</span><strong>${label}</strong></div>`).join('')}</div>
      <div class="status-pair"><div class="well"><small>Service request</small><strong>${statusOf(x)}</strong></div><div class="well"><small>Quality review</small><strong>${x.qualityAccepted ? 'Accepted · review open' : x.quality ? 'Routed · acceptance pending' : x.complaintRequired ? 'Route promptly · do not wait for diagnosis' : 'Not indicated in this sample'}</strong></div></div>
      ${serviceEvidence(x)}
    ${x.service < 5 ? `<button class="primary" data-action="advance">${['Prepare replacement', 'Record dispatch', 'Confirm delivery', 'Confirm support follow-up', 'Resolve service task'][x.service]} →</button>` : `<p class="recorded">✓ Service task resolved. ${x.quality ? 'The Quality review remains independently owned.' : ''}</p>`}
      <div class="well care-context"><strong>What the patient needs from this</strong><p class="note">Alex should not have to understand internal teams, remember which identifier belongs where, or chase the return. The company should absorb that complexity and leave Alex with a clear next step.</p></div>
      <details><summary>View the case history</summary><ol class="timeline">${x.events.map((event) => `<li><strong>${esc(event)}</strong></li>`).join('')}</ol><button data-action="export">Download case summary ↓</button></details>
    </div><a class="continue-link" href="#reconcile">Next: close the operational loop ↓</a>`, x.service === 5) +
  chapter(4, 'reconcile', 'Reconcile what happens behind the scenes.', 'Good operations are mostly invisible. Device records, RGAs, and field inventory should reconcile because a missed back-office detail can become the next patient’s delay.', `
    <div class="story-action card">
      <div class="ops-exception-strip"><span>Device record integrity</span><span>RGA closure</span><span>Field inventory</span></div>
      <div class="reconcile-numbers"><div><span class="value">${inventoryResolved ? 3 : 4}</span><small>Recorded in field stock</small></div><span aria-hidden="true">→</span><div><span class="value">3</span><small>Physically counted</small></div></div>
      <p class="note">Supporting record DEMO-TX-208 links 1 Remote Monitor to a confirmed receipt in return hold. This separate stock example has a documented movement, not an unexplained loss. Return hold must remain excluded from available stock.</p>
      <label class="field"><span>Review the evidence</span><select id="verification" ${inventoryResolved ? 'disabled' : ''}><option value="">Select a finding</option><option value="verified">Transfer record matches the discrepancy</option><option value="investigate">Evidence is insufficient; keep the exception open</option></select></label>
      <button class="primary" data-action="reconcile" ${inventoryResolved ? 'disabled' : ''}>${inventoryResolved ? '✓ Reconciliation recorded' : 'Record finding'}</button>
    </div><a class="continue-link" href="#learn">Next: improve the system ↓</a>`, inventoryResolved) +
  chapter(5, 'learn', 'Protect the next patient from the same friction.', 'A manager should look past a single miss and ask what the pattern means. If several agents choose the wrong Remote Monitor resource, coaching may help, but the knowledge architecture, workflow, or labeling may be creating the error.', `
    <div class="story-action card">
      <div class="manager-callout"><p class="eyebrow">MANAGER REVIEW</p><h3>The patient case can close. The manager’s work continues.</h3><p class="muted">A synthetic review finds that 3 of 18 similar cases used the wrong Remote Monitor resource on first contact.</p></div>
      <div class="decision-grid">
        <button data-action="manager-choice" data-choice="coach" class="decision-button ${managerChoice === 'coach' ? 'selected' : ''}"><strong>Coach one agent</strong><span>Address an individual execution gap.</span></button>
        <button data-action="manager-choice" data-choice="workflow" class="decision-button ${managerChoice === 'workflow' ? 'selected' : ''}"><strong>Update the workflow</strong><span>Reduce the chance of a wrong resource being selected.</span></button>
        <button data-action="manager-choice" data-choice="investigate" class="decision-button ${managerChoice === 'investigate' ? 'selected' : ''}"><strong>Investigate the system</strong><span>Check model labeling, knowledge design, and case prompts first.</span></button>
      </div>
      ${managerChoice ? `<div class="well manager-rationale"><strong>My management instinct</strong><p class="note">${managerChoice === 'investigate' ? 'Start with the system. Three similar misses are enough to ask whether the workflow is creating ambiguity before treating this as an individual performance problem. If the process is clear and the pattern remains agent-specific, then coaching becomes the right intervention.' : managerChoice === 'workflow' ? 'A workflow change may be part of the answer, but I would first confirm why the wrong resource is being selected. I want evidence that the process is causing the miss before redesigning it.' : 'Coaching may be necessary, but three similar misses across a small sample make me check the system before assuming this is one person’s performance issue.'}</p></div>` : ''}
      <div class="well patient-outcome"><strong>The patient-centered test</strong><p class="note">Did the interaction make the next step easier to understand, preserve the right records, and let the patient return attention to the rest of their day?</p></div>
      <button class="primary" data-action="plan" ${planSaved ? 'disabled' : ''}>${planSaved ? '✓ Improvement plan recorded' : 'Build the measurement plan'}</button>${planSaved ? '<p class="recorded">Owner: Joe Hu · Next step: define the population, baseline, balancing measures, and decision criteria with Service and Quality leadership.</p>' : ''}
    </div>`, planSaved) +
  `<section class="story-ending"><p class="eyebrow">THE PRINCIPLE BEHIND CAREOPS</p><h2>Good support protects the patient’s agency.</h2><p>A patient should not have to navigate internal departments, reconstruct the same story, or wonder who owns the next step. The complexity belongs behind the scenes.</p><div class="actions"><button data-nav="about">Read how I think →</button><button data-nav="leadership">See the manager view</button></div><p class="note">Independent application project. Not affiliated with NeuroPace. Demo changes reset on reload.</p></section>`;
}

function guidance() {
  const x = currentCase();
  const stage = x.owner === 'Unassigned' ? 0 : !x.reviewed ? 1 : (x.complaintRequired && !x.quality) ? 2 : x.service < 5 ? 3 : 4;
  const steps = [
    ['Own the support request', 'Choose a service owner and save the next action.'],
    ['Confirm the device context', 'Use the model-specific NeuroPace resource, then mark it reviewed.'],
    ['Record the required Quality route', 'Preserve the recurring device-performance report while Service keeps moving.'],
    ['Follow the service pathway', 'Track the replacement, return/RGA, and next communication through closure.'],
    ['Review the system', 'The patient-facing task can close; management review looks for process and coaching opportunities.']
  ];
  return `<div class="well banner"><p class="eyebrow">GUIDED DEMO · ${stage + 1} OF 5</p><strong>${steps[stage][0]}</strong><p>${steps[stage][1]}</p><div class="progress-track"><span style="width:${(stage + 1) * 20}%"></span></div><button class="quiet" data-action="end-guide">Exit walkthrough</button></div>`;
}

function intake() {
  const x = currentCase();
  return `<p class="eyebrow">ORIGINAL REPORT · PRESERVED VERBATIM</p><blockquote class="well">“${esc(x.report)}”</blockquote>
    <div class="patient-goal compact"><span>IMPACT ON THE PATIENT’S ROUTINE</span><strong>${esc(x.impact)}</strong></div>
    <div class="status-pair"><div class="well"><small>Device context</small><strong>${esc(x.monitor)}</strong></div><div class="well"><small>Care boundary</small><strong>${x.id === 'CS-1039' ? 'Clinical questions go to the treating team' : 'Service support · patient remains in control'}</strong></div></div>
    <form id="intake-form"><label class="field"><span>Service owner</span><select id="owner" required><option value="">Choose an owner</option>${['Joe Hu', 'Sam Chen', 'Morgan Patel'].map((name) => `<option ${x.owner === name ? 'selected' : ''}>${name}</option>`).join('')}</select></label><label class="field"><span>Next action and handoff notes</span><textarea required id="note" placeholder="Demo notes only. Do not enter real patient information." maxlength="1200">${esc(x.note)}</textarea></label><label class="field"><span>Agreed next update (demo)</span><input id="next-contact" maxlength="160" required value="${esc(x.nextContact)}"></label><button class="primary" type="submit">Save intake</button></form>
    <div class="insight well"><h3>${x.id === 'CS-1039' ? 'Use the approved escalation pathway' : 'Source-linked patient support'}</h3><p class="note">${x.id === 'CS-1039' ? 'Service does not interpret the symptom or change settings. Use the approved clinical and safety-event escalation process promptly. Do not wait for a model or serial number before routing the report.' : 'Use the official, model-appropriate patient resource rather than relying on memory or recreating device instructions.'}</p><a class="resource" href="https://www.neuropace.com/patients/current-rns-system-patients/" target="_blank" rel="noopener">NeuroPace · Current patient manuals, videos & FAQ ↗</a><button data-action="review" ${x.reviewed ? 'disabled' : ''}>${x.reviewed ? '✓ Resource marked reviewed' : 'Mark resource reviewed'}</button></div>`;
}

function quality() {
  const x = currentCase();
  if (!x.complaintRequired) return `<h3>No Quality route is indicated by this fictional scenario.</h3><p class="muted">If a new report alleged a device deficiency or performance concern, the service record would preserve it and follow company complaint-handling procedures.</p>`;
  return `<h3>Service recovery and Quality review run in parallel.</h3><p class="muted">This is not a discretionary escalation in the demo. The reported concern is preserved without assigning a cause and routed; authorized Quality personnel own evaluation, investigation, classification, and closure.</p>
    <div class="required-route ${x.quality ? 'complete' : ''}"><div><p class="eyebrow">REPORTED DEVICE-PERFORMANCE CONCERN</p><strong>“${esc(x.additionalReport || x.report)}”</strong><p class="note">Linked to ${x.id} without rewriting the patient’s words.</p></div>${x.quality ? '<span class="tag good">Quality route recorded</span>' : '<button class="primary" data-action="quality">Record required Quality routing ↗</button>'}</div>
    ${qualityReceipt(x)}
    <p class="note" style="margin-top:22px">Proposed workflow only. Real complaint handling and regulatory assessment follow NeuroPace procedures and applicable requirements.</p>`;
}

function device() {
  const x = currentCase();
  if (x.id !== 'CS-1042') return distinctPathway(x);
  return `<h3>Replacement, return & communication milestones</h3>
    <div class="trace-grid compact-grid"><div class="well"><small>Device</small><strong>${esc(x.deviceId)}</strong></div><div class="well"><small>RGA</small><strong>${esc(x.rga)}</strong></div><div class="well"><small>Next communication</small><strong>${esc(x.nextContact)}</strong></div><div class="well"><small>Quality</small><strong>${x.qualityAccepted ? 'Accepted · review open' : x.quality ? 'Acceptance pending' : x.complaintRequired ? 'Route promptly' : 'Not indicated'}</strong></div></div>
    <ol class="timeline">${['Request recorded', 'Replacement prepared', 'Replacement dispatched', 'Delivery confirmed', 'Support follow-up confirmed', 'Service resolved'].map((label, index) => `<li><strong>${index <= x.service ? '✓ ' : ''}${label}</strong><p>${index <= x.service ? 'Recorded in this simulation' : 'Not yet recorded'}</p></li>`).join('')}</ol>
    ${serviceEvidence(x)}
    ${x.service < 5 ? `<button class="primary" data-action="advance">${['Prepare replacement', 'Record dispatch', 'Confirm delivery', 'Confirm support follow-up', 'Resolve service task'][x.service]} →</button>` : `<div class="well"><strong>Service task resolved</strong><p class="note">${x.quality ? 'Quality still owns its review.' : ''} Service closure does not imply a clinical outcome.</p></div>`}
    <p class="note" style="margin-top:20px">Each action records a simulated milestone. No real orders, shipments, messages, or device commands are created.</p>`;
}

function activityHistory() {
  return `<h3>Case activity</h3><p class="note">Session activity log. This prototype does not claim a production audit trail.</p><ol class="timeline">${currentCase().events.map((item) => `<li><strong>${esc(item)}</strong></li>`).join('')}</ol><button data-action="export">Download case summary ↓</button>`;
}

function managerReview() {
  const x = currentCase();
  if (x.id !== 'CS-1042') {
    const clinical = x.id === 'CS-1039';
    const checks = clinical ? [['Original words retained without a diagnosis', true], ['Quality route recorded', x.quality], ['Clinical handoff accepted', x.service >= 3], ['Patient communication confirmed', x.service >= 4]] : [['Patient permission confirmed', x.service >= 1], ['Support preferences agreed', x.service >= 2], ['Matching resource reviewed', x.reviewed], ['Patient understanding checked', x.service >= 4]];
    return `<h3>${clinical ? 'A handoff is complete when someone accepts ownership.' : 'The patient’s voice should remain visible.'}</h3><div class="review-list">${checks.map(([label,done]) => `<div class="review-item ${done ? 'done' : ''}"><span>${done ? '✓' : '○'}</span><strong>${label}</strong></div>`).join('')}</div><div class="well"><strong>My review question</strong><p>${clinical ? 'Did the team escalate promptly without waiting for missing identifiers? Review the acknowledgment and the communication commitment separately from the clinical outcome.' : 'Did the representative make space for Jordan to participate, or did the conversation shift entirely to the partner? Review the permission record alongside the patient’s own account of the next step.'}</p></div><button data-nav="leadership">Explore the manager’s desk →</button>`;
  }
  const checks = [
    ['Original patient report preserved', true],
    ['Device context verified', x.id !== 'CS-1039'],
    ['Required Quality route recorded', !x.complaintRequired || x.quality],
    ['Service owner assigned', x.owner !== 'Unassigned'],
    ['Approved resource reviewed', x.reviewed],
    [x.id === 'CS-1042' ? 'Return / RGA linked' : 'No unneeded replacement workflow', Boolean(x.rga)]
  ];
  return `<h3>The patient case is only one unit of management work.</h3><p class="muted">A manager should review both the case quality and the system that produced it.</p><div class="review-list">${checks.map(([label, done]) => `<div class="review-item ${done ? 'done' : ''}"><span>${done ? '✓' : '○'}</span><strong>${label}</strong></div>`).join('')}</div><div class="well"><strong>Team pattern · synthetic sample</strong><p class="note">3 of 18 similar Remote Monitor contacts used the wrong model-specific resource on first contact. That is enough to investigate whether knowledge design or workflow prompts are contributing before assuming an individual performance problem.</p></div><button data-nav="insights" class="primary">Open manager analysis →</button>`;
}

function workspace() {
  const x = currentCase();
  const tabs = [
    ['intake', 'Intake'], ['quality', 'Quality'], ['device', 'Support pathway'], ['history', 'Activity'], ['manager', 'Manager review']
  ];
  const bodies = { intake, quality, device, history: activityHistory, manager: managerReview };
  return head('CASE WORKSPACE', `${x.id} · ${esc(x.name)}`, 'A fictional service record used to demonstrate ownership, traceability, complaint routing, and manager review.') +
    `${guided ? guidance() : ''}${stats()}<div class="case-layout"><aside class="case-list" aria-label="Fictional cases">${cases.map((item) => `<button data-case="${item.id}" class="${item.id === selected ? 'active' : ''}"><span class="initial">${item.initial}</span><span><strong>${item.id}</strong><small>${esc(item.subject)}</small></span></button>`).join('')}</aside><section class="card case-panel"><div class="case-title"><div><p class="eyebrow">${esc(x.type)}</p><h2>${esc(x.subject)}</h2><p class="muted">${esc(x.monitor)}</p></div>${tag(x.priority, x.priority === 'Follow-up due' ? 'warn' : '')}</div><div class="tabs" role="tablist">${tabs.map(([key, label]) => `<button data-sub="${key}" id="tab-${key}" aria-controls="case-tabpanel" tabindex="${subtab === key ? 0 : -1}" class="${subtab === key ? 'active' : ''}" role="tab" aria-selected="${subtab === key}">${label}</button>`).join('')}</div><div id="case-tabpanel" class="tab-body" role="tabpanel" aria-labelledby="tab-${subtab}">${bodies[subtab]()}</div></section></div>`;
}

function inventory() {
  return head('DEVICE OPERATIONS', 'The back office is part of patient care.', 'The role spans more than tickets. Record integrity, RGA follow-through, and Field Team inventory all need visible ownership because small discrepancies can become downstream delays. Every record below is fictional.') + `
    <div class="ops-grid">
      <section class="card ops-card"><div class="ops-card-head"><span class="icon-well">ID</span>${tag('Open', 'warn')}</div><p class="eyebrow">DEVICE RECORD INTEGRITY</p><h2>Do not “fix” a mismatch by assumption.</h2><p class="muted">A separate implant-record example lists serial <strong>DEMO-IMP-74219</strong>; the submitted source lists <strong>DEMO-IMP-74291</strong>. This is not Alex’s Remote Monitor record.</p><div class="well"><strong>Manager action</strong><p class="note">Keep the discrepancy visible. Ask the authorized source owner to reconcile patient, device and implant-event identifiers. Preserve the prior value, correction reason and approval in the lifetime record. Do not infer a serial from a similar-looking number.</p></div></section>
      <section class="card ops-card"><div class="ops-card-head"><span class="icon-well">↩</span>${tag(cases[0].returnReceived ? 'Receipt recorded' : 'Return open', cases[0].returnReceived ? 'good' : 'warn')}</div><p class="eyebrow">RGA FOLLOW-THROUGH</p><h2>Delivered is not the same as closed.</h2><p class="muted">${cases[0].rga}: service is ${serviceNames[cases[0].service].toLowerCase()}. Return receipt is ${cases[0].returnReceived ? 'recorded; disposition and RGA closure still require the authorized owner' : 'not yet recorded'}.</p><div class="well"><strong>Manager action</strong><p class="note">Reconcile receipt, status, and ownership before closure so the service record and return record tell the same story.</p></div></section>
      <section class="card ops-card wide"><div class="ops-card-head"><span class="icon-well">▣</span>${tag(inventoryResolved ? 'Reconciled' : 'Open exception', inventoryResolved ? 'good' : 'warn')}</div><p class="eyebrow">FIELD INVENTORY</p><h2>${inventoryResolved ? 'The movement is now reflected.' : 'Find the missing movement before changing the count.'}</h2><div class="inventory-detail"><div><p class="muted">West field stock shows ${inventoryResolved ? 3 : 4} Remote Monitors recorded and 3 physically counted. DEMO-TX-208 documents one unit transferred to return hold, with matching unit identity and destination receipt. Return hold is not available stock.</p><label class="field"><span>Evidence review</span><select id="verification" ${inventoryResolved ? 'disabled' : ''}><option value="">Select a finding</option><option value="verified">Transfer record matches the discrepancy</option><option value="investigate">Evidence is insufficient; keep open</option></select></label><button class="primary" data-action="reconcile" ${inventoryResolved ? 'disabled' : ''}>${inventoryResolved ? '✓ Reconciliation recorded' : 'Record finding'}</button></div><div class="reconcile-numbers"><div><span class="value">${inventoryResolved ? 3 : 4}</span><small>Recorded</small></div><span>→</span><div><span class="value">3</span><small>Counted</small></div></div></div></section>
    </div>
    <section class="card insight"><div class="section-head"><h2>Why these controls belong together</h2><small>Manager perspective</small></div><p class="muted">Orders, returns, device records, complaint signals, and field inventory may live in different systems, but the customer experience crosses all of them. The manager’s job is to make the seams reliable enough that patients, providers, and Field teams do not have to compensate for internal gaps.</p></section>`;
}

function insights() {
  const values = insightPeriod === '30' ? [42, 27, 18, 13] : [12, 8, 6, 4];
  return head('SERVICE INSIGHTS', 'Turn a pattern into a testable decision.', 'A synthetic dataset used to demonstrate how I would frame a service-improvement question. It is not NeuroPace performance or patient data.', `<label><span class="eyebrow">SAMPLE WINDOW</span><select id="period"><option value="30" ${insightPeriod === '30' ? 'selected' : ''}>30-day contact sample · 100 contacts</option><option value="7" ${insightPeriod === '7' ? 'selected' : ''}>7-day sample · 30 contacts</option></select></label>`) + `
    <div class="grid two">
      <section class="card"><div class="section-head"><h2>Where is the friction?</h2><span class="tag">Synthetic counts</span></div>${['Remote Monitor setup & data transfer', 'Shipment / order follow-up', 'Return logistics', 'Patient ID / account questions'].map((label, index) => `<div class="bar-row"><span>${label}</span><div class="bar-track" role="img" aria-label="${label}: ${values[index]} contacts"><span style="width:${values[index] / Math.max(...values) * 100}%"></span></div><strong>${values[index]}</strong></div>`).join('')}<p class="note">A larger category is a reason to ask better questions. It is not, by itself, evidence of a product problem or training failure.</p></section>
      <section class="card"><p class="eyebrow">MANAGER REVIEW</p><h2>A case review should change the next interaction.</h2><p class="muted">A separate, fixed QA sample finds 3 of 18 similar cases used the wrong Remote Monitor resource on first contact.</p><ul class="checklist"><li>Was the model easy to identify in the case?</li><li>Did the knowledge base surface the right resource first?</li><li>Did the workflow create ambiguity?</li><li>Is the pattern team-wide or agent-specific?</li></ul><div class="manager-choice-inline"><button data-action="manager-choice" data-choice="coach">Coach one agent</button><button data-action="manager-choice" data-choice="workflow">Update workflow</button><button data-action="manager-choice" data-choice="investigate">Investigate system</button></div>${managerChoice ? `<p class="decision-result"><strong>My call:</strong> ${managerChoice === 'investigate' ? 'investigate the system first.' : 'I would still investigate the system before treating this as an individual performance issue.'}</p>` : ''}</section>
    </div>
    <section class="card insight experiment-card"><p class="eyebrow">BEFORE I RUN THE EXPERIMENT</p><h2>Define the decision before choosing the sample size.</h2><p class="muted">This is a proposed service pilot, not a clinical study. I would agree on the comparison and success criteria before making a change, with Quality reviewing any effect on approved work instructions.</p>
      <div class="experiment-grid">
        <div><span>1</span><strong>Define the population</strong><p>Model 5106 contacts involving setup or data transfer, with exclusions agreed in advance.</p></div>
        <div><span>2</span><strong>Establish the baseline</strong><p>Historical repeat contact, documentation completeness, resource selection, and handoff performance.</p></div>
        <div><span>3</span><strong>Make one controlled change</strong><p>Add one model-specific resource selector. Keep the existing ownership and next-step process unchanged.</p></div>
        <div><span>4</span><strong>Choose a primary measure</strong><p>Unplanned same-issue contacts within 7 days ÷ eligible cases with a full 7-day follow-up. Exclude scheduled callbacks; deduplicate cases.</p></div>
        <div><span>5</span><strong>Add balancing measures</strong><p>Check correct guidance and escalation timing alongside patient-reported effort. Fewer contacts can also mean someone gave up.</p></div>
        <div><span>6</span><strong>Agree on the decision rule</strong><p>Agree on a meaningful reduction and a minimum sample from baseline volume. Compare similar case mixes; review uncertainty. Stop for a missed required escalation.</p></div>
      </div>
      <button class="primary" data-action="plan" ${planSaved ? 'disabled' : ''}>${planSaved ? '✓ Measurement plan recorded' : 'Record measurement plan'}</button>${planSaved ? '<p class="note" style="margin-top:16px">Next step: size the pilot using real baseline volume and variability, then review the design with Service and Quality leadership.</p>' : ''}
    </section>`;
}

const evidenceSteps = [
  ['Replacement authorization', 'AUTH-DEMO: approved support steps completed; replacement authorized. Recipient and delivery details verified. Original and replacement identifiers linked.'],
  ['Dispatch record', 'SHIP-DEMO: approved unit matched to the order and carrier acceptance. Patient update includes a delivery estimate, not a guarantee.'],
  ['Delivery record', 'POD-DEMO: carrier delivery evidence matches the order. Delivery does not establish that the support need is resolved.'],
  ['Patient follow-up', 'CALL-DEMO: The patient confirms the approved support steps addressed the reported transfer issue and can explain the next step. This records service feedback, not clinical status.'],
  ['Service closure review', 'CLOSE-DEMO: agreed support need addressed; patient updated. Any open return remains assigned to Operations. Required Quality intake is tracked independently.']
];

function qualityReceipt(x) {
  if (!x.quality) return '';
  return `<div class="handoff-receipt well"><strong>${x.qualityAccepted ? 'Intake accepted · investigation remains open' : 'Routing recorded · acceptance still pending'}</strong><p class="note">Reference: Q-DEMO-${esc(x.id)} · Receiving function: Quality intake. Service owner: ${esc(x.owner)}. If acceptance is overdue, the service owner follows the approved escalation path. A sent message is not proof of receipt.</p>${x.qualityAccepted ? '' : '<button data-action="quality-accept">Simulate confirmed intake acceptance</button>'}</div>`;
}

function serviceEvidence(x) {
  return `<div class="evidence-panel"><p class="eyebrow">FICTIONAL EVIDENCE · NO LIVE TRANSACTIONS</p>
    <p class="note">Original: ${esc(x.deviceId)}<br>Replacement: ${esc(x.replacementId)}</p>
    ${x.service < 5 ? `<h3>${evidenceSteps[x.service][0]}</h3><p>${evidenceSteps[x.service][1]}</p><label class="check-evidence"><input type="checkbox" id="milestone-evidence"><span>I reviewed this sample evidence and would record this milestone.</span></label>` : '<p class="recorded">Patient-facing service is resolved. Open operational work keeps its own owner.</p>'}
    ${x.service >= 3 ? `<details class="return-detail"><summary>Independent return follow-up · ${x.returnReceived ? 'receipt recorded' : 'open'}</summary><p class="note">${esc(x.rga)} · Owner: Operations. Sample receipt REC-DEMO matches the original unit and return authorization. Receipt does not authorize disposition or restocking.</p>${x.returnReceived ? '<p class="recorded">Receipt linked. Disposition remains with the authorized team.</p>' : '<label class="check-evidence"><input type="checkbox" id="return-evidence"><span>Sample receipt matches the original identifier and RGA.</span></label><button data-action="return-receipt">Record return receipt</button>'}</details>` : ''}</div>`;
}

function leadership() {
  const priorityFeedback = {
    safety: 'Start the required safety-event escalation immediately, with a named receiver. In parallel, assign a qualified colleague to Alex’s promised callback. Give Finance and the Field Team an owner for the invoice hold. Urgency should trigger delegation, not leave the rest of the queue unattended.',
    callback: 'The callback commitment matters. Delegate it to a qualified colleague while you start the required safety-event escalation. Tell Alex who will call and when; do not silently miss the promise.',
    invoice: 'The quarter-end deadline is real, but it cannot justify delaying a safety-event escalation. Assign an owner to investigate the commercial hold in parallel. Escalate capacity constraints rather than relaxing controls.'
  };
  const orderFeedback = {
    release: 'An expected purchase order is not an approved record. I would ask the authorized commercial owner to resolve the discrepancy or approve an exception under policy. A deadline does not authorize me to invent pricing or bypass a hold.',
    hold: 'Keep the disputed transaction on hold while Finance and the account owner reconcile the purchase order and approved pricing. Give the Field Team a clear dependency and update time. Confirm whether a patient schedule is affected and route that impact through the approved path.',
    ignore: 'An exception may be appropriate if policy permits it and the authorized owner approves it. Document that decision before acting, including its scope. Keep the Field Team informed and reconcile the final transaction afterward.'
  };
  return head('THE MANAGER’S DESK', 'Make the trade-off visible. Then own it.', 'Three fictional situations that show how I would use judgment. These proposed responses are subject to NeuroPace training, role authority and approved procedures.') + `
    <section class="card management-scenario"><p class="eyebrow">01 · CAPACITY AND ESCALATION</p><h2>It is 2:40 PM. Three commitments collide.</h2><div class="scenario-facts"><div><strong>New safety-event report</strong><p>The Field Team has reported a potential safety event. Receipt by the designated escalation team is not yet confirmed.</p></div><div><strong>Alex’s 3:00 PM callback</strong><p>The assigned representative is unavailable. Alex has already been promised an update.</p></div><div><strong>Quarter-end invoice hold</strong><p>A purchase order and pricing record disagree. The account team is asking for release today.</p></div></div><fieldset><legend>What would you take ownership of first?</legend><div class="decision-grid">${[['safety','Start the safety escalation'],['callback','Protect the callback'],['invoice','Resolve the invoice']].map(([key,label])=>`<button data-action="priority-choice" data-choice="${key}" aria-pressed="${priorityChoice===key}">${label}</button>`).join('')}</div></fieldset>${priorityChoice ? `<div class="decision-result" role="status"><strong>My call</strong><p>${priorityFeedback[priorityChoice]}</p></div>` : '<p class="note">Choose a response to see my reasoning.</p>'}</section>
    <section class="card management-scenario"><p class="eyebrow">02 · COMMERCIAL ACCURACY</p><h2>“Can we release it now and fix the record later?”</h2><p>A fictional hospital order has a price mismatch. The Field Team expects a revised purchase order shortly. The shipment and invoice must remain consistent with the authorized record.</p><fieldset><legend>Choose a response</legend><div class="decision-grid">${[['release','Release on the expected PO'],['hold','Hold with an owner and deadline'],['ignore','Request an authorized exception']].map(([key,label])=>`<button data-action="order-choice" data-choice="${key}" aria-pressed="${orderChoice===key}">${label}</button>`).join('')}</div></fieldset>${orderChoice ? `<div class="decision-result" role="status"><strong>My call</strong><p>${orderFeedback[orderChoice]}</p></div>` : ''}<details><summary>The record I would expect before release</summary><p>Confirmed account and delivery details; approved pricing matched to the order; an authorized exception if required. After fulfillment, reconcile the shipment and invoice. Keep any unresolved difference assigned rather than marking it complete to improve a dashboard.</p></details></section>
    <section class="card management-scenario"><p class="eyebrow">03 · COACHING AND ACCOUNTABILITY</p><h2>The metric is a starting point for a conversation.</h2><p>A representative has a longer average handling time than peers. Their cases may be more complex. You do not yet know whether the time reflects careful work or avoidable friction.</p><div class="actions"><button data-action="coaching-choice" data-choice="sample">Review a matched case sample</button><button data-action="coaching-choice" data-choice="target">Set a faster handling target</button></div>${coachingChoice ? `<div class="decision-result" role="status"><strong>My coaching approach</strong><p>${coachingChoice === 'target' ? 'A speed target could reward incomplete work. ' : ''}Review comparable cases with the representative. Identify one observable behavior to improve and agree on a follow-up sample. If the obstacle is unclear guidance or system latency, give that fix an owner too. Recognize accurate escalation even when it lengthens a call.</p></div>` : ''}</section>
    <section class="card management-scenario"><p class="eyebrow">THE OPERATING RHYTHM I WOULD PROPOSE</p><h2>A small set of measures, with a decision attached.</h2><div class="table-scroll"><table><caption>Proposed management review. Definitions and targets would be agreed after baselining.</caption><thead><tr><th scope="col">Review</th><th scope="col">Evidence</th><th scope="col">Decision it supports</th></tr></thead><tbody><tr><th scope="row">Daily commitments</th><td>Overdue callbacks, unaccepted handoffs and aging blockers, with named owners.</td><td>Reassign coverage; escalate a stalled dependency.</td></tr><tr><th scope="row">Weekly quality</th><td>Correct records ÷ reviewed records, sampled across work types. Show sample size.</td><td>Separate a coaching need from a broken instruction.</td></tr><tr><th scope="row">Patient effort</th><td>Unplanned repeat contacts alongside optional feedback; show response rate.</td><td>Investigate friction without treating silence as success.</td></tr><tr><th scope="row">Launch readiness</th><td>Approved support guidance, tested account/order setup and trained backup coverage.</td><td>Resolve an open dependency with its owner before declaring readiness.</td></tr></tbody></table></div><p class="note">I would calibrate reviews with the team, then check that coaching changed behavior. A new work instruction needs an owner, version and demonstrated understanding, not just a sent email.</p></section>
    <div class="actions"><button data-nav="inventory">Inspect the operations exceptions →</button><button data-nav="insights">Review the proposed pilot →</button></div>`;
}

const distinctEvidence = {
  'CS-1041': [
    ['Verify identity and permission', 'CONSENT-DEMO: identity checked under the approved process. Jordan agrees that the named partner may join this support conversation. Permission for broader account access is not assumed.'],
    ['Agree on a manageable session', 'PREF-DEMO: Jordan chooses a joint phone walkthrough with one step at a time and a plain-language recap. The partner assists; Jordan remains the primary participant.'],
    ['Use the matching resource', 'GUIDE-DEMO: the Model 5100 laptop resource is confirmed. Only approved material is used, and physician-directed instructions remain authoritative.'],
    ['Check understanding', 'CHECK-DEMO: Jordan describes the agreed next step in their own words. The representative invites a question and checks whether another format or follow-up would help.'],
    ['Confirm the support outcome', 'CLOSE-DEMO: Jordan confirms the information is manageable and knows how to request further help. The record preserves the scope of permission and the agreed next contact.']
  ],
  'CS-1039': [
    ['Preserve and promptly route the report', 'REPORT-DEMO: Taylor’s wording, reported timing and callback details are preserved. Unknown device details remain unknown. Follow the approved clinical/safety escalation path without diagnosing or delaying for missing information.'],
    ['Request the clinical handoff', 'HANDOFF-DEMO: the designated clinical contact receives the report through an approved channel. Service requests acknowledgment and keeps ownership of communication. No setting change is attempted.'],
    ['Verify acceptance', 'ACK-DEMO: an authorized clinical contact confirms receipt and ownership. This is handoff acceptance, not a clinical assessment or a statement that the concern is resolved.'],
    ['Confirm the next communication', 'CONTACT-DEMO: Taylor has been told who owns the clinical response and how the next contact will occur. Service confirms the approved escalation path if contact fails.'],
    ['Close only the coordination task', 'COORD-DEMO: the receiving clinical contact owns follow-up; the linked Quality intake remains independently tracked. Clinical outcome is unknown. The service task closes only when the handoff and patient communication are documented.']
  ]
};

function distinctPathway(x) {
  const clinical = x.id === 'CS-1039';
  const steps = distinctEvidence[x.id];
  return `<p class="eyebrow">${clinical ? 'SERVICE COORDINATION · NO CLINICAL DECISIONS' : 'PATIENT-LED ASSISTANCE · NO REPLACEMENT'}</p><h3>${clinical ? 'Acknowledge the concern. Connect the right people.' : 'Make room for support without taking away control.'}</h3><p>${clinical ? 'Taylor’s question is not a troubleshooting prompt. Service preserves the concern, follows the approved escalation process and verifies the handoff. It does not attribute the sensation to the device or reassure Taylor that it is harmless.' : 'Jordan has asked for help, not for someone else to take over. Consent must be checked before discussing account-specific information with a care partner.'}</p>
  <div class="well"><strong>${clinical ? 'What I would say' : 'A choice for the patient'}</strong><p>${clinical ? '“Taylor, I’m glad you told us. I can’t assess this sensation or change your settings. I’ll follow our escalation process and make sure your report reaches the right clinical contact. I’ll also record your concern for the appropriate review.”' : '“Jordan, would you like your partner to join this conversation? We can go one step at a time. Before we discuss your information together, I’ll confirm permission with you.”'}</p></div>
  <fieldset class="case-decision"><legend>${clinical ? 'What would you avoid doing?' : 'If permission cannot be confirmed, what next?'}</legend><div class="actions"><button data-action="case-decision" data-choice="safe">${clinical ? 'Avoid interpreting the sensation' : 'Offer general resources; arrange direct contact'}</button><button data-action="case-decision" data-choice="assume">${clinical ? 'Guess a likely explanation' : 'Assume the partner has permission'}</button></div></fieldset>
  ${x.decision ? `<p class="decision-result" role="status">${clinical ? (x.decision === 'safe' ? 'Correct boundary: document the report and promptly follow the authorized escalation path. Missing device details must not delay it.' : 'A plausible explanation can still mislead. Leave clinical assessment and programming to authorized clinicians; keep the patient’s original words intact.') : (x.decision === 'safe' ? 'Keep account-specific information private. Offer public resources and arrange a conversation with Jordan under the approved verification process.' : 'A relationship does not establish permission. Confirm the patient’s choice and the authorized scope before discussing protected information.')}</p>` : ''}
  <ol class="timeline">${caseStages[x.id].map((label,index)=>`<li><strong>${index<=x.service ? '✓ ' : ''}${label}</strong><p>${index<=x.service ? 'Recorded in this simulation' : 'Pending'}</p></li>`).join('')}</ol>
  ${clinical ? `<div class="boundary-note"><strong>Clinical outcome: unknown</strong><p class="note">${x.service>=3 ? 'Clinical handoff acceptance recorded.' : 'Clinical handoff not yet accepted.'} Quality: ${x.qualityAccepted ? 'intake accepted; review open' : x.quality ? 'routed; acceptance pending' : 'routing required'}. ${!x.quality ? '<button data-action="quality">Record required Quality routing</button>' : ''}</p></div>${qualityReceipt(x)}` : ''}
  ${x.service<5 ? `<div class="evidence-panel"><p class="eyebrow">FICTIONAL EVIDENCE · STEP ${x.service+1} OF 5</p><h3>${steps[x.service][0]}</h3><p>${steps[x.service][1]}</p><label class="check-evidence"><input type="checkbox" id="milestone-evidence"><span>I reviewed this sample evidence before recording the step.</span></label></div><button class="primary" data-action="advance">${steps[x.service][0]} →</button>` : `<p class="recorded">✓ ${clinical ? 'Service coordination complete. Clinical outcome remains unknown; Quality review is independent.' : 'Jordan confirms the support need is addressed. The agreed scope of permission remains in the record.'}</p>`}`;
}

function advanceDistinct(x) {
  if (x.service>=5) return;
  if (x.owner==='Unassigned') { subtab='intake'; render(); toast('Assign a service owner and agree on the next communication.'); return; }
  if (x.complaintRequired && !x.quality) { toast('Route the reported concern promptly under the approved Quality process.'); return; }
  if (!$('#milestone-evidence')?.checked) { toast('Review the fictional evidence before recording this step.'); $('#milestone-evidence')?.focus(); return; }
  if (x.id==='CS-1041' && x.service===2 && !x.reviewed) {subtab='intake';render();toast('Review the model-specific resource before recording the walkthrough.');return;}
  x.evidence.push({step:x.service+1,record:distinctEvidence[x.id][x.service][1]});
  x.service++;
  if(x.service===5){x.priority=x.id==='CS-1039'?'Coordination complete':'Service resolved';x.nextContact=x.id==='CS-1039'?'Clinical contact owns follow-up · Quality intake tracked separately':'Agreed assistance complete · follow-up available on request';}
  addEvent(statusOf(x));render();toast(statusOf(x));
}

function about() {
  return head('JOE HU · WHY I BUILT CAREOPS', 'The details are how care becomes dependable.', 'An independent application project for the Senior Customer Service Manager role. These are my proposed operating choices, not NeuroPace’s internal procedures.') + `
    <section class="card about-copy personal-statement"><p class="eyebrow">WHAT STAYED WITH ME</p><h2>The ordinary things are the point.</h2>
    <p>Janie describes the freedom to take her children out without depending on someone else for transportation. It made NeuroPace’s mission concrete for me. The technology is extraordinary, but its meaning belongs to the person living with it.</p>
    <p>I cannot promise that a support interaction changes a clinical outcome. I can take responsibility for whether someone has to explain the same problem twice, whether the next update arrives when promised, and whether a concern reaches the people qualified to evaluate it. That is the contribution I want to make.</p>
    <a class="resource" href="https://www.neuropace.com/stories/janies-story/" target="_blank" rel="noopener">Janie’s story · one individual experience; results vary ↗</a></section>
    <div class="about-grid learning-grid">
    <section class="card"><p class="eyebrow">EXPERIENCE I BRING</p><h2>I have turned scattered reports into action.</h2><p>During the SteelSeries GameBuds launch, I created tracking categories to connect reports that initially looked unrelated. I worked with hardware and software teams to trace a contributor to dust and debris near the ear tip, then helped change the support guidance.</p><p>CSAT recovered to roughly 90% within 2 weeks and later exceeded 95%. That was a team outcome. My contribution was making the customer evidence usable and keeping the support response connected to the investigation.</p><p class="note">This is transferable investigative discipline. Medical-device complaint handling requires its own training and authorization.</p></section>
    <section class="card"><p class="eyebrow">LEADING THE PEOPLE AND THE SYSTEM</p><h2>Consistency has to survive a busy day.</h2><p>I lead a 6-person CX team and work across Zendesk, Salesforce and D365. My work includes QA, coaching and the handoffs between support and operations.</p><p>At NeuroPace, I would bring that experience to a daily exception review: protect urgent escalations, make callback coverage explicit, and find the gaps that keep generating rework. A process is only dependable if the team can execute it under pressure.</p><button data-nav="leadership">Try the management scenarios →</button></section>
    <section class="card"><p class="eyebrow">WHAT I WOULD LEARN FIRST</p><h2>Earn the right to change the process.</h2><p>I would shadow representatives and the Field Team, then trace a case across the actual systems. With Quality, I would learn complaint and field safety-event escalation requirements. With Operations and Finance, I would learn who authorizes record changes and commercial exceptions.</p><p class="note">My first deliverable would be an agreed ownership map and a verified baseline. Proposed improvements would follow approved work instructions and change control.</p></section>
    <section class="card"><p class="eyebrow">MY AUTOMATION BOUNDARY</p><h2>Automate reminders. Keep judgment accountable.</h2><p>I would start with overdue handoff reminders and checks for missing fields. Any tool would need approved data access and a tested failure path.</p><p>Complaint classification, clinical guidance and unsupported changes to device records would stay with authorized people. I would measure reduced rework before claiming time saved.</p></section>
    <section class="card"><h2>How the research changed the design</h2><p>NeuroPace’s current-patient materials distinguish collecting device data from sharing it with the care team. That led me to separate delivery from confirmation that the support need was addressed. A shipping scan alone cannot answer Alex’s question.</p><p>NeuroPace also emphasizes teamwork and an environment where employees can excel. That led me to pair clear accountability with coaching that checks whether the system gave the representative a fair chance to succeed.</p><p class="note">These are design interpretations of public material, not claims about current NeuroPace practices.</p></section>
    <section class="card"><h2>Sources and scope</h2><a class="resource" href="https://www.neuropace.com/patients/current-rns-system-patients/" target="_blank" rel="noopener">NeuroPace · Patient resources and model-specific manuals ↗</a><a class="resource" href="https://www.neuropace.com/about-neuropace/neuropace-careers/" target="_blank" rel="noopener">NeuroPace · Mission, culture and careers ↗</a><a class="resource" href="https://startup.jobs/senior-customer-service-manager-neuropace-10177899" target="_blank" rel="noopener">Senior Customer Service Manager · public posting mirror ↗</a><p class="note">Reviewed October 2, 2026. The role title follows the public posting. The posting mirror was used for role scope; NeuroPace’s careers page remains the employer source.</p><p class="note">Patient cases, identifiers and operational datasets are fictional. Joe’s experience is presented separately. This browser-only prototype has no live integrations and stores no changes after reload. Do not enter real patient information.</p></section>
    </div>`;
}

function render() {
  const y = window.scrollY;
  const active = document.activeElement;
  const action = active?.dataset?.action;
  main.innerHTML = ({ overview, cases: workspace, inventory, insights, leadership, about })[page]();
  main.classList.remove('fade');
  void main.offsetWidth;
  main.classList.add('fade');
  document.querySelectorAll('[data-page]').forEach((button) => button.setAttribute('aria-current', button.dataset.page === page ? 'page' : 'false'));
  document.title = `${names[page]} · CareOps`;
  window.scrollTo(0, y);
  if (action) {
    const choice = active?.dataset?.choice;
    const next = [...main.querySelectorAll(`[data-action="${action}"]`)].find(el => !choice || el.dataset.choice === choice);
    if (next && !next.disabled) next.focus({ preventScroll: true });
    else main.focus({ preventScroll: true });
  }
}

function qualityAction() {
  const x = currentCase();
  if (!x.complaintRequired || x.quality) return;
  x.quality = true;
  addEvent('Required Quality route recorded; patient report preserved without cause attribution');
  render();
  toast('Quality route recorded. Service and Quality remain independently owned.');
}

function advance() {
  const x = currentCase();
  if (x.id !== 'CS-1042') return advanceDistinct(x);
  if (x.owner === 'Unassigned') {
    toast('Assign a service owner before proceeding.');
    subtab = 'intake';
    render();
    return;
  }
  if (!x.reviewed) {
    toast('Review the model-specific patient resource before proceeding.');
    subtab = 'intake';
    render();
    return;
  }
  if (x.complaintRequired && !x.quality) {
    toast('This scenario requires the device-performance report to be routed to Quality first.');
    subtab = 'quality';
    render();
    return;
  }
  if (x.service >= 5) return;
  if (!$('#milestone-evidence')?.checked) { toast('Review and confirm the fictional evidence before recording this milestone.'); $('#milestone-evidence')?.focus(); return; }
  x.evidence.push({step: x.service + 1, record: evidenceSteps[x.service][1]});
  x.service += 1;
  if (x.service === 5) { x.priority = 'Service resolved'; x.nextContact = x.returnReceived ? 'Service complete · RGA disposition owned by Operations' : 'Service complete · Operations owns return follow-up'; }

  addEvent(statusOf(x));
  render();
  toast(x.service === 5 ? 'Service task resolved. Quality ownership is unchanged.' : `${statusOf(x)} recorded.`);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button,[data-nav]');
  if (!button) return;
  if (button.dataset.page) return go(button.dataset.page, true);
  if (button.dataset.nav) return go(button.dataset.nav, true);
  if (button.dataset.case) return openCase(button.dataset.case, guided && button.dataset.case === selected);
  if (button.dataset.sub) { subtab = button.dataset.sub; render(); document.getElementById('tab-' + subtab)?.focus(); return; }

  switch (button.dataset.action) {
    case 'start':
      go('overview');
      document.getElementById('listen').scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      break;
    case 'end-guide': guided = false; render(); break;
    case 'review': currentCase().reviewed = true; addEvent(currentCase().id === 'CS-1039' ? 'Approved escalation-path review recorded in simulation' : 'Official model-specific resource marked reviewed'); render(); toast('Resource review recorded.'); break;
    case 'quality': qualityAction(); break;
    case 'quality-accept': if (!currentCase().quality) break; currentCase().qualityAccepted = true; addEvent('Quality intake acceptance recorded · Q-DEMO-' + selected); render(); toast('Intake acceptance recorded. Investigation remains open.'); break;
    case 'return-receipt': if ($('#return-evidence')?.checked) { currentCase().returnReceived = true; if (currentCase().service === 5) currentCase().nextContact = 'Service complete · RGA disposition owned by Operations'; addEvent('Returned unit matched to original identifier and RGA; disposition remains with Operations / Quality'); render(); toast('Return receipt recorded; this does not authorize restocking.'); } else toast('Confirm the unit and RGA match before recording receipt.'); break;
    case 'case-decision': currentCase().decision = button.dataset.choice; render(); break;
    case 'priority-choice': priorityChoice = button.dataset.choice; render(); break;
    case 'order-choice': orderChoice = button.dataset.choice; render(); break;
    case 'coaching-choice': coachingChoice = button.dataset.choice; render(); break;
    case 'advance': advance(); break;
    case 'reconcile':
      if ($('#verification')?.value === 'verified') { inventoryResolved = true; render(); toast('Inventory movement reconciled.'); }
      else toast('Exception remains open until the evidence supports a correction.');
      break;
    case 'plan': if (page === 'overview') { go('insights', true); break; } planSaved = true; render(); toast('Proposed measurement plan recorded.'); break;
    case 'manager-choice': managerChoice = button.dataset.choice || ''; render(); break;
    case 'export': {
      const x = currentCase();
      const blob = new Blob([`CAREOPS · FICTIONAL DEMO RECORD\n${x.id}\nOwner: ${x.owner}\nOriginal device: ${x.deviceId}\nReplacement device: ${x.replacementId}\nNext update: ${x.nextContact}\nRGA: ${x.rga}\nOriginal report: ${x.report}\nSupplemental report: ${x.additionalReport || 'None'}\nImpact on routine: ${x.impact}\nNotes: ${x.note}\nService: ${statusOf(x)}\nQuality: ${x.qualityAccepted ? 'Intake accepted / review open' : x.quality ? 'Routed / acceptance pending' : x.complaintRequired ? 'Required / not yet recorded' : 'Not indicated'}\nReturn received: ${x.returnReceived}\nMilestone evidence: ${x.evidence.map(e => e.record).join('; ')}\n\nActivity\n${x.events.join('\n')}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${x.id}-demo-summary.txt`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Demo summary downloaded.');
      break;
    }
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'intake-form') return;
  event.preventDefault();
  if (!$('#owner').value) return;
  const x = currentCase();
  x.owner = $('#owner').value;
  x.note = $('#note').value.trim();
  x.nextContact = $('#next-contact').value.trim();
  addEvent(`Intake saved; owner ${x.owner}`);
  render();
  toast('Intake saved for this session.');
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'period') { insightPeriod = event.target.value; render(); }
});

$('#menu').onclick = () => {
  const open = $('#menu').getAttribute('aria-expanded') !== 'true';
  $('#menu').setAttribute('aria-expanded', String(open));
  $('#menu').textContent = open ? 'Close ×' : 'Menu ☰';
  $('#nav').classList.toggle('open', open);
};

$('#reset').onclick = () => $('#confirm').showModal();
$('#cancel-reset').onclick = () => $('#confirm').close();
$('#do-reset').onclick = () => {
  cases = freshCases();
  selected = 'CS-1042';
  guided = false;
  inventoryResolved = false;
  planSaved = false;
  managerChoice = '';
  priorityChoice = '';
  orderChoice = '';
  coachingChoice = '';
  insightPeriod = '30';
  subtab = 'intake';
  $('#confirm').close();
  go('overview');
  toast('Demo reset.');
};

document.addEventListener('keydown', event => {
  if (!event.target.matches('[role="tab"]')) return;
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  let index = tabs.indexOf(event.target);
  if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') index = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = tabs.length - 1;
  else return;
  event.preventDefault(); tabs[index].click();
});

window.addEventListener('hashchange', () => {
  const next = location.hash.slice(1);
  if (names[next]) go(next);
});

go(names[location.hash.slice(1)] ? location.hash.slice(1) : 'overview');

if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'open_demo_case',
      description: 'Navigate to a fictional CareOps case. Does not resolve or modify the case.',
      inputSchema: { type: 'object', properties: { caseId: { type: 'string', enum: seed.map((item) => item.id) } }, required: ['caseId'], additionalProperties: false },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        if (!input || typeof input.caseId !== 'string' || !cases.some((item) => item.id === input.caseId)) throw Error('Choose a valid demo case ID');
        openCase(input.caseId);
        return { caseId: selected, view: page, service: serviceNames[currentCase().service] };
      }
    })).catch(() => {});
  } catch {}
}
