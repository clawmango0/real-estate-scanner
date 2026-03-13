# Property Image Rating — Planned Feature

*Status: Concept — not yet implemented*
*Last updated: 2026-03-13*

---

## Goal

Estimate property condition and rehab costs from listing photos using AI image analysis. This would improve the accuracy of the `condition` and `improvement` fields currently set manually per property.

---

## Rating Scale

| Score | Condition | Estimated Rehab Cost |
|-------|-----------|---------------------|
| 5 | Move-in ready, excellent | 1–2% of purchase price |
| 4 | Good, minor cosmetic updates | 3–5% |
| 3 | Fair, needs moderate work | 5–8% |
| 2 | Poor, needs renovation | 8–12% |
| 1 | Major renovation required | 12%+ |

## Categories to Assess

- Kitchen (cabinets, counters, appliances)
- Bathrooms (fixtures, tile, vanity)
- Flooring (type, condition, wear)
- Exterior (roof, siding, paint, landscaping)
- Windows and doors
- Overall layout and livability

---

## Implementation Approach

### Phase 1: Data Collection
- Zillow listing images are available in `__NEXT_DATA__` under `prop.photos`
- Store image URLs in `properties.raw_json` (already captured for Zillow properties)
- Manual rating of 20+ properties to establish baseline

### Phase 2: AI Rating
- Use Claude's vision capability to rate listing photos
- Prompt: analyze each image category, assign 1–5 score, estimate rehab range
- Store results in new `condition_score` column on `properties` table

### Phase 3: Integration
- Auto-rate new properties as they're ingested via `inbound-email`
- Feed condition score into `improvement` field for more accurate Schedule E calculations
- Display photo gallery + condition score in property detail modal

---

## Dependencies

- Claude vision API access (multimodal)
- Image URLs from Zillow listings (available in `raw_json`)
- 20+ manually rated properties for validation
- New database column for structured condition data

---

*This feature is in the "Near Term" section of [IMPROVEMENTS.md](IMPROVEMENTS.md).*
