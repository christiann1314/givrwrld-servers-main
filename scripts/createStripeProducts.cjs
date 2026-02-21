const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY env var');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Adjust this list to match the plans present in your frontend/db
const plans = [
  { name: 'Minecraft 1GB', plan_id: 'minecraft-1gb', priceUsd: 5, game: 'minecraft', ramGB: 1 },
  { name: 'Minecraft 2GB', plan_id: 'minecraft-2gb', priceUsd: 10, game: 'minecraft', ramGB: 2 },
  { name: 'Minecraft 4GB', plan_id: 'minecraft-4gb', priceUsd: 20, game: 'minecraft', ramGB: 4 },
  { name: 'Minecraft 8GB', plan_id: 'minecraft-8gb', priceUsd: 40, game: 'minecraft', ramGB: 8 },

  { name: 'Rust 2GB', plan_id: 'rust-2gb', priceUsd: 10, game: 'rust', ramGB: 2 },
  { name: 'Rust 4GB', plan_id: 'rust-4gb', priceUsd: 20, game: 'rust', ramGB: 4 },
  { name: 'Rust 8GB', plan_id: 'rust-8gb', priceUsd: 40, game: 'rust', ramGB: 8 },
  { name: 'Rust 16GB', plan_id: 'rust-16gb', priceUsd: 80, game: 'rust', ramGB: 16 },

  { name: 'Palworld 4GB', plan_id: 'palworld-4gb', priceUsd: 20, game: 'palworld', ramGB: 4 },
  { name: 'Palworld 8GB', plan_id: 'palworld-8gb', priceUsd: 40, game: 'palworld', ramGB: 8 },
  { name: 'Palworld 16GB', plan_id: 'palworld-16gb', priceUsd: 80, game: 'palworld', ramGB: 16 },
];

function toCents(amountUsd) {
  return Math.round(amountUsd * 100);
}

(async () => {
  const map = {};
  for (const plan of plans) {
    const product = await stripe.products.create({
      name: plan.name,
      description: `${plan.game} server hosting - ${plan.ramGB}GB RAM`,
      metadata: {
        plan_id: plan.plan_id,
        game: plan.game,
        ram_gb: String(plan.ramGB),
      },
    });

    const monthly = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: toCents(plan.priceUsd),
      recurring: { interval: 'month' },
      metadata: { plan_id: plan.plan_id, term: 'monthly' },
    });

    const yearlyUsd = Math.round(plan.priceUsd * 12 * 0.8); // 20% off annually
    const yearly = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: toCents(yearlyUsd),
      recurring: { interval: 'year' },
      metadata: { plan_id: plan.plan_id, term: 'yearly' },
    });

    map[plan.plan_id] = {
      product: product.id,
      monthly: monthly.id,
      yearly: yearly.id,
    };
  }

  console.log(JSON.stringify(map, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});


