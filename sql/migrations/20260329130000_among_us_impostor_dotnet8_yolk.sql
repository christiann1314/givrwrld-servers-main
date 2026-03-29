-- Impostor.Server (current GitHub release) targets .NET 8; dotnet_7 yolk exits 150 at runtime.
-- app_core.ptero_eggs fallback image for provision payloads / catalog.
UPDATE ptero_eggs
SET docker_image = 'ghcr.io/parkervcp/yolks:dotnet_8'
WHERE ptero_egg_id = 74;
