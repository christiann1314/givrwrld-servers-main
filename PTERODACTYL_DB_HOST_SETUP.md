# Pterodactyl Database Host Configuration

**For the "Create New Database Host" modal in Pterodactyl Panel**

---

## 📋 Configuration Values

Based on your MySQL setup, use these values in the Pterodactyl "Create New Database Host" modal:

### Required Fields:

1. **Name:** `mysql-localhost` (or any identifier you prefer)
   - Example: `us-local`, `mysql-primary`, `localhost-db`

2. **Host:** `127.0.0.1` or `localhost`
   - This is your MySQL server running on the same VPS

3. **Port:** `3306`
   - Standard MySQL port (already pre-filled)

4. **Username:** `provisioning_rw`
   - ⚠️ **IMPORTANT:** Use the `provisioning_rw` user, NOT `panel_rw`
   - The `provisioning_rw` user has `WITH GRANT OPTION` permission needed to create databases

5. **Password:** 
   - Check `PASSWORDS.txt` for the `provisioning_rw` password
   - Or run: `grep provisioning_rw PASSWORDS.txt`

6. **Linked Node:** 
   - Select the node(s) where you want databases created by default
   - Or leave as "None" if you'll specify per-server

---

## ⚠️ Critical Warning (from Pterodactyl)

> "The account defined for this database host must have the **WITH GRANT OPTION** permission. If the defined account does not have this permission requests to create databases will fail. Do not use the same account details for MySQL that you have defined for this panel."

### ✅ Solution

We've already created the `provisioning_rw` user with the correct permissions:

```sql
GRANT CREATE, DROP, CREATE USER, ALTER, SHOW DATABASES, GRANT OPTION ON *.* TO 'provisioning_rw'@'localhost';
```

This user has `GRANT OPTION` and can create databases for customer servers.

---

## 🔐 Password Location

The password for `provisioning_rw` is stored in:
- `PASSWORDS.txt` (in project root)
- Generated during MySQL setup

To view it:
```bash
grep provisioning_rw PASSWORDS.txt
```

---

## 📝 Step-by-Step

1. **Open Pterodactyl Panel** → Admin → Databases
2. **Click "Create New"**
3. **Fill in the form:**
   - Name: `mysql-localhost`
   - Host: `127.0.0.1`
   - Port: `3306`
   - Username: `provisioning_rw`
   - Password: (from PASSWORDS.txt)
   - Linked Node: (select your node or leave "None")
4. **Click "Create"**

---

## ✅ Verification

After creating the database host, test it:

1. Go to a server in Pterodactyl
2. Go to "Databases" tab
3. Click "Create Database"
4. It should successfully create a database using the new host

---

## 🔄 Alternative: Use Panel User (Not Recommended)

If you need to use `panel_rw` for some reason, you would need to grant it additional permissions:

```sql
GRANT CREATE, DROP, CREATE USER, GRANT OPTION ON *.* TO 'panel_rw'@'localhost';
FLUSH PRIVILEGES;
```

**However, this is NOT recommended** because:
- Mixes panel database access with provisioning permissions
- Violates least-privilege security principle
- The warning explicitly says not to use the same account

---

## 📚 Related Files

- `sql/grants.sql` - User definitions and permissions
- `PASSWORDS.txt` - All MySQL user passwords
- `MYSQL_MIGRATION_README.md` - Full migration guide



