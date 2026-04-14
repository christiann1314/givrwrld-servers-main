-- Fix Minecraft egg Docker images to java_25
-- Latest Purpur/Paper/Forge/Fabric/Vanilla builds require Java 25+

UPDATE ptero_eggs SET docker_image = 'ghcr.io/pterodactyl/yolks:java_25'
WHERE ptero_egg_id IN (60, 61, 62, 63, 64)
  AND docker_image NOT LIKE '%java_25%';
