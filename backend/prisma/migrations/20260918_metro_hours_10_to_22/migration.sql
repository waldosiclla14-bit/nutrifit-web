-- Metro delivery window: 10 AM - 10 PM (adjusts previous 9 AM start)
UPDATE "delivery_settings" SET "value" = '"10:00"' WHERE "key" = 'delivery_start_time';
UPDATE "delivery_settings" SET "value" = '"22:00"' WHERE "key" = 'delivery_end_time';
