-- Egg 74 (Among Us / Impostor): older seed copied Terraria startup into app_core.ptero_eggs.
-- API now prefers Panel Application API egg.startup; clearing MySQL avoids wrong create payloads on re-provision.
-- Existing Panel servers still need Startup reset or Reinstall (see docs).

UPDATE ptero_eggs
SET startup_cmd = NULL
WHERE ptero_egg_id = 74;
