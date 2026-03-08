# Data Entry Format

Quick format for adding new properties to the analyzer.

---

## Add a Property (For Sale)

Copy and fill in this format:

```
PROPERTY: 4813 Sandage Ave, Ft Worth TX | $182000 | 3 | 2 | 1011 | 1958 | 6
```

Format: `PROPERTY: Address | Price | Beds | Baths | Sqft | YearBuilt | Condition(1-10)`

---

## Add a Rental Comp

```
RENTAL: 4800 Sandage Ave, Ft Worth TX | 3 | 2 | 1050 | 1650
```

Format: `RENTAL: Address | Beds | Baths | Sqft | Rent`

---

## Add a Comparable Sale

```
COMP: 4805 Sandage Ave, Ft Worth TX | $178000 | 2025-12-15 | 1000
```

Format: `COMP: Address | SoldPrice | SoldDate | Sqft`

---

## Add a Duplex/Multi-Unit

```
DUPLEX: 2847 W Seminary Dr, Ft Worth TX | $285000 | 2 | 2400 | 2800
```

Format: `DUPLEX: Address | Price | Units | TotalSqft | TotalRent`

---

## Example Batch Entry

```
PROPERTY: 4813 Sandage Ave, Ft Worth TX | $182000 | 3 | 2 | 1011 | 1958 | 6
PROPERTY: 5808 Wales Ave, Ft Worth TX | $195000 | 3 | 2 | 1664 | 1962 | 7
PROPERTY: 3636 Saint Louis Ave, Ft Worth TX | $200000 | 4 | 2 | 1392 | 1955 | 5

RENTAL: 4800 Ft Worth TX | 3 |  Sandage Ave,2 | 1050 | 1650
RENTAL: 5800 Wales Ave, Ft Worth TX | 3 | 2 | 1600 | 1800
RENTAL: 3600 Saint Louis Ave, Ft Worth TX | 4 | 2 | 1400 | 1700

COMP: 4805 Sandage Ave, Ft Worth TX | $178000 | 2025-12-15 | 1000
COMP: 5805 Wales Ave, Ft Worth TX | $190000 | 2025-11-20 | 1650

DUPLEX: 2847 W Seminary Dr, Ft Worth TX | $285000 | 2 | 2400 | 2800
```

---

## Property Condition Guide

| Score | Description | Est. Rehab $/sqft |
|-------|-------------|------------------|
| 10 | Like new | $0-5 |
| 8-9 | Excellent | $5-10 |
| 7 | Good | $10-15 |
| 6 | Fair | $15-25 |
| 5 | Needs work | $25-35 |
| 3-4 | Major rehab | $50-75 |
| 1-2 | Tear down | $75-100+ |

---

*Paste entries into the analyzer or manually add to properties.py*
