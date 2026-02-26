-- Phase 3a: Green speed → round level, weather/temperature/time

-- Green speed at round level (source of truth; replaces per-putt preSpeed)
ALTER TABLE rounds ADD COLUMN green_speed numeric(2,1) DEFAULT 3.0;

-- Round-level weather & conditions
ALTER TABLE rounds ADD COLUMN weather text;          -- sunny|partly-cloudy|cloudy|rain|snow|fog
ALTER TABLE rounds ADD COLUMN temperature numeric(3,1);
ALTER TABLE rounds ADD COLUMN round_time timestamptz DEFAULT now();
