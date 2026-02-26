# Frontend Environment Setup

## Required Environment Variables

Add to your frontend `.env` file:

```bash
# API Server URL (replace with your actual API URL)
VITE_API_URL=http://localhost:3001

# Remove or comment out Supabase variables (no longer needed)
# VITE_SUPABASE_URL=
# VITE_SUPABASE_ANON_KEY=
```

## Production Setup

For production, set:
```bash
VITE_API_URL=https://api.givrwrldservers.com
```

Or if using a reverse proxy:
```bash
VITE_API_URL=https://givrwrldservers.com/api
```

## Testing

1. Start the API server:
   ```bash
   cd api
   npm start
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Test authentication:
   - Sign up a new user
   - Sign in
   - Check dashboard loads

4. Test checkout:
   - Select a plan
   - Create checkout session
   - Verify redirect to Stripe
