-- Fix: Rust 3GB/1vcore plans are undersized. Rust dedicated server needs 4GB+ RAM and 2+ vcores
-- for SteamCMD download, world generation, and stable gameplay.
-- Deactivate the 3GB plans and ensure all active Rust plans have adequate resources.

START TRANSACTION;

-- Deactivate the undersized 3GB Rust plans
UPDATE plans SET is_active = 0
WHERE item_type = 'game'
  AND game = 'rust'
  AND ram_gb < 4;

COMMIT;
