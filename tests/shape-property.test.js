// Replicate shapeProperty logic for testing (extracted from properties/index.ts)
function shapeProperty(row) {
  const hood = row.neighborhoods || null;
  const t = (s) => {
    const u = (s || '').toUpperCase();
    if (u.includes('DUPLEX')) return 'DUPLEX';
    if (u.includes('TRIPLEX')) return 'TRIPLEX';
    if (u.includes('QUAD')) return 'QUAD';
    if (u.includes('LOT')) return 'LOT';
    if (u.includes('CONDO')) return 'CONDO';
    return 'SFR';
  };
  const _city = String(row.city || '').trim();
  const _state = String(row.state || 'TX').trim();
  const _zip = row.zip ? String(row.zip).trim() : '';
  const cityDisplay = _city
    ? `${_city}, ${_state}${_zip ? ' ' + _zip : ''}`
    : (hood ? String(hood.area_name || `${_state}${_zip ? ' ' + _zip : ''}`) : `${_state}${_zip ? ' ' + _zip : ''}`);

  let streetAddr = String(row.address || '').trim();
  const stateStr = _state;
  const zipStr = _zip;
  const cityStr = _city;
  if (zipStr) {
    streetAddr = streetAddr.replace(new RegExp(',?\\s+' + stateStr + '\\s+' + zipStr + '$'), '').trim();
  }
  if (cityStr) {
    const esc = cityStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    streetAddr = streetAddr.replace(new RegExp(',?\\s+' + esc + '$', 'i'), '').trim();
  }
  streetAddr = streetAddr.replace(/,\s*$/, '').replace(/,\s*,/g, ',').trim();

  const rentEst = row.rent_estimate;
  const rentRange = rentEst
    ? { low: Math.round(rentEst * 0.88 / 25) * 25, high: Math.round(rentEst * 1.12 / 25) * 25, source: 'estimate' }
    : null;

  return {
    id: row.id, address: streetAddr, city: cityDisplay,
    rawCity: (row.city || '').trim(),
    listed: row.listed_price,
    type: t(row.property_type),
    beds: row.beds, baths: row.baths, sqft: row.sqft,
    monthlyRent: row.monthly_rent, rentRange,
    condition: row.condition || 'good',
    improvement: row.improvement || 'asis',
    status: row.status || 'new',
    source: row.source || 'zillow',
    curated: row.curated,
    stage: row.pipeline_stage || (row.curated === 'fav' ? 'shortlist' : row.curated === 'ni' ? 'archived' : row.curated === 'blk' ? 'archived' : 'inbox'),
  };
}

describe('shapeProperty', () => {
  it('strips city/state/zip from address', () => {
    const r = shapeProperty({ id: '1', address: '123 Main St, Fort Worth, TX 76116', city: 'Fort Worth', state: 'TX', zip: '76116', property_type: 'SFR' });
    expect(r.address).toBe('123 Main St');
  });

  it('builds city display with state and zip', () => {
    const r = shapeProperty({ id: '1', address: '123 Main St', city: 'Fort Worth', state: 'TX', zip: '76116', property_type: 'SFR' });
    expect(r.city).toBe('Fort Worth, TX 76116');
  });

  it('handles null zip without showing literal null', () => {
    const r = shapeProperty({ id: '1', address: '123 Main St', city: 'Fort Worth', state: 'TX', zip: null, property_type: 'SFR' });
    expect(r.city).toBe('Fort Worth, TX');
    expect(r.city).not.toContain('null');
  });

  it('trims whitespace from city', () => {
    const r = shapeProperty({ id: '1', address: '123 Main St', city: '  Euless  ', state: 'TX', zip: '76039', property_type: 'SFR' });
    expect(r.rawCity).toBe('Euless');
    expect(r.city).toBe('Euless, TX 76039');
  });

  it('maps property types correctly', () => {
    expect(shapeProperty({ id: '1', address: '', property_type: 'Single Family' }).type).toBe('SFR');
    expect(shapeProperty({ id: '1', address: '', property_type: 'Duplex' }).type).toBe('DUPLEX');
    expect(shapeProperty({ id: '1', address: '', property_type: 'Townhouse' }).type).toBe('SFR');
    expect(shapeProperty({ id: '1', address: '', property_type: 'Condo' }).type).toBe('CONDO');
    expect(shapeProperty({ id: '1', address: '', property_type: 'Lot/Land' }).type).toBe('LOT');
    expect(shapeProperty({ id: '1', address: '', property_type: null }).type).toBe('SFR');
  });

  it('calculates rent range from estimate', () => {
    const r = shapeProperty({ id: '1', address: '', rent_estimate: 2000 });
    expect(r.rentRange).not.toBeNull();
    expect(r.rentRange.low).toBeLessThan(2000);
    expect(r.rentRange.high).toBeGreaterThan(2000);
    expect(r.rentRange.low % 25).toBe(0);
    expect(r.rentRange.high % 25).toBe(0);
  });

  it('returns null rent range when no estimate', () => {
    const r = shapeProperty({ id: '1', address: '', rent_estimate: null });
    expect(r.rentRange).toBeNull();
  });

  it('maps pipeline_stage correctly', () => {
    expect(shapeProperty({ id: '1', address: '', pipeline_stage: 'shortlist' }).stage).toBe('shortlist');
    expect(shapeProperty({ id: '1', address: '', pipeline_stage: null, curated: 'fav' }).stage).toBe('shortlist');
    expect(shapeProperty({ id: '1', address: '', pipeline_stage: null, curated: 'ni' }).stage).toBe('archived');
    expect(shapeProperty({ id: '1', address: '', pipeline_stage: null, curated: 'blk' }).stage).toBe('archived');
    expect(shapeProperty({ id: '1', address: '', pipeline_stage: null, curated: null }).stage).toBe('inbox');
  });

  it('defaults condition to good, improvement to asis', () => {
    const r = shapeProperty({ id: '1', address: '' });
    expect(r.condition).toBe('good');
    expect(r.improvement).toBe('asis');
  });

  it('defaults source to zillow', () => {
    expect(shapeProperty({ id: '1', address: '' }).source).toBe('zillow');
  });
});
