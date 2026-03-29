<?php
/**
 * Run inside the Panel container (Path A: new daemon creds without rotating APP_KEY).
 * Broken ciphertext on nodes.daemon_token cannot be loaded via Eloquent — this uses DB + Encrypter only.
 *
 *   docker cp panel-regenerate-node-daemon.php pterodactyl-panel-1:/tmp/
 *   docker exec pterodactyl-panel-1 php /tmp/panel-regenerate-node-daemon.php [node_id]
 */
$nodeId = (int) ($argv[1] ?? 1);

require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$enc = app(Illuminate\Contracts\Encryption\Encrypter::class);
$tokenId = Illuminate\Support\Str::random(Pterodactyl\Models\Node::DAEMON_TOKEN_ID_LENGTH);
$plainToken = Illuminate\Support\Str::random(Pterodactyl\Models\Node::DAEMON_TOKEN_LENGTH);
$cipher = $enc->encrypt($plainToken);

$rows = Illuminate\Support\Facades\DB::table('nodes')
    ->where('id', $nodeId)
    ->update([
        'daemon_token_id' => $tokenId,
        'daemon_token' => $cipher,
    ]);

if ($rows !== 1) {
    fwrite(STDERR, "Expected 1 row updated, got {$rows}\n");
    exit(1);
}

fwrite(STDOUT, 'OK node=' . $nodeId . ' new_daemon_token_id=' . $tokenId . PHP_EOL);
unset($plainToken, $cipher, $enc);
