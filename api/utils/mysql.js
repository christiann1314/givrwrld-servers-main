// MySQL Utility Functions
import pool from '../config/database.js';
import crypto from 'crypto';

/**
 * Get decrypted secret from MySQL
 * Secrets are encrypted using MySQL's AES_ENCRYPT function
 */
export async function getDecryptedSecret(scope, keyName, aesKey) {
  try {
    if (!aesKey) {
      return null;
    }
    // Use MySQL's AES_DECRYPT function directly
    const [rows] = await pool.execute(
      `SELECT AES_DECRYPT(value_enc, ?) as decrypted_value 
       FROM secrets 
       WHERE scope = ? AND key_name = ?`,
      [aesKey, scope, keyName]
    );

    if (!rows || rows.length === 0 || !rows[0].decrypted_value) {
      return null;
    }

    // Convert Buffer to string
    const decrypted = rows[0].decrypted_value.toString('utf8');
    return decrypted;
  } catch (error) {
    console.error(`Error decrypting secret ${scope}:${keyName}:`, error);
    return null;
  }
}

/**
 * Get plan by ID
 */
export async function getPlan(planId) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM plans WHERE id = ? AND is_active = 1`,
      [planId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(`Error fetching plan ${planId}:`, error);
    return null;
  }
}

/**
 * Create order in MySQL
 */
export async function createOrder(orderData) {
  try {
    const {
      id,
      user_id,
      item_type,
      plan_id,
      term,
      region,
      server_name,
      status,
      stripe_sub_id,
      stripe_customer_id
    } = orderData;

    await pool.execute(
      `INSERT INTO orders (
        id, user_id, item_type, plan_id, term, region, server_name,
        status, stripe_sub_id, stripe_customer_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, user_id, item_type, plan_id, term, region, server_name, status, stripe_sub_id, stripe_customer_id]
    );

    return { success: true, orderId: id };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId, status, pteroServerId = null, pteroIdentifier = null, errorMessage = null) {
  try {
    await pool.execute(
      `UPDATE orders 
       SET status = ?, 
           ptero_server_id = COALESCE(?, ptero_server_id),
           ptero_identifier = COALESCE(?, ptero_identifier),
           error_message = COALESCE(?, error_message),
           updated_at = NOW()
       WHERE id = ?`,
      [status, pteroServerId, pteroIdentifier, errorMessage, orderId]
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
}

/**
 * Get user orders
 */
export async function getUserOrders(userId) {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        o.*,
        p.game,
        p.ram_gb,
        p.vcores,
        p.ssd_gb,
        p.display_name as plan_name,
        p.price_monthly,
        COALESCE(o.total_amount, p.price_monthly, 0) AS billed_amount
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw error;
  }
}

/**
 * Get user servers (game orders)
 */
export async function getUserServers(userId) {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        o.*,
        p.game,
        p.ram_gb,
        p.vcores,
        p.ssd_gb,
        p.display_name as plan_name
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.user_id = ?
         AND o.item_type = 'game'
         AND o.status IN ('paid', 'provisioning', 'provisioned', 'active')
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error fetching user servers:', error);
    throw error;
  }
}

/**
 * Get all active plans
 */
export async function getAllPlans() {
  try {
    const [rows] = await pool.execute(
      `SELECT
         p.*,
         e.name AS ptero_egg_name,
         e.ptero_nest_id
       FROM plans p
       LEFT JOIN ptero_eggs e ON e.ptero_egg_id = p.ptero_egg_id
       WHERE p.is_active = 1
       ORDER BY p.game, p.ram_gb`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching plans:', error);
    throw error;
  }
}

/**
 * Get node for region
 */
export async function getNodeForRegion(regionCode) {
  try {
    const [rows] = await pool.execute(
      `SELECT n.* 
       FROM ptero_nodes n
       INNER JOIN region_node_map rnm ON n.ptero_node_id = rnm.ptero_node_id
       WHERE rnm.region_code = ?
       ORDER BY rnm.weight DESC, n.ptero_node_id ASC
       LIMIT 1`,
      [regionCode]
    );
    return rows[0] || null;
  } catch (error) {
    console.error(`Error fetching node for region ${regionCode}:`, error);
    return null;
  }
}

/**
 * Get Pterodactyl user ID for a user (create if doesn't exist)
 */
export async function getOrCreatePterodactylUser(userId, userEmail, displayName, panelUrl, panelAppKey) {
  try {
    // First, check if user already has a Pterodactyl account linked
    const [existing] = await pool.execute(
      `SELECT pterodactyl_user_id FROM users WHERE id = ? AND pterodactyl_user_id IS NOT NULL`,
      [userId]
    );

    if (existing && existing.length > 0 && existing[0].pterodactyl_user_id) {
      return existing[0].pterodactyl_user_id;
    }

    // Pterodactyl username rules: alphanumeric + ._- and must start/end alphanumeric.
    const baseUsername = (displayName || userEmail.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9._-]/g, '');
    const trimmed = baseUsername.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    const username = (trimmed || `user${String(userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`).slice(0, 32);

    // Create new Pterodactyl user
    const pteroUserResponse = await fetch(`${panelUrl}/api/application/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${panelAppKey}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json',
      },
      body: JSON.stringify({
        email: userEmail,
        username,
        first_name: displayName?.split(' ')[0] || 'User',
        last_name: displayName?.split(' ').slice(1).join(' ') || '',
        root_admin: false,
        language: 'en',
      }),
    });

    if (!pteroUserResponse.ok) {
      const errorText = await pteroUserResponse.text();
      // If user already exists, try to find them
      if (pteroUserResponse.status === 422) {
        const searchResponse = await fetch(`${panelUrl}/api/application/users?filter[email]=${encodeURIComponent(userEmail)}`, {
          headers: {
            'Authorization': `Bearer ${panelAppKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json',
          },
        });
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            const pteroUserId = searchData.data[0].attributes.id;
            // Update MySQL with Pterodactyl user ID
            await pool.execute(
              `UPDATE users SET pterodactyl_user_id = ? WHERE id = ?`,
              [pteroUserId, userId]
            );
            return pteroUserId;
          }
        }
      }
      throw new Error(`Failed to create Pterodactyl user: ${errorText}`);
    }

    const pteroUserData = await pteroUserResponse.json();
    const pteroUserId = pteroUserData.attributes.id;

    // Update MySQL with Pterodactyl user ID
    await pool.execute(
      `UPDATE users SET pterodactyl_user_id = ? WHERE id = ?`,
      [pteroUserId, userId]
    );

    return pteroUserId;
  } catch (error) {
    console.error('Error getting/creating Pterodactyl user:', error);
    throw error;
  }
}

/**
 * Get available allocation for a node
 */
export async function getAvailableAllocation(nodeId, panelUrl, panelAppKey) {
  try {
    // Prefer dedicated allocations endpoint (more reliable than relationship embedding).
    const allocationsResponse = await fetch(`${panelUrl}/api/application/nodes/${nodeId}/allocations?per_page=100`, {
      headers: {
        'Authorization': `Bearer ${panelAppKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
      },
    });

    if (allocationsResponse.ok) {
      const allocationsData = await allocationsResponse.json();
      const allocations = allocationsData?.data || [];

      for (const allocation of allocations) {
        if (!allocation?.attributes?.assigned) {
          return allocation;
        }
      }

      if (allocations.length > 0) {
        return allocations[0];
      }
    }

    // Fallback: attempt node relationship payload if allocations endpoint is unavailable.
    const nodeResponse = await fetch(`${panelUrl}/api/application/nodes/${nodeId}?include=allocations`, {
      headers: {
        'Authorization': `Bearer ${panelAppKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
      },
    });
    if (!nodeResponse.ok) {
      throw new Error(`Failed to fetch allocations for node ${nodeId}`);
    }
    const nodeData = await nodeResponse.json();
    const allocations = nodeData.attributes.relationships?.allocations?.data || [];

    // Find an available allocation (not assigned to a server)
    for (const allocation of allocations) {
      if (!allocation.attributes.assigned) {
        return allocation;
      }
    }

    // If no free allocation, use the first one (Pterodactyl will handle it)
    if (allocations.length > 0) {
      return allocations[0];
    }

    throw new Error(`No allocations available for node ${nodeId}`);
  } catch (error) {
    console.error('Error getting available allocation:', error);
    throw error;
  }
}

export default pool;

