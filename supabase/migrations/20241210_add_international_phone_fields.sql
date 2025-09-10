-- Migration: Add international phone number fields to tour_personnel table
-- Description: Adds E.164 phone format storage and separate country/national number fields
-- Required for: International phone number handling in employee portal

-- Add new phone-related columns to tour_personnel table
ALTER TABLE tour_personnel 
ADD COLUMN phone_e164 VARCHAR(16), -- E.164 format: +14155552671 (max 15 digits + sign)
ADD COLUMN phone_country VARCHAR(2), -- ISO 3166-1 alpha-2 country code: US, FR, etc.
ADD COLUMN phone_national_number VARCHAR(20), -- National format without country code
ADD COLUMN phone_extension VARCHAR(10); -- Extension number if applicable

-- Add similar fields for emergency contact phone
ALTER TABLE tour_personnel
ADD COLUMN emergency_contact_phone_e164 VARCHAR(16),
ADD COLUMN emergency_contact_phone_country VARCHAR(2),
ADD COLUMN emergency_contact_phone_national VARCHAR(20),
ADD COLUMN emergency_contact_phone_extension VARCHAR(10);

-- Add comments for documentation
COMMENT ON COLUMN tour_personnel.phone_e164 IS 'Phone number in E.164 format (+14155552671). Primary storage for international compatibility.';
COMMENT ON COLUMN tour_personnel.phone_country IS 'ISO 3166-1 alpha-2 country code (US, FR, GB, etc.) for the phone number.';
COMMENT ON COLUMN tour_personnel.phone_national_number IS 'National format of phone number without country code, for display purposes.';
COMMENT ON COLUMN tour_personnel.phone_extension IS 'Phone extension number (optional).';

COMMENT ON COLUMN tour_personnel.emergency_contact_phone_e164 IS 'Emergency contact phone in E.164 format.';
COMMENT ON COLUMN tour_personnel.emergency_contact_phone_country IS 'Emergency contact phone country code.';
COMMENT ON COLUMN tour_personnel.emergency_contact_phone_national IS 'Emergency contact phone national format.';
COMMENT ON COLUMN tour_personnel.emergency_contact_phone_extension IS 'Emergency contact phone extension.';

-- Note: We're keeping the existing 'phone' and 'emergency_contact_phone' columns for backward compatibility
-- and as fallback storage. New code should use the _e164 fields as primary source.
COMMENT ON COLUMN tour_personnel.phone IS 'Legacy phone field. Use phone_e164 for new functionality.';
COMMENT ON COLUMN tour_personnel.emergency_contact_phone IS 'Legacy emergency phone field. Use emergency_contact_phone_e164 for new functionality.';
