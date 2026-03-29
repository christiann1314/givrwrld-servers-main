<?php
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$n = Pterodactyl\Models\Node::findOrFail(1);
echo 'decrypted_len=' . strlen($n->getDecryptedKey()) . PHP_EOL;
