// ── PostHog Custom Event Tracking ────────────────────────────────────────
// Wraps posthog.capture() with app-specific events.
// Autocapture handles clicks/inputs automatically.
// These custom events add business context that autocapture can't infer.

function _track(event, props) {
  if (typeof posthog !== 'undefined' && posthog.capture) {
    posthog.capture(event, props);
  }
}

// Identify user after login (links all events to this person)
function trackIdentify(user) {
  if (typeof posthog !== 'undefined' && posthog.identify && user) {
    posthog.identify(user.id, {
      email: user.email,
      created_at: user.created_at,
    });
  }
}

// ── Property Events ─────────────────────────────────────────────────────

function trackPropertyView(p) {
  _track('property viewed', {
    property_id: p.id,
    address: p.address,
    city: p.rawCity || p.city,
    zip: p.zip,
    price: p.listed,
    type: p.type,
    source: p.source,
    stage: p.stage || 'inbox',
    coc: p._cocL,
    nb_score: p._nbScore,
    status: p.status,
  });
}

function trackPropertyAdd(p) {
  _track('property added', {
    address: p.address,
    source: p.source,
    price: p.listed_price || p.listed,
    type: p.property_type || p.type,
    method: p._addMethod || 'manual', // 'manual', 'url', 'bookmarklet', 'email'
  });
}

function trackStageChange(propertyId, fromStage, toStage, auto) {
  _track('stage changed', {
    property_id: propertyId,
    from_stage: fromStage,
    to_stage: toStage,
    auto_staged: !!auto,
  });
}

function trackPropertyEdit(propertyId, fields) {
  _track('property edited', {
    property_id: propertyId,
    fields_changed: Object.keys(fields),
    field_count: Object.keys(fields).length,
  });
}

// ── Financial Analysis Events ───────────────────────────────────────────

function trackRentChange(propertyId, oldRent, newRent, source) {
  _track('rent changed', {
    property_id: propertyId,
    old_rent: oldRent,
    new_rent: newRent,
    source: source, // 'manual', 'estimate', 'api'
  });
}

function trackConditionChange(propertyId, condition, improvement) {
  _track('condition changed', {
    property_id: propertyId,
    condition: condition,
    improvement: improvement,
  });
}

function trackRentModeChange(mode) {
  _track('rent mode changed', { mode: mode });
}

function trackSettingsChange(changes) {
  _track('settings changed', {
    fields: Object.keys(changes),
    down_pct: changes.downPct,
    rate: changes.rate,
  });
}

// ── Project Events ──────────────────────────────────────────────────────

function trackProjectCreate(project) {
  _track('project created', {
    project_id: project.id,
    name: project.name,
    investment_type: project.investment_type,
    cities: project.cities,
    max_price: project.max_price,
    from_template: !!project._fromTemplate,
  });
}

function trackProjectSwitch(project) {
  _track('project switched', {
    project_id: project ? project.id : null,
    project_name: project ? project.name : 'All Properties',
    investment_type: project ? project.investment_type : null,
  });
}

function trackProjectAnalytics(project) {
  _track('analytics opened', {
    project_id: project ? project.id : null,
    project_name: project ? project.name : 'All Properties',
  });
}

// ── Navigation & Filter Events ──────────────────────────────────────────

function trackFilterChange(type, value) {
  _track('filter changed', {
    filter_type: type, // 'tab', 'chip', 'sort'
    value: value,
  });
}

function trackExpandRow(propertyId) {
  _track('row expanded', { property_id: propertyId });
}

function trackExport(format, count) {
  _track('export triggered', {
    format: format, // 'csv'
    property_count: count,
  });
}

function trackDataSources() {
  _track('data sources viewed');
}
