-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_properties_user_created ON properties(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_zip ON properties(zip) WHERE zip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_listed_price ON properties(listed_price) WHERE listed_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_neighborhoods_zip ON neighborhoods(zip);
