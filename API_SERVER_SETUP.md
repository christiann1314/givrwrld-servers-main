# API Server Setup Guide

**Date:** 2025-11-10  
**Purpose:** Complete setup guide for self-hosted API server

---

## ✅ What's Been Created

### API Server Structure
```
api/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── .env                   # Environment variables (created)
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── stripe.js         # Stripe webhook
│   ├── checkout.js       # Checkout session
│   ├── plans.js          # Plans endpoint
│   ├── orders.js         # Orders endpoint
│   └── servers.js        # Servers endpoint
├── middleware/
│   └── auth.js           # JWT authentication middleware
├── utils/
│   ├── mysql.js          # MySQL utilities
│   └── jwt.js            # JWT utilities
└── config/
    └── database.js       # MySQL connection
```

### Frontend API Client
- `src/lib/api.ts` - Complete API client replacement for Supabase

---

## 🚀 Starting the Server

### Option 1: Direct Start
```bash
cd /home/ubuntu/givrwrld-severs/api
npm start
```

### Option 2: Using Start Script
```bash
cd /home/ubuntu/givrwrld-severs/api
./start.sh
```

### Option 3: Using PM2 (Recommended for Production)
```bash
cd /home/ubuntu/givrwrld-severs/api
npm run pm2:start
```

### Option 4: Using Systemd (Recommended for Production)
```bash
# Copy service file
sudo cp api/systemd/givrwrld-api.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start givrwrld-api

# Enable on boot
sudo systemctl enable givrwrld-api

# Check status
sudo systemctl status givrwrld-api
```

---

## 🔧 Configuration

### Environment Variables
The `.env` file has been created with:
- MySQL connection details
- JWT secret (auto-generated)
- AES key (from AES_KEY.txt)
- Port: 3001

### Update Frontend Environment
Add to your frontend `.env`:
```bash
VITE_API_URL=http://localhost:3001
# Or in production:
VITE_API_URL=https://api.givrwrldservers.com
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### Stripe
- `POST /api/stripe/webhook` - Stripe webhook handler

### Checkout
- `POST /api/checkout/create-session` - Create checkout session

### Plans
- `GET /api/plans` - Get all active plans

### Orders
- `GET /api/orders` - Get user orders (requires auth)

### Servers
- `GET /api/servers` - Get user servers (requires auth)
- `POST /api/servers/provision` - Provision server

---

## 🧪 Testing

### Test Health Check
```bash
curl http://localhost:3001/health
```

### Test Authentication
```bash
# Signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Plans
```bash
curl http://localhost:3001/api/plans
```

---

## 🔒 Security Notes

1. **JWT Secret**: Auto-generated in `.env` - change in production
2. **CORS**: Currently allows all origins - restrict in production
3. **HTTPS**: Use reverse proxy (nginx) with SSL in production
4. **Rate Limiting**: Not yet implemented - add if needed

---

## 🌐 Production Deployment

### 1. Setup Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.givrwrldservers.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. Update Stripe Webhook URL
- Go to Stripe Dashboard → Webhooks
- Update URL to: `https://api.givrwrldservers.com/api/stripe/webhook`

### 3. Update Frontend
- Set `VITE_API_URL=https://api.givrwrldservers.com`
- Rebuild frontend

---

## 📋 Next Steps

1. ✅ API server created
2. ✅ Frontend API client created
3. ⏳ Update frontend to use new API client
4. ⏳ Test authentication flow
5. ⏳ Test purchase flow
6. ⏳ Deploy to production

---

**Status:** API server ready for testing!


