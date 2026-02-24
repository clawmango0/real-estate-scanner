# Property Image Rating System

## How It Works

1. Images from property listings are saved to `/images/`
2. Mr. Kelly rates each image 1-5 for condition
3. System learns patterns from ratings
4. Future properties can be auto-rated

## Rating Scale

| Score | Description | Rehab % |
|-------|-------------|----------|
| 5 | Move-in ready, excellent | 1-2% |
| 4 | Good condition, minor updates | 3-5% |
| 3 | Fair, needs some work | 5-8% |
| 2 | Poor condition, needs renovation | 8-12% |
| 1 | Needs major renovation | 12%+ |

## Image Categories to Rate

- Kitchen
- Bathroom
- Living Room
- Bedroom
- Exterior
- Flooring
- Windows/Doors

## Process

1. Download property images
2. Place in `/images/{property_id}/`
3. Run rating interface
4. Mr. Kelly rates each
5. System learns patterns

## Pattern Matching

After 20+ ratings, system can:
- Identify common issues (dated cabinets, worn flooring)
- Estimate rehab costs based on visual cues
- Predict condition from listing photos

---

*This system helps estimate refurbishment costs more accurately*
