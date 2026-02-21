 // MySQL Client for Supabase Edge Functions
 // Connects to MySQL database on VPS
 
 import { createPool, Pool } from "https://deno.land/x/mysql@v2.12.1/mod.ts";

 let connectionPool: Pool | null = null;
 
 export async function getMySQLPool(): Promise<Pool> {
   if (connectionPool) {
     return connectionPool;
   }
 
   connectionPool = await createPool({
     hostname: Deno.env.get('MYSQL_HOST') || '127.0.0.1',
     port: parseInt(Deno.env.get('MYSQL_PORT') || '3306'),
     username: Deno.env.get('MYSQL_USER') || 'app_rw',
     password: Deno.env.get('MYSQL_PASSWORD') || '',
     db: Deno.env.get('MYSQL_DATABASE') || 'app_core',
     poolSize: 10,
   });
 
   return connectionPool;
 }

 export async function decryptSecret(
   scope: string,
   keyName: string,
   aesKey: string
 ): Promise<string | null> {
   const pool = await getMySQLPool();
   const rows = await pool.query(
     `SELECT CAST(AES_DECRYPT(value_enc, ?) AS CHAR) AS value
      FROM secrets
      WHERE scope = ? AND key_name = ?`,
     [aesKey, scope, keyName]
   );
 
   if (rows && rows.length > 0) {
     return (rows[0] as any).value;
   }
   return null;
 }

 export async function getPlan(planId: string) {
   const pool = await getMySQLPool();
   const rows = await pool.query(
     `SELECT id, item_type, game, ram_gb, vcores, ssd_gb, price_monthly,
             ptero_egg_id, stripe_product_id, stripe_price_id, display_name
      FROM plans
      WHERE id = ? AND is_active = 1`,
     [planId]
   );
 
   return rows && rows.length > 0 ? rows[0] : null;
 }

 export async function createOrder(orderData: {
   id: string;
   user_id: string;
   item_type: 'game' | 'vps';
   plan_id: string;
   term: 'monthly' | 'quarterly' | 'yearly';
   region: string;
   server_name: string;
   status: 'pending' | 'paid' | 'provisioning' | 'provisioned' | 'error' | 'canceled';
   stripe_sub_id?: string;
   stripe_customer_id?: string;
 }) {
   const pool = await getMySQLPool();
   await pool.execute(
     `INSERT INTO orders (id, user_id, item_type, plan_id, term, region, server_name, status, stripe_sub_id, stripe_customer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
     [
       orderData.id,
       orderData.user_id,
       orderData.item_type,
       orderData.plan_id,
       orderData.term,
       orderData.region,
       orderData.server_name,
       orderData.status,
       orderData.stripe_sub_id || null,
       orderData.stripe_customer_id || null,
     ]
   );
 }

 export async function updateOrderStatus(
   orderId: string,
   status: string,
   pteroServerId?: number,
   pteroIdentifier?: string,
   errorMessage?: string
 ) {
   const pool = await getMySQLPool();
   await pool.execute(
     `UPDATE orders
      SET status = ?,
          ptero_server_id = ?,
          ptero_identifier = ?,
          error_message = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
     [
       status,
       pteroServerId || null,
       pteroIdentifier || null,
       errorMessage || null,
       orderId,
     ]
   );
 }

 export async function getNodeForRegion(regionCode: string) {
   const pool = await getMySQLPool();
   const rows = await pool.query(
     `SELECT n.ptero_node_id, n.name, n.max_ram_gb, n.max_disk_gb
      FROM region_node_map rnm
      JOIN ptero_nodes n ON n.ptero_node_id = rnm.ptero_node_id
      WHERE rnm.region_code = ?
      ORDER BY rnm.weight DESC
      LIMIT 1`,
     [regionCode]
   );
 
   return rows && rows.length > 0 ? rows[0] : null;
 }



