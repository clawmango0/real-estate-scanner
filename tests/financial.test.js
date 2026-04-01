const fin = require('../docs/js/financial.js');

beforeEach(() => { Object.assign(fin.GP, fin.GP_DEFAULTS); });

describe('pmt', () => {
  it('calculates monthly payment for 30yr loan', () => {
    expect(fin.pmt(200000, 0.0525, 30)).toBeCloseTo(1104.41, 0);
  });
  it('returns 0 for zero principal', () => { expect(fin.pmt(0, 0.05, 30)).toBe(0); });
});

describe('cocCalc', () => {
  it('calculates CoC for standard investment', () => {
    const r = fin.cocCalc(200000, 1800);
    expect(r).not.toBeNull();
    expect(r.coc).toBeGreaterThan(0);
    expect(r.cashIn).toBeCloseTo(200000 * 0.23, 0);
    expect(r.gr).toBe(21600);
  });
  it('returns null for zero price', () => { expect(fin.cocCalc(0, 1800)).toBeNull(); });
  it('returns null for zero rent', () => { expect(fin.cocCalc(200000, 0)).toBeNull(); });
  it('returns negative CoC for overpriced property', () => {
    expect(fin.cocCalc(500000, 1200).coc).toBeLessThan(0);
  });
});

describe('maxPrice', () => {
  it('returns 0 for zero rent', () => { expect(fin.maxPrice(0, 0.08)).toBe(0); });
  it('finds price where CoC matches target', () => {
    const price = fin.maxPrice(1800, 0.08);
    expect(price).toBeGreaterThan(0);
    expect(fin.cocCalc(price, 1800).coc).toBeCloseTo(0.08, 1);
  });
  it('higher rent allows higher max price', () => {
    expect(fin.maxPrice(2500, 0.08)).toBeGreaterThan(fin.maxPrice(1500, 0.08));
  });
});

describe('getTiers + classify', () => {
  it('returns null for zero rent', () => { expect(fin.getTiers(0)).toBeNull(); });
  it('tiers in correct order', () => {
    const t = fin.getTiers(1800);
    expect(t.strong).toBeLessThan(t.consider);
    expect(t.consider).toBeLessThan(t.stretch);
  });
  it('classifies correctly', () => {
    const t = fin.getTiers(1800);
    expect(fin.classify(t.strong - 1000, t).label).toBe('Strong Buy');
    expect(fin.classify((t.strong + t.consider) / 2, t).label).toBe('Consider');
    expect(fin.classify(t.stretch + 50000, t).label).toBe('Walk Away');
    expect(fin.classify(200000, null).label).toBe('N/A');
  });
});

describe('nbScore', () => {
  it('returns null for null', () => { expect(fin.nbScore(null)).toBeNull(); });
  it('perfect score = 100', () => { expect(fin.nbScore({schools:10,crime:10,rentGrowth:5})).toBe(100); });
  it('zero score = 0', () => { expect(fin.nbScore({schools:0,crime:0,rentGrowth:0})).toBe(0); });
  it('caps rent growth at 30', () => { expect(fin.nbScore({schools:0,crime:0,rentGrowth:100})).toBe(30); });
});

describe('agiToRates', () => {
  it('single $120K → 24% marginal', () => { expect(fin.agiToRates(120000,'single').marg).toBe(0.24); });
  it('low income → 10%', () => { expect(fin.agiToRates(20000,'single').marg).toBe(0.10); });
  it('MFJ $120K → 12%', () => { expect(fin.agiToRates(120000,'mfj').marg).toBe(0.12); });
  it('defaults to single for unknown', () => { expect(fin.agiToRates(120000,'bogus').marg).toBe(0.24); });
});

describe('passAllow', () => {
  it('$25K under $100K AGI', () => { expect(fin.passAllow(80000,'active')).toBe(25000); });
  it('phases out $100K-$150K', () => { expect(fin.passAllow(125000,'active')).toBe(12500); });
  it('0 above $150K', () => { expect(fin.passAllow(200000,'active')).toBe(0); });
  it('Infinity for material', () => { expect(fin.passAllow(500000,'material')).toBe(Infinity); });
  it('Infinity for RE pro', () => { expect(fin.passAllow(500000,'repro')).toBe(Infinity); });
});

describe('flipCalc', () => {
  it('returns null for zero price', () => { expect(fin.flipCalc(0,'good','asis')).toBeNull(); });
  it('calculates ARV with condition + improvement', () => {
    const r = fin.flipCalc(200000,'needswork','moderate');
    expect(r.arv).toBeCloseTo(212000, 0);
  });
  it('MAO uses 70% rule', () => {
    const r = fin.flipCalc(200000,'good','cosmetic');
    expect(r.mao).toBeCloseTo(r.arv * 0.70 - r.rehabCost, 0);
  });
});

describe('brrrrCalc', () => {
  it('returns null for zero price', () => { expect(fin.brrrrCalc(0,1500,'good','asis')).toBeNull(); });
  it('calculates refi at ARV * LTV', () => {
    const r = fin.brrrrCalc(200000,1500,'good','asis',0.75,6);
    expect(r.refiAmount).toBeCloseTo(150000, 0);
  });
});

describe('schedE', () => {
  it('year 1 has depreciation', () => {
    const tp = {filing:'single',marginal:0.24,ltcg:0.15,recap:0.25,agi:120000,participation:'active'};
    const r = fin.schedE(200000,1500,'good','asis',1,tp,0);
    expect(r.annDepr).toBeGreaterThan(0);
    expect(r.gr).toBe(18000);
  });
});

describe('localRentEstimate', () => {
  it('errors for missing price', () => { expect(fin.localRentEstimate({beds:3,baths:2,sqft:1500}).error).toBeTruthy(); });
  it('errors for LOT', () => { expect(fin.localRentEstimate({listed:100000,beds:0,baths:0,sqft:5000,type:'LOT'}).error).toBeTruthy(); });
  it('estimates rent for standard SFR', () => {
    const r = fin.localRentEstimate({listed:250000,beds:3,baths:2,sqft:1500,type:'SFR',condition:'good',improvement:'asis',_hood:{}});
    expect(r.estimate).toBeGreaterThan(1000);
    expect(r.estimate).toBeLessThan(3000);
    expect(r.estimate % 25).toBe(0);
    expect(r.low).toBeLessThan(r.estimate);
    expect(r.high).toBeGreaterThan(r.estimate);
  });
  it('duplex > SFR at same price', () => {
    const sfr = fin.localRentEstimate({listed:250000,beds:3,baths:2,sqft:1500,type:'SFR',_hood:{}});
    const dup = fin.localRentEstimate({listed:250000,beds:3,baths:2,sqft:1500,type:'DUPLEX',_hood:{}});
    expect(dup.estimate).toBeGreaterThan(sfr.estimate);
  });
});

describe('formatters', () => {
  it('M formats dollars', () => { expect(fin.M(250000)).toBe('$250,000'); });
  it('MS formats with sign', () => { expect(fin.MS(500)).toContain('+'); });
  it('PCT formats percentage', () => { expect(fin.PCT(0.085)).toBe('8.5%'); });
});
