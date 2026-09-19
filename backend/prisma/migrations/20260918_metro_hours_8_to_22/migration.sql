-- Metro delivery window: 8 AM - 10 PM (fixed 30-min windows, spec section 4.7.1)
UPDATE "delivery_settings" SET "value" = '"08:00"' WHERE "key" = 'delivery_start_time';
UPDATE "delivery_settings" SET "value" = '"22:00"' WHERE "key" = 'delivery_end_time';
