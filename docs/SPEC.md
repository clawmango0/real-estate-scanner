# Real Estate Property Scout Dashboard - SPEC

## Project Overview
- **Name:** Fort Worth Property Scout Dashboard
- **Type:** Interactive single-page web application
- **Core functionality:** Visual dashboard for analyzing investment properties with drill-down capability
- **Target users:** Real estate investors analyzing Fort Worth area properties

## UI/UX Specification

### Layout Structure
- **Header:** Logo, title, last updated timestamp, refresh button
- **Navigation:** Tab-based (Overview | Properties | Investment Analysis | Market Data)
- **Main Content:** Grid-based card layout with visualizations
- **Footer:** Data sources, disclaimer

### Responsive Breakpoints
- Desktop: 1200px+ (4-column grid)
- Tablet: 768px-1199px (2-column grid)
- Mobile: <768px (single column)

### Visual Design
- **Color Palette:**
  - Primary: #1E3A5F (deep navy)
  - Secondary: #2E7D32 (money green)
  - Accent: #FF6B35 (alert orange)
  - Success: #4CAF50
  - Danger: #F44336
  - Background: #0D1117 (dark theme)
  - Card BG: #161B22
  - Text Primary: #E6EDF3
  - Text Secondary: #8B949E
  - Border: #30363D

### Components

#### 1. KPI Cards (4 across top)
- Total Properties Scanned
- Properties Under Budget
- Passing Investment Criteria
- Average Cash Flow
- Hover: Expand to show calculation details

#### 2. Price Distribution Chart (Bar/Histogram)
- Interactive bar chart showing price ranges
- Click bar: Filter to that price range
- Hover: Show count and percentage

#### 3. Investment Pass/Fail Pie Chart
- Doughnut chart showing pass/fail ratio
- Click segment: Filter properties list
- Hover: Show count and percentage

#### 4. Cash Flow by Property Type (Horizontal Bar)
- Compare SFR vs Duplex vs Multi-family
- Click: Filter to that type
- Hover: Show exact numbers

#### 5. Properties Table (Full Width)
- Sortable columns
- Click row: Expand detail panel
- Inline sparklines for trends
- Status badges (PASS/FAIL)

#### 6. Map Placeholder (Future)
- Area visualization

### Interactive Behaviors
- **Hover:** Cards expand with detailed data
- **Click:** Filters apply to all visualizations
- **Drill-down:** Click property for full analysis modal
- **Tooltips:** Rich data on hover for all chart elements

## Functionality Specification

### Core Features
1. Load property data from JSON
2. Calculate investment metrics (cash flow, CoC, cap rate)
3. Apply investment criteria filters
4. Interactive chart rendering (Chart.js)
5. Sortable/filterable data table
6. Property detail modal with full analysis
7. Export data functionality

### Data Structure
```json
{
  "properties": [
    {
      "address": "string",
      "price": number,
      "beds": number,
      "baths": number,
      "sqft": number,
      "type": "SFR|Duplex|Multi",
      "rent_estimate": number,
      "cash_flow": number,
      "coc": number,
      "passes": boolean,
      "zip": string,
      "area": string
    }
  ]
}
```

### Investment Calculations
- Cash Flow = Rent - (Rent × 0.50) - (Price × 0.019/12) - Mortgage
- CoC = (Cash Flow × 12) / Down Payment
- Pass = Cash Flow >= $200 AND CoC >= 8%

## Acceptance Criteria
- [ ] Dashboard loads with sample data
- [ ] All 4 KPI cards display with hover detail
- [ ] Price distribution chart renders and is interactive
- [ ] Pass/Fail chart renders and is interactive
- [ ] Property table is sortable
- [ ] Click property row shows detail modal
- [ ] Filters work across all components
- [ ] Responsive on mobile
- [ ] Dark theme applied consistently
- [ ] All hover states show additional data
