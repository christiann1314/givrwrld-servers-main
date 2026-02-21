-- Update plans with real Stripe monthly price IDs (live)
-- Ensure these plan IDs exist in public.plans before running.

update public.plans set stripe_price_id = 'price_1SE9WSB3VffY65l6lgZ1DZIk' where id = 'minecraft-1gb';
update public.plans set stripe_price_id = 'price_1SE9WTB3VffY65l6zf0SHhav' where id = 'minecraft-2gb';
update public.plans set stripe_price_id = 'price_1SE9WUB3VffY65l6nwepXK1E' where id = 'minecraft-4gb';
update public.plans set stripe_price_id = 'price_1SE9WWB3VffY65l6yIuf7sEC' where id = 'minecraft-8gb';

update public.plans set stripe_price_id = 'price_1SE9WXB3VffY65l6eom1HnMK' where id = 'rust-2gb';
update public.plans set stripe_price_id = 'price_1SE9WYB3VffY65l6J7Gkqp5l' where id = 'rust-4gb';
update public.plans set stripe_price_id = 'price_1SE9WZB3VffY65l682apBvO8' where id = 'rust-8gb';
update public.plans set stripe_price_id = 'price_1SE9WaB3VffY65l6FwoEAYt5' where id = 'rust-16gb';

update public.plans set stripe_price_id = 'price_1SE9WbB3VffY65l6zxhP3laF' where id = 'palworld-4gb';
update public.plans set stripe_price_id = 'price_1SE9WcB3VffY65l6Xkfss6Be' where id = 'palworld-8gb';
update public.plans set stripe_price_id = 'price_1SE9WdB3VffY65l6WPQiuKAU' where id = 'palworld-16gb';

-- Optionally verify
-- select id, display_name, stripe_price_id from public.plans where id in (
--   'minecraft-1gb','minecraft-2gb','minecraft-4gb','minecraft-8gb',
--   'rust-2gb','rust-4gb','rust-8gb','rust-16gb',
--   'palworld-4gb','palworld-8gb','palworld-16gb'
-- );

