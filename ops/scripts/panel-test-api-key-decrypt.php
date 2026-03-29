<?php
require '/app/vendor/autoload.php';
$app = require '/app/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$rows = Illuminate\Support\Facades\DB::table('api_keys')->orderBy('id')->get();
foreach ($rows as $r) {
    try {
        $plain = decrypt($r->token);
        echo "id={$r->id} identifier={$r->identifier} OK len=" . strlen($plain) . PHP_EOL;
    } catch (Throwable $e) {
        echo "id={$r->id} identifier={$r->identifier} FAIL: " . $e->getMessage() . PHP_EOL;
    }
}
