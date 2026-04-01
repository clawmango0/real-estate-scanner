// Replicate validateFields from properties/index.ts
function validateFields(data) {
  const rules = {
    listed_price: v => typeof v === 'number' && v > 0 && v < 50000000,
    beds: v => typeof v === 'number' && v >= 0 && v <= 20,
    baths: v => typeof v === 'number' && v >= 0 && v <= 20,
    sqft: v => typeof v === 'number' && v > 0 && v < 100000,
    lot_size: v => typeof v === 'number' && v >= 0 && v < 5000000,
    monthly_rent: v => typeof v === 'number' && v >= 0 && v < 100000,
    rent_estimate: v => typeof v === 'number' && v >= 0 && v < 100000,
    pipeline_stage: v => typeof v === 'string' && ['inbox','shortlist','diligence','offer','contract','closed','archived'].includes(v),
    property_type: v => typeof v === 'string' && v.length <= 20,
    address: v => typeof v === 'string' && v.length > 0 && v.length <= 500,
    city: v => typeof v === 'string' && v.length <= 100,
    state: v => typeof v === 'string' && v.length <= 5,
    zip: v => v === null || (typeof v === 'string' && /^\d{5}$/.test(v)),
    notes: v => typeof v === 'string' && v.length <= 10000,
    condition: v => typeof v === 'string' && ['distressed','needswork','good','updated'].includes(v),
    improvement: v => typeof v === 'string' && ['asis','cosmetic','moderate','fullrehab'].includes(v),
  };
  for (const [field, value] of Object.entries(data)) {
    if (field === 'user_id') continue;
    if (rules[field] && !rules[field](value)) {
      return `Invalid value for ${field}`;
    }
  }
  return null;
}

describe('validateFields', () => {
  it('accepts valid property data', () => {
    expect(validateFields({ listed_price: 250000, beds: 3, baths: 2, sqft: 1500, address: '123 Main St' })).toBeNull();
  });

  it('rejects negative price', () => {
    expect(validateFields({ listed_price: -100 })).toBe('Invalid value for listed_price');
  });

  it('rejects price over 50M', () => {
    expect(validateFields({ listed_price: 60000000 })).toBe('Invalid value for listed_price');
  });

  it('rejects string price', () => {
    expect(validateFields({ listed_price: '250000' })).toBe('Invalid value for listed_price');
  });

  it('rejects beds > 20', () => {
    expect(validateFields({ beds: 25 })).toBe('Invalid value for beds');
  });

  it('accepts 0 beds (lots)', () => {
    expect(validateFields({ beds: 0 })).toBeNull();
  });

  it('rejects invalid pipeline stage', () => {
    expect(validateFields({ pipeline_stage: 'bogus' })).toBe('Invalid value for pipeline_stage');
  });

  it('accepts all valid pipeline stages', () => {
    for (const s of ['inbox','shortlist','diligence','offer','contract','closed','archived']) {
      expect(validateFields({ pipeline_stage: s })).toBeNull();
    }
  });

  it('rejects invalid zip format', () => {
    expect(validateFields({ zip: '1234' })).toBe('Invalid value for zip');
    expect(validateFields({ zip: 'abcde' })).toBe('Invalid value for zip');
  });

  it('accepts null zip', () => {
    expect(validateFields({ zip: null })).toBeNull();
  });

  it('accepts valid 5-digit zip', () => {
    expect(validateFields({ zip: '76039' })).toBeNull();
  });

  it('rejects empty address', () => {
    expect(validateFields({ address: '' })).toBe('Invalid value for address');
  });

  it('rejects invalid condition', () => {
    expect(validateFields({ condition: 'perfect' })).toBe('Invalid value for condition');
  });

  it('accepts all valid conditions', () => {
    for (const c of ['distressed','needswork','good','updated']) {
      expect(validateFields({ condition: c })).toBeNull();
    }
  });

  it('skips user_id field', () => {
    expect(validateFields({ user_id: 'some-uuid' })).toBeNull();
  });

  it('ignores fields without rules', () => {
    expect(validateFields({ listing_url: 'https://example.com', source: 'zillow' })).toBeNull();
  });
});
