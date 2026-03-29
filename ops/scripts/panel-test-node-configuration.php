<?php
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$n = Pterodactyl\Models\Node::with('mounts')->findOrFail(1);
$cfg = $n->getConfiguration();
echo json_encode(array_keys($cfg)), PHP_EOL;
echo 'token_id=', $cfg['token_id'], PHP_EOL;
