-- Create a trigger function to notify on changes to the waiting table
CREATE OR REPLACE FUNCTION notify_waitings() RETURNS TRIGGER AS $$ BEGIN PERFORM pg_notify('waitings_realtime', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create a trigger function to notify on changes to the reservation table
CREATE OR REPLACE FUNCTION notify_reservations() RETURNS TRIGGER AS $$ BEGIN PERFORM pg_notify('reservations_realtime', row_to_json(NEW)::text);
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create a trigger for the waitings table
DROP TRIGGER IF EXISTS waitings_trigger ON waitings;
CREATE TRIGGER waitings_trigger
AFTER
INSERT
  OR
UPDATE
  OR DELETE ON waitings FOR EACH ROW EXECUTE FUNCTION notify_waitings();
-- Create a trigger for the reservations table
DROP TRIGGER IF EXISTS reservations_trigger ON reservations;
CREATE TRIGGER reservations_trigger
AFTER
INSERT
  OR
UPDATE
  OR DELETE ON reservations FOR EACH ROW EXECUTE FUNCTION notify_reservations();