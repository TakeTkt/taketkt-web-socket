-- Create a trigger function to notify on changes to the waiting table
CREATE OR REPLACE FUNCTION notify_waitings() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'INSERT' THEN PERFORM pg_notify('waitings_realtime', 'inserted');
ELSIF TG_OP = 'UPDATE' THEN PERFORM pg_notify('waitings_realtime', 'updated');
ELSIF TG_OP = 'DELETE' THEN PERFORM pg_notify('waitings_realtime', 'deleted');
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create a trigger function to notify on changes to the reservation table
CREATE OR REPLACE FUNCTION notify_reservations() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'INSERT' THEN PERFORM pg_notify('reservations_realtime', 'inserted');
ELSIF TG_OP = 'UPDATE' THEN PERFORM pg_notify('reservations_realtime', 'updated');
ELSIF TG_OP = 'DELETE' THEN PERFORM pg_notify('reservations_realtime', 'deleted');
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create a trigger for the waitings table
CREATE TRIGGER waitings_trigger
AFTER
INSERT ON waitings FOR EACH ROW EXECUTE FUNCTION notify_waitings();
-- Create a trigger for the reservations table
CREATE TRIGGER reservations_trigger
AFTER
INSERT ON reservations FOR EACH ROW EXECUTE FUNCTION notify_reservations();