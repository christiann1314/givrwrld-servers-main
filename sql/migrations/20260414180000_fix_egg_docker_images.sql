-- Fix Minecraft egg Docker images from java_8 to java_21
-- Purpur (64) requires Java 17+ for --add-modules=jdk.incubator.vector
-- Fabric (63) modern versions require Java 17+

UPDATE ptero_eggs SET docker_image = 'ghcr.io/pterodactyl/yolks:java_21'
WHERE ptero_egg_id = 64 AND docker_image LIKE '%java_8%';

UPDATE ptero_eggs SET docker_image = 'ghcr.io/pterodactyl/yolks:java_21'
WHERE ptero_egg_id = 63 AND docker_image LIKE '%java_8%';
