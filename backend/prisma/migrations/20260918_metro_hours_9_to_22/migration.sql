-- Expand metro delivery window to 9 AM - 10 PM
UPDATE "delivery_settings" SET "value" = '"09:00"' WHERE "key" = 'delivery_start_time';
UPDATE "delivery_settings" SET "value" = '"22:00"' WHERE "key" = 'delivery_end_time';
