# Required Secrets Documentation

## Supabase Edge Functions - Required Secrets

This document lists all required secrets that must be configured in Supabase Edge Functions for the platform to function correctly.

### Supabase Core Secrets

| Secret Name | Required For | Description |
|------------|--------------|-------------|
| `SUPABASE_URL` | All functions | Your Supabase project URL (e.g., `https://mjhvkvnshnbnxojnandf.supabase.co`) |
| `SUPABASE_ANON_KEY` | Most functions | Supabase anonymous key for client-side authentication |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side operations | Supabase service role key for privileged operations (orders, provisioning) |

### Stripe Integration Secrets

| Secret Name | Required For | Description |
|------------|--------------|-------------|
| `STRIPE_SECRET_KEY` | Checkout, webhook | Your Stripe secret key (LIVE: `sk_live_...`, TEST: `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook | Stripe webhook signing secret (starts with `whsec_...`) |

### Pterodactyl Panel Secrets

**Note:** Two sets of credentials are required due to different function naming conventions:

| Secret Name | Required For | Description |
|------------|--------------|-------------|
| `PANEL_URL` | `servers-provision` | Pterodactyl panel URL (e.g., `https://panel.givrwrldservers.com`) |
| `PTERO_APP_KEY` | `servers-provision` | Pterodactyl Application API key (starts with `ptla_...`) |
| `PTERODACTYL_URL` | `create-pterodactyl-user`, `sync-server-status`, etc. | Same as `PANEL_URL` - different functions use different names |
| `PTERODACTYL_API_KEY` | `create-pterodactyl-user`, `sync-server-status`, etc. | Same as `PTERO_APP_KEY` - different functions use different names |

**Important:** Both sets should have the **same values**:
- `PANEL_URL` = `PTERODACTYL_URL`
- `PTERO_APP_KEY` = `PTERODACTYL_API_KEY`

### Optional Secrets

| Secret Name | Required For | Description |
|------------|--------------|-------------|
| `ALLOW_ORIGINS` | CORS handling | Comma-separated list of allowed origins (optional, has defaults) |
| `ALERTS_WEBHOOK` | Webhook notifications | Discord/Slack webhook URL for order alerts (optional) |

## How to Set Secrets

### Via Supabase CLI

```bash
export SUPABASE_ACCESS_TOKEN='your_access_token'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Set a secret
npx supabase secrets set SECRET_NAME="secret_value" --project-ref $PROJECT_REF
```

### Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
2. Click "Secrets" tab
3. Add each secret with its value

## Current Secret Status

### ✅ Configured
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PANEL_URL` / `PTERODACTYL_URL` (both set to `https://panel.givrwrldservers.com`)
- `PTERO_APP_KEY` / `PTERODACTYL_API_KEY` (both set to `ptla_nCMil1ujYSSZ3ooMPiOI9r459kfGztE0Hfdlw8FrFQC`)

### ⚠️ Needs Verification
- `ALLOW_ORIGINS` (optional, has defaults)
- `ALERTS_WEBHOOK` (optional)

## Verification

To verify all secrets are set:

```bash
export SUPABASE_ACCESS_TOKEN='your_access_token'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

npx supabase secrets list --project-ref $PROJECT_REF
```

## Security Notes

- **Never commit secrets to Git** - All secrets are stored in Supabase
- **Use different keys for test/production** - Stripe has separate test/live keys
- **Rotate secrets regularly** - Especially API keys
- **Service role key is powerful** - Only use for server-side operations
- **Webhook secrets must match** - Stripe webhook secret must exactly match the one in Stripe Dashboard

## Troubleshooting

### Function fails with "Missing configuration"
- Check that the secret is set in Supabase
- Verify the secret name matches exactly (case-sensitive)
- Check function logs for specific missing secret

### "Invalid signature" errors
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Ensure you're using the correct secret for test/live mode

### "Pterodactyl configuration missing"
- Verify both `PANEL_URL` and `PTERODACTYL_URL` are set (or `PTERO_APP_KEY` and `PTERODACTYL_API_KEY`)
- Some functions use different variable names - set both for compatibility

