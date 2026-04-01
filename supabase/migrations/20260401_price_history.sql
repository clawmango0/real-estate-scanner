-- Track price changes over time for trend analysis
ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_history jsonb DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_date timestamptz;

-- Populate listing_date from created_at for existing properties
UPDATE properties SET listing_date = created_at WHERE listing_date IS NULL;
