# Pterodactyl Info Needed for Local Testing

## 🔑 Quick Info Needed (2 minutes to get)

### 1. Client API Key
- Go to: **Account → API Credentials → Create**
- Description: "GIVRwrld Stats"
- Copy the key (starts with `ptlc_`)

### 2. Node Information
- Go to: **Admin → Nodes**
- For each node, just need:
  - **Node ID** (number in URL when you click on a node)
  - **Node Name** (whatever you called it)
  - **Region** (east/west/eu - your choice)

### 3. Game Egg IDs
- Go to: **Admin → Nests**
- Click on each nest (Minecraft, Rust, Palworld)
- Click on the eggs inside
- Just need the **Egg ID** numbers

## 📋 Example Format:
```
Client API Key: ptlc_xxxxxxxxxx

Nodes:
- Node 1: ID=1, Name="US-East", Region="east"  
- Node 2: ID=2, Name="US-West", Region="west"

Eggs:
- Minecraft: Egg ID = 5
- Rust: Egg ID = 12  
- Palworld: Egg ID = 18
```

Once you provide these, I'll configure everything and we can test the complete flow locally!
