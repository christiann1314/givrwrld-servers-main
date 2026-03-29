<?php
/**
 * Emit current Panel node credentials for Wings (CLI only). Run inside Panel container:
 *   docker exec pterodactyl-panel-1 php /tmp/panel-emit-wings-node-credentials.php [node_id]
 *
 * Prints shell-friendly KEY=value lines (no JSON). Parse with: source <(docker exec ...)
 */
$nodeId = (int) ($argv[1] ?? 1);

require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$n = Pterodactyl\Models\Node::with('mounts')->findOrFail($nodeId);
$cfg = $n->getConfiguration();

$esc = static function (string $s): string {
    return str_replace(["\n", "'", '\\'], ['', '\\x27', '\\\\'], $s);
};

fwrite(STDOUT, 'PTERODACTYL_NODE_UUID=' . $esc($cfg['uuid']) . PHP_EOL);
fwrite(STDOUT, 'PTERODACTYL_TOKEN_ID=' . $esc($cfg['token_id']) . PHP_EOL);
fwrite(STDOUT, 'PTERODACTYL_TOKEN=' . $esc($cfg['token']) . PHP_EOL);
