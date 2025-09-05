-- Migration: Make origin_city nullable in legs table
-- Date: 2024-12-18
-- Description: Allows legs to be created without specifying an origin city
-- 
-- CONTEXT: Some tours may have multiple possible origins or unknown origins
-- BUSINESS_RULE: Origin should be optional for flexible tour planning
-- DATABASE: Alters legs table to allow NULL values in origin_city column

-- Make origin_city nullable in legs table
-- CONTEXT: Origin should be optional for legs where there might be multiple origins
-- or where the origin is unknown/not applicable
ALTER TABLE legs ALTER COLUMN origin_city DROP NOT NULL;
