# Pterodactyl Configuration Requirements

## 🔑 API Keys Needed

Please provide these from your Pterodactyl panel:

### 1. Application API Key (Admin Access)
- Go to: Admin Panel → Application API → Create New
- **Description**: GIVRwrld Server Provisioning
- **Permissions**: All permissions checked
- **Key format**: `ptlc_...` (long key)

### 2. Client API Key (Server Stats)
- Go to: Account → API Credentials → Create
- **Description**: GIVRwrld Stats Monitoring  
- **Permissions**: All permissions
- **Key format**: `ptlc_...` (different from app key)

## 🖥️ Node Information Needed

For each Pterodactyl node you want to use:

### Node Details:
1. **Node ID** (from Admin → Nodes → View node → URL shows ID)
2. **Node Name** (e.g., "US-East-1", "EU-West-1")
3. **Region Code** (e.g., "east", "west", "eu")
4. **Total RAM** (in GB)
5. **Total Disk** (in GB)
6. **Available Allocations** (IP:Port combinations available)

Example:
```
Node ID: 1
Name: US-East-1
Region: east
RAM: 64 GB
Disk: 1000 GB
Allocations: 192.168.1.100:25565-25664 (100 ports available)
```

## 🥚 Game Egg IDs Needed

For each game type, I need the Egg ID from your panel:

### Minecraft Egg
- Go to: Admin → Nests → Minecraft → View eggs
- **Egg ID**: ? (usually 1-5)
- **Egg Name**: (e.g., "Vanilla Minecraft", "Paper")

### Rust Egg  
- Go to: Admin → Nests → Rust → View eggs
- **Egg ID**: ? 
- **Egg Name**: (e.g., "Rust")

### Palworld Egg
- Go to: Admin → Nests → Palworld → View eggs  
- **Egg ID**: ?
- **Egg Name**: (e.g., "Palworld")

## 📋 Current Configuration Template

Once you provide the above, I'll update these files:
- `supabase/functions/servers-provision/index.ts` (egg IDs)
- Database `ptero_nodes` table (node details)
- Supabase secrets (API keys)

## 🚀 Next Steps

1. **Run the database migration** (database-setup.sql)
2. **Provide the Pterodactyl details above**
3. **I'll configure everything and test**
4. **Deploy to production server**

Ready when you are! 🎯
