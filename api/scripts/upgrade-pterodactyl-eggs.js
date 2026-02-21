#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const panelDbContainer = process.env.PANEL_DB_CONTAINER || 'pterodactyl-mariadb-1';
const targetNestName = 'GIVRwrld Games';
const isDryRun = process.argv.includes('--dry-run');

const eggTemplates = {
  'Minecraft Vanilla': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M {{JVM_ARGS}} -jar {{SERVER_JARFILE}} nogui',
    stop: 'stop',
    startupDone: 'Done',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget jq ca-certificates
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f "\${SERVER_JARFILE}" ]]; then
  VERSION_MANIFEST=$(curl -fsSL https://launchermeta.mojang.com/mc/game/version_manifest_v2.json)
  VERSION_URL=$(echo "$VERSION_MANIFEST" | jq -r --arg V "\${MINECRAFT_VERSION}" '.versions[] | select(.id==$V) | .url' | head -n1)
  if [[ -z "$VERSION_URL" || "$VERSION_URL" == "null" ]]; then
    VERSION_URL=$(echo "$VERSION_MANIFEST" | jq -r '.versions[] | select(.type=="release") | .url' | head -n1)
  fi
  SERVER_URL=$(curl -fsSL "$VERSION_URL" | jq -r '.downloads.server.url')
  curl -fsSL "$SERVER_URL" -o "\${SERVER_JARFILE}"
fi`,
    variables: [
      ['Minecraft Version', 'Minecraft release version', 'MINECRAFT_VERSION', '1.21.1', 1, 1, 'required|string|max:32'],
      ['Server Jar File', 'Server jar filename', 'SERVER_JARFILE', 'server.jar', 1, 1, 'required|string|max:64'],
      ['Auto Update', 'Download latest jar during install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['JVM Args', 'Extra JVM flags', 'JVM_ARGS', '', 1, 1, 'nullable|string|max:512'],
      ['EULA', 'Must be TRUE to run', 'EULA', 'TRUE', 1, 1, 'required|string|max:8'],
    ],
  },
  'Minecraft Paper': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M {{JVM_ARGS}} -jar {{SERVER_JARFILE}} nogui',
    stop: 'stop',
    startupDone: 'Done',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget jq ca-certificates
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f "\${SERVER_JARFILE}" ]]; then
  LATEST_BUILD=$(curl -fsSL "https://api.papermc.io/v2/projects/paper/versions/\${MINECRAFT_VERSION}" | jq -r '.builds[-1]')
  PAPER_URL="https://api.papermc.io/v2/projects/paper/versions/\${MINECRAFT_VERSION}/builds/$LATEST_BUILD/downloads/paper-\${MINECRAFT_VERSION}-$LATEST_BUILD.jar"
  curl -fsSL "$PAPER_URL" -o "\${SERVER_JARFILE}"
fi`,
    variables: [
      ['Minecraft Version', 'Paper-supported Minecraft version', 'MINECRAFT_VERSION', '1.21.1', 1, 1, 'required|string|max:32'],
      ['Server Jar File', 'Server jar filename', 'SERVER_JARFILE', 'paper.jar', 1, 1, 'required|string|max:64'],
      ['Auto Update', 'Download latest jar during install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['JVM Args', 'Extra JVM flags', 'JVM_ARGS', '', 1, 1, 'nullable|string|max:512'],
      ['EULA', 'Must be TRUE to run', 'EULA', 'TRUE', 1, 1, 'required|string|max:8'],
    ],
  },
  'Minecraft Purpur': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M {{JVM_ARGS}} -jar {{SERVER_JARFILE}} nogui',
    stop: 'stop',
    startupDone: 'Done',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget jq ca-certificates
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f "\${SERVER_JARFILE}" ]]; then
  PURPUR_URL="https://api.purpurmc.org/v2/purpur/\${MINECRAFT_VERSION}/latest/download"
  curl -fsSL "$PURPUR_URL" -o "\${SERVER_JARFILE}"
fi`,
    variables: [
      ['Minecraft Version', 'Purpur-supported Minecraft version', 'MINECRAFT_VERSION', '1.21.1', 1, 1, 'required|string|max:32'],
      ['Server Jar File', 'Server jar filename', 'SERVER_JARFILE', 'purpur.jar', 1, 1, 'required|string|max:64'],
      ['Auto Update', 'Download latest jar during install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['JVM Args', 'Extra JVM flags', 'JVM_ARGS', '', 1, 1, 'nullable|string|max:512'],
      ['EULA', 'Must be TRUE to run', 'EULA', 'TRUE', 1, 1, 'required|string|max:8'],
    ],
  },
  'Minecraft Fabric': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M {{JVM_ARGS}} -jar {{SERVER_JARFILE}} nogui',
    stop: 'stop',
    startupDone: 'Done',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget jq ca-certificates
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f "\${SERVER_JARFILE}" ]]; then
  INSTALLER_URL="https://meta.fabricmc.net/v2/versions/installer"
  INSTALLER_VERSION=$(curl -fsSL "$INSTALLER_URL" | jq -r '.[0].version')
  curl -fsSL "https://maven.fabricmc.net/net/fabricmc/fabric-installer/$INSTALLER_VERSION/fabric-installer-$INSTALLER_VERSION.jar" -o fabric-installer.jar
  java -jar fabric-installer.jar server -downloadMinecraft -mcversion "\${MINECRAFT_VERSION}"
  if [[ -f "fabric-server-launch.jar" ]]; then
    mv fabric-server-launch.jar "\${SERVER_JARFILE}"
  fi
fi`,
    variables: [
      ['Minecraft Version', 'Fabric Minecraft version', 'MINECRAFT_VERSION', '1.21.1', 1, 1, 'required|string|max:32'],
      ['Server Jar File', 'Server jar filename', 'SERVER_JARFILE', 'fabric-server-launch.jar', 1, 1, 'required|string|max:64'],
      ['Auto Update', 'Download latest jar during install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['JVM Args', 'Extra JVM flags', 'JVM_ARGS', '', 1, 1, 'nullable|string|max:512'],
      ['EULA', 'Must be TRUE to run', 'EULA', 'TRUE', 1, 1, 'required|string|max:8'],
    ],
  },
  'Minecraft Forge': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_21',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M {{JVM_ARGS}} -jar {{SERVER_JARFILE}} nogui',
    stop: 'stop',
    startupDone: 'Done',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget jq ca-certificates
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f "\${SERVER_JARFILE}" ]]; then
  PROMOS=$(curl -fsSL "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json")
  FORGE_KEY="\${MINECRAFT_VERSION}-recommended"
  FORGE_VERSION=$(echo "$PROMOS" | jq -r --arg K "$FORGE_KEY" '.promos[$K]')
  if [[ -z "$FORGE_VERSION" || "$FORGE_VERSION" == "null" ]]; then
    FORGE_KEY="\${MINECRAFT_VERSION}-latest"
    FORGE_VERSION=$(echo "$PROMOS" | jq -r --arg K "$FORGE_KEY" '.promos[$K]')
  fi
  if [[ -z "$FORGE_VERSION" || "$FORGE_VERSION" == "null" ]]; then
    echo "Unable to resolve Forge version for Minecraft \${MINECRAFT_VERSION}"
    exit 1
  fi
  INSTALLER="forge-\${MINECRAFT_VERSION}-\${FORGE_VERSION}-installer.jar"
  curl -fsSL "https://maven.minecraftforge.net/net/minecraftforge/forge/\${MINECRAFT_VERSION}-\${FORGE_VERSION}/$INSTALLER" -o "$INSTALLER"
  java -jar "$INSTALLER" --installServer
  FORGE_JAR=$(ls -1 forge-\${MINECRAFT_VERSION}-\${FORGE_VERSION}.jar 2>/dev/null || true)
  if [[ -z "$FORGE_JAR" ]]; then
    FORGE_JAR=$(ls -1 forge-\${MINECRAFT_VERSION}-\${FORGE_VERSION}-*.jar 2>/dev/null | head -n1 || true)
  fi
  if [[ -z "$FORGE_JAR" ]]; then
    echo "Forge server jar not found after install"
    exit 1
  fi
  cp "$FORGE_JAR" "\${SERVER_JARFILE}"
fi`,
    variables: [
      ['Minecraft Version', 'Forge Minecraft version', 'MINECRAFT_VERSION', '1.20.1', 1, 1, 'required|string|max:32'],
      ['Server Jar File', 'Server jar filename', 'SERVER_JARFILE', 'forge-server.jar', 1, 1, 'required|string|max:64'],
      ['Auto Update', 'Download latest jar during install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['JVM Args', 'Extra JVM flags', 'JVM_ARGS', '', 1, 1, 'nullable|string|max:512'],
      ['EULA', 'Must be TRUE to run', 'EULA', 'TRUE', 1, 1, 'required|string|max:8'],
    ],
  },
  'Palworld': {
    dockerImage: 'ghcr.io/pterodactyl/games:source',
    startup: './PalServer.sh -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS -port={{SERVER_PORT}} -players={{MAX_PLAYERS}} -servername "{{SERVER_NAME}}" {{ADDITIONAL_ARGS}}',
    stop: '^C',
    startupDone: 'Game Server Initialized',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget file tar bzip2 gzip unzip lib32gcc-s1 lib32stdc++6
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f ./PalServer.sh ]]; then
  ./steamcmd/steamcmd.sh +force_install_dir /mnt/server +login anonymous +app_update \${APP_ID} validate +quit
fi`,
    variables: [
      ['App ID', 'Steam application ID', 'APP_ID', '2394010', 1, 0, 'required|numeric'],
      ['Auto Update', 'Auto update on install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['Server Name', 'Palworld server hostname', 'SERVER_NAME', 'GIVRwrld Palworld', 1, 1, 'required|string|max:80'],
      ['Max Players', 'Maximum player slots', 'MAX_PLAYERS', '32', 1, 1, 'required|integer|min:1|max:32'],
      ['Additional Args', 'Extra launch arguments', 'ADDITIONAL_ARGS', '', 1, 1, 'nullable|string|max:512'],
    ],
  },
  'Terraria': {
    dockerImage: 'ghcr.io/pterodactyl/games:source',
    startup: './TerrariaServer.bin.x86_64 -config serverconfig.txt',
    stop: 'exit',
    startupDone: 'Type "help" for a list of commands',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget file tar bzip2 gzip unzip lib32gcc-s1 lib32stdc++6
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f ./TerrariaServer.bin.x86_64 ]]; then
  ./steamcmd/steamcmd.sh +force_install_dir /mnt/server +login anonymous +app_update \${APP_ID} validate +quit
fi
cat > /mnt/server/serverconfig.txt <<EOF
world=/mnt/server/worlds/\${WORLD_NAME}.wld
autocreate=1
worldname=\${WORLD_NAME}
maxplayers=\${MAX_PLAYERS}
port=\${SERVER_PORT}
EOF`,
    variables: [
      ['App ID', 'Steam application ID', 'APP_ID', '105600', 1, 0, 'required|numeric'],
      ['Auto Update', 'Auto update on install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['World Name', 'Terraria world name', 'WORLD_NAME', 'GIVRwrldWorld', 1, 1, 'required|string|max:48'],
      ['Max Players', 'Maximum player slots', 'MAX_PLAYERS', '16', 1, 1, 'required|integer|min:1|max:128'],
    ],
  },
  'Factorio': {
    dockerImage: 'ghcr.io/pterodactyl/games:source',
    startup: './bin/x64/factorio --start-server-load-latest --server-settings /mnt/server/data/server-settings.json --port {{SERVER_PORT}} {{ADDITIONAL_ARGS}}',
    stop: '^C',
    startupDone: 'changing state from(Ready) to(InGame)',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget file tar bzip2 gzip unzip lib32gcc-s1 lib32stdc++6 jq
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f ./bin/x64/factorio ]]; then
  ./steamcmd/steamcmd.sh +force_install_dir /mnt/server +login anonymous +app_update \${APP_ID} validate +quit
fi
mkdir -p /mnt/server/data
cat > /mnt/server/data/server-settings.json <<EOF
{
  "name": "\${SERVER_NAME}",
  "description": "Hosted by GIVRwrld",
  "max_players": \${MAX_PLAYERS},
  "visibility": { "public": false, "lan": true }
}
EOF`,
    variables: [
      ['App ID', 'Steam application ID', 'APP_ID', '427520', 1, 0, 'required|numeric'],
      ['Auto Update', 'Auto update on install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['Server Name', 'Factorio public name', 'SERVER_NAME', 'GIVRwrld Factorio', 1, 1, 'required|string|max:80'],
      ['Max Players', 'Maximum player slots', 'MAX_PLAYERS', '32', 1, 1, 'required|integer|min:1|max:128'],
      ['Additional Args', 'Extra launch arguments', 'ADDITIONAL_ARGS', '', 1, 1, 'nullable|string|max:512'],
    ],
  },
  'Mindustry': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:java_17',
    startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M {{JVM_ARGS}} -jar server.jar host {{WORLD_NAME}}',
    stop: '^C',
    startupDone: 'Opened a server on port',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget file tar bzip2 gzip unzip jq
mkdir -p /mnt/server
cd /mnt/server
if [[ -z "\${DOWNLOAD_URL}" ]]; then
  DOWNLOAD_URL="https://github.com/Anuken/Mindustry/releases/latest/download/server-release.jar"
fi
curl -L "\${DOWNLOAD_URL}" -o /mnt/server/server.jar`,
    variables: [
      ['Download URL', 'Mindustry server jar URL', 'DOWNLOAD_URL', 'https://github.com/Anuken/Mindustry/releases/latest/download/server-release.jar', 1, 1, 'required|url'],
      ['World Name', 'Name of generated world', 'WORLD_NAME', 'givrwrld', 1, 1, 'required|string|max:48'],
      ['JVM Args', 'Extra JVM args', 'JVM_ARGS', '', 1, 1, 'nullable|string|max:256'],
    ],
  },
  'Rimworld': {
    dockerImage: 'ghcr.io/parkervcp/yolks:dotnet_6',
    startup: 'dotnet RimworldServer.dll {{ADDITIONAL_ARGS}}',
    stop: '^C',
    startupDone: 'Server Started',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget unzip
mkdir -p /mnt/server
cd /mnt/server
if [[ -z "\${DOWNLOAD_URL}" ]]; then
  echo "DOWNLOAD_URL must be set to your Rimworld server package URL."
  exit 1
fi
curl -L "\${DOWNLOAD_URL}" -o /tmp/rimworld-server.zip
unzip -o /tmp/rimworld-server.zip -d /mnt/server`,
    variables: [
      ['Download URL', 'Rimworld server package URL', 'DOWNLOAD_URL', '', 1, 1, 'required|url'],
      ['Additional Args', 'Extra startup args', 'ADDITIONAL_ARGS', '', 1, 1, 'nullable|string|max:512'],
    ],
  },
  'Vintage Story': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:debian',
    startup: './server.sh --dataPath ./data --port {{SERVER_PORT}} {{ADDITIONAL_ARGS}}',
    stop: '^C',
    startupDone: 'Server started',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget tar gzip
mkdir -p /mnt/server
cd /mnt/server
if [[ -z "\${DOWNLOAD_URL}" ]]; then
  DOWNLOAD_URL="https://cdn.vintagestory.at/gamefiles/stable/vs_server_linux-x64_latest.tar.gz"
fi
curl -L "\${DOWNLOAD_URL}" -o /tmp/vs-server.tar.gz
tar -xzf /tmp/vs-server.tar.gz -C /mnt/server`,
    variables: [
      ['Download URL', 'Vintage Story server tarball URL', 'DOWNLOAD_URL', 'https://cdn.vintagestory.at/gamefiles/stable/vs_server_linux-x64_latest.tar.gz', 1, 1, 'required|url'],
      ['Additional Args', 'Extra startup args', 'ADDITIONAL_ARGS', '', 1, 1, 'nullable|string|max:512'],
    ],
  },
  'Teeworlds': {
    dockerImage: 'ghcr.io/pterodactyl/games:source',
    startup: './teeworlds_srv -f server.cfg',
    stop: '^C',
    startupDone: 'server name is',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget file tar bzip2 gzip unzip lib32gcc-s1 lib32stdc++6
mkdir -p /mnt/server
cd /mnt/server
if [[ "\${AUTO_UPDATE}" == "1" ]] || [[ ! -f ./teeworlds_srv ]]; then
  ./steamcmd/steamcmd.sh +force_install_dir /mnt/server +login anonymous +app_update \${APP_ID} validate +quit
fi
cat > /mnt/server/server.cfg <<EOF
sv_name "\${SERVER_NAME}"
sv_port \${SERVER_PORT}
sv_max_clients \${MAX_PLAYERS}
EOF`,
    variables: [
      ['App ID', 'Steam application ID', 'APP_ID', '380840', 1, 0, 'required|numeric'],
      ['Auto Update', 'Auto update on install', 'AUTO_UPDATE', '1', 1, 1, 'required|boolean'],
      ['Server Name', 'Server display name', 'SERVER_NAME', 'GIVRwrld Teeworlds', 1, 1, 'required|string|max:80'],
      ['Max Players', 'Maximum player slots', 'MAX_PLAYERS', '16', 1, 1, 'required|integer|min:1|max:64'],
    ],
  },
  'Among Us': {
    dockerImage: 'ghcr.io/parkervcp/yolks:dotnet_6',
    startup: 'dotnet Impostor.Server.dll --port {{SERVER_PORT}} {{ADDITIONAL_ARGS}}',
    stop: '^C',
    startupDone: 'Listening on',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget unzip
mkdir -p /mnt/server
cd /mnt/server
if [[ -z "\${DOWNLOAD_URL}" ]]; then
  DOWNLOAD_URL="https://github.com/Impostor/Impostor/releases/latest/download/Impostor-linux-x64.zip"
fi
curl -L "\${DOWNLOAD_URL}" -o /tmp/impostor.zip
unzip -o /tmp/impostor.zip -d /mnt/server`,
    variables: [
      ['Download URL', 'Impostor server package URL', 'DOWNLOAD_URL', 'https://github.com/Impostor/Impostor/releases/latest/download/Impostor-linux-x64.zip', 1, 1, 'required|url'],
      ['Additional Args', 'Extra startup args', 'ADDITIONAL_ARGS', '', 1, 1, 'nullable|string|max:512'],
    ],
  },
  'Veloren': {
    dockerImage: 'ghcr.io/pterodactyl/yolks:debian',
    startup: './veloren-server-cli {{ADDITIONAL_ARGS}}',
    stop: '^C',
    startupDone: 'Server is now running',
    scriptContainer: 'ghcr.io/pterodactyl/installers:debian',
    scriptInstall: `#!/bin/bash
set -e
apt update
apt -y install curl wget tar xz-utils
mkdir -p /mnt/server
cd /mnt/server
if [[ -z "\${DOWNLOAD_URL}" ]]; then
  DOWNLOAD_URL="https://download.veloren.net/latest/linux/veloren-server-cli-linux-x86_64.tar.xz"
fi
curl -L "\${DOWNLOAD_URL}" -o /tmp/veloren.tar.xz
tar -xJf /tmp/veloren.tar.xz -C /mnt/server --strip-components=1`,
    variables: [
      ['Download URL', 'Veloren server package URL', 'DOWNLOAD_URL', 'https://download.veloren.net/latest/linux/veloren-server-cli-linux-x86_64.tar.xz', 1, 1, 'required|url'],
      ['Additional Args', 'Extra startup args', 'ADDITIONAL_ARGS', '', 1, 1, 'nullable|string|max:512'],
    ],
  },
};

function shellOrThrow(command, args, label) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || '').trim();
    throw new Error(`${label} failed${details ? `: ${details}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function parseContainerEnv(text) {
  const envMap = new Map();
  text.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf('=');
    if (idx <= 0) return;
    envMap.set(line.slice(0, idx), line.slice(idx + 1));
  });
  return envMap;
}

function getPanelDbConfig() {
  const envOutput = shellOrThrow(
    'docker',
    ['inspect', '-f', '{{range .Config.Env}}{{println .}}{{end}}', panelDbContainer],
    'Inspect panel DB container env'
  );
  const envMap = parseContainerEnv(envOutput);
  const user = process.env.PANEL_DB_USER || envMap.get('MYSQL_USER') || 'pterodactyl';
  const password = process.env.PANEL_DB_PASSWORD || envMap.get('MYSQL_PASSWORD');
  const database = process.env.PANEL_DB_DATABASE || envMap.get('MYSQL_DATABASE') || 'panel';
  if (!password) {
    throw new Error('Panel DB password is missing. Set PANEL_DB_PASSWORD in api/.env.');
  }
  return { user, password, database };
}

function escapeSql(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function runPanelSql({ user, password, database, sql }) {
  return shellOrThrow(
    'docker',
    ['exec', panelDbContainer, 'mariadb', `-u${user}`, `-p${password}`, database, '-N', '-e', sql],
    'Panel SQL query'
  );
}

function getNestId({ user, password, database }) {
  const result = runPanelSql({
    user,
    password,
    database,
    sql: `SELECT id FROM nests WHERE name = '${escapeSql(targetNestName)}' LIMIT 1;`,
  });
  return Number(result || 0);
}

function getEggIdByName({ user, password, database, nestId, eggName }) {
  const result = runPanelSql({
    user,
    password,
    database,
    sql: `
      SELECT id
      FROM eggs
      WHERE nest_id = ${nestId}
        AND name = '${escapeSql(eggName)}'
      LIMIT 1;
    `,
  });
  return Number(result || 0);
}

function updateEggTemplate({ user, password, database, eggId, template }) {
  const dockerImages = JSON.stringify({ Default: template.dockerImage }).replace(/\//g, '\\/');
  const startupConfig = JSON.stringify({ done: String(template.startupDone || 'Server started') });
  const updateSql = `
    UPDATE eggs
    SET
      description = '${escapeSql(`${template.startupDone} template`) }',
      features = '[]',
      docker_images = '${escapeSql(dockerImages)}',
      file_denylist = '[]',
      config_files = '{}',
      config_startup = '${escapeSql(startupConfig)}',
      config_logs = '{}',
      config_stop = '${escapeSql(template.stop)}',
      startup = '${escapeSql(template.startup)}',
      script_container = '${escapeSql(template.scriptContainer)}',
      script_entry = 'bash',
      script_is_privileged = 1,
      script_install = '${escapeSql(template.scriptInstall)}',
      updated_at = NOW()
    WHERE id = ${eggId};
  `;
  runPanelSql({ user, password, database, sql: updateSql });

  runPanelSql({
    user,
    password,
    database,
    sql: `DELETE FROM egg_variables WHERE egg_id = ${eggId};`,
  });

  for (const [name, description, env, defaultValue, viewable, editable, rules] of template.variables) {
    const insertVarSql = `
      INSERT INTO egg_variables (
        egg_id, name, description, env_variable, default_value, user_viewable, user_editable, rules, created_at, updated_at
      )
      VALUES (
        ${eggId},
        '${escapeSql(name)}',
        '${escapeSql(description)}',
        '${escapeSql(env)}',
        '${escapeSql(defaultValue)}',
        ${Number(viewable) ? 1 : 0},
        ${Number(editable) ? 1 : 0},
        '${escapeSql(rules)}',
        NOW(),
        NOW()
      );
    `;
    runPanelSql({ user, password, database, sql: insertVarSql });
  }
}

async function main() {
  console.log('🧩 Upgrade custom eggs to real templates');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Panel DB Container: ${panelDbContainer}`);

  const { user, password, database } = getPanelDbConfig();
  const nestId = getNestId({ user, password, database });
  if (!nestId) {
    throw new Error(`Nest "${targetNestName}" was not found. Run ptero:bootstrap-eggs first.`);
  }

  const names = Object.keys(eggTemplates);
  for (const eggName of names) {
    const eggId = getEggIdByName({ user, password, database, nestId, eggName });
    if (!eggId) {
      throw new Error(`Egg "${eggName}" not found in nest ${targetNestName}.`);
    }
    if (isDryRun) {
      console.log(`Would update egg ${eggId}: ${eggName}`);
      continue;
    }
    updateEggTemplate({ user, password, database, eggId, template: eggTemplates[eggName] });
    console.log(`✅ Updated egg ${eggId}: ${eggName}`);
  }

  console.log('\nUpgrade complete.');
  console.log('Next: run `npm run ptero:sync` to refresh app-side egg metadata.');
}

main().catch((error) => {
  console.error(`\n❌ Egg upgrade failed: ${error.message}`);
  process.exit(1);
});

