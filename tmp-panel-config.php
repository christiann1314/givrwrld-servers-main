<?php
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
echo "guzzle.timeout=" . config('pterodactyl.guzzle.timeout') . PHP_EOL;
echo "guzzle.connect_timeout=" . config('pterodactyl.guzzle.connect_timeout') . PHP_EOL;
