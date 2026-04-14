import pool from '../config/database.js';

async function run() {
  console.log('--- Creating password_reset_tokens table ---');
  await pool.execute(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_token_hash (token_hash),
    INDEX idx_password_reset_user_id (user_id),
    INDEX idx_password_reset_expires_at (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('OK');

  console.log('\n--- Adding billing term columns ---');
  const [cols] = await pool.execute(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'plans'
     AND column_name IN ('price_quarterly','price_semiannual','price_yearly')`
  );
  const existing = new Set(cols.map(c => c.COLUMN_NAME || c.column_name));

  if (!existing.has('price_quarterly')) {
    await pool.execute('ALTER TABLE plans ADD COLUMN price_quarterly DECIMAL(10,2) NULL AFTER price_monthly');
    console.log('Added price_quarterly');
  } else {
    console.log('price_quarterly already exists');
  }

  if (!existing.has('price_semiannual')) {
    await pool.execute('ALTER TABLE plans ADD COLUMN price_semiannual DECIMAL(10,2) NULL AFTER price_quarterly');
    console.log('Added price_semiannual');
  } else {
    console.log('price_semiannual already exists');
  }

  if (!existing.has('price_yearly')) {
    await pool.execute('ALTER TABLE plans ADD COLUMN price_yearly DECIMAL(10,2) NULL AFTER price_semiannual');
    console.log('Added price_yearly');
  } else {
    console.log('price_yearly already exists');
  }

  console.log('\n--- Populating term prices (5%/10%/20% discounts) ---');
  const [r1] = await pool.execute(
    `UPDATE plans SET price_quarterly = ROUND(price_monthly * 3 * 0.95, 2) WHERE price_quarterly IS NULL AND price_monthly > 0`
  );
  console.log(`quarterly: ${r1.affectedRows} rows updated`);

  const [r2] = await pool.execute(
    `UPDATE plans SET price_semiannual = ROUND(price_monthly * 6 * 0.90, 2) WHERE price_semiannual IS NULL AND price_monthly > 0`
  );
  console.log(`semiannual: ${r2.affectedRows} rows updated`);

  const [r3] = await pool.execute(
    `UPDATE plans SET price_yearly = ROUND(price_monthly * 12 * 0.80, 2) WHERE price_yearly IS NULL AND price_monthly > 0`
  );
  console.log(`yearly: ${r3.affectedRows} rows updated`);

  console.log('\n--- Verify sample prices ---');
  const [sample] = await pool.execute(
    `SELECT id, display_name, price_monthly, price_quarterly, price_semiannual, price_yearly
     FROM plans WHERE is_active = 1 AND item_type = 'game' LIMIT 5`
  );
  for (const s of sample) {
    console.log(`${s.id} | $${s.price_monthly}/mo | $${s.price_quarterly}/3mo | $${s.price_semiannual}/6mo | $${s.price_yearly}/yr`);
  }

  await pool.end();
  console.log('\nDone!');
}

run().catch(err => { console.error(err); process.exit(1); });
