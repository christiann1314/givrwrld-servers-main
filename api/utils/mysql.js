// MySQL Utility Functions
import pool from '../config/database.js';
import { DASHBOARD_ACTIVE_GAME_STATUSES } from '../lib/gameOrderDashboardStatuses.js';
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
 * Update order status (optionally set provision attempt fields).
 */
export async function updateOrderStatus(orderId, status, pteroServerId = null, pteroIdentifier = null, errorMessage = null, opts = {}) {
  try {
    const { provisionAttemptCount, lastProvisionAttemptAt, lastProvisionError } = opts;
    const hasProvisionOpts = provisionAttemptCount !== undefined || lastProvisionAttemptAt !== undefined || lastProvisionError !== undefined;
    if (!hasProvisionOpts) {
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
    } else {
      const sets = [
        'status = ?',
        'ptero_server_id = COALESCE(?, ptero_server_id)',
        'ptero_identifier = COALESCE(?, ptero_identifier)',
        'error_message = COALESCE(?, error_message)',
        'updated_at = NOW()',
      ];
      const args = [status, pteroServerId, pteroIdentifier, errorMessage];
      if (provisionAttemptCount !== undefined) {
        sets.push('provision_attempt_count = ?');
        args.push(provisionAttemptCount);
      }
      if (lastProvisionAttemptAt !== undefined) {
        sets.push('last_provision_attempt_at = ?');
        args.push(lastProvisionAttemptAt);
      }
      if (lastProvisionError !== undefined) {
        sets.push('last_provision_error = ?');
        args.push(lastProvisionError);
      }
      args.push(orderId);
      await pool.execute(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, args);
    }
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
    const st = DASHBOARD_ACTIVE_GAME_STATUSES.map(() => '?').join(', ');
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
         AND o.status IN (${st})
       ORDER BY o.created_at DESC`,
      [userId, ...DASHBOARD_ACTIVE_GAME_STATUSES]
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
 * Get node for region.
 * When requiredRamGb/requiredDiskGb are provided, only returns a node with enough headroom
 * based on ptero_nodes max_* fields and ptero_node_capacity_ledger sums.
 *
 * When a connection is provided, all queries are executed on that connection (for transactions).
 */
export async function getNodeForRegion(regionCode, requiredRamGb = null, requiredDiskGb = null, connection = null) {
  const db = connection || pool;
  try {
    const needsCapacityCheck =
      requiredRamGb !== null &&
      requiredRamGb !== undefined &&
      requiredDiskGb !== null &&
      requiredDiskGb !== undefined;

    if (!needsCapacityCheck) {
      const [rows] = await db.execute(
        `SELECT n.* 
         FROM ptero_nodes n
         INNER JOIN region_node_map rnm ON n.ptero_node_id = rnm.ptero_node_id
         WHERE rnm.region_code = ? AND n.enabled = 1
         ORDER BY rnm.weight DESC, n.ptero_node_id ASC
         LIMIT 1`,
        [regionCode],
      );
      return rows[0] || null;
    }

    // Capacity-aware selection: lock candidate nodes and their ledger rows in a transaction context.
    const [nodes] = await db.execute(
      `SELECT n.*
       FROM ptero_nodes n
       INNER JOIN region_node_map rnm ON n.ptero_node_id = rnm.ptero_node_id
       WHERE rnm.region_code = ? AND n.enabled = 1
       ORDER BY rnm.weight DESC, n.ptero_node_id ASC
       FOR UPDATE`,
      [regionCode],
    );

    for (const node of nodes) {
      const [caps] = await db.execute(
        `SELECT 
           COALESCE(SUM(ram_gb), 0)  AS reserved_ram_gb,
           COALESCE(SUM(disk_gb), 0) AS reserved_disk_gb
         FROM ptero_node_capacity_ledger
         WHERE ptero_node_id = ?
         FOR UPDATE`,
        [node.ptero_node_id],
      );
      const reserved = caps?.[0] || {};
      const reservedRam = Number(reserved.reserved_ram_gb || 0);
      const reservedDisk = Number(reserved.reserved_disk_gb || 0);

      const maxRam = Number(node.max_ram_gb || 0);
      const headroom = Number(node.reserved_headroom || 0);
      const maxDisk = Number(node.max_disk_gb || 0);

      const remainingRam = maxRam - headroom - reservedRam;
      const remainingDisk = maxDisk - reservedDisk;

      if (remainingRam >= requiredRamGb && remainingDisk >= requiredDiskGb) {
        return node;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching node for region ${regionCode}:`, error);
    return null;
  }
}

/**
 * Release node capacity reservation for an order (if any).
 * Used when orders are canceled or permanently failed.
 */
export async function releaseNodeCapacityForOrder(orderId) {
  if (!orderId) return;
  try {
    await pool.execute(
      `DELETE FROM ptero_node_capacity_ledger
       WHERE order_id = ?`,
      [orderId],
    );
  } catch (error) {
    console.error(`Error releasing node capacity for order ${orderId}:`, error);
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

    async function createPteroUser(preferredUsername) {
      const resp = await fetch(`${panelUrl}/api/application/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${panelAppKey}`,
          'Content-Type': 'application/json',
          'Accept': 'Application/vnd.pterodactyl.v1+json',
        },
        body: JSON.stringify({
          email: userEmail,
          username: preferredUsername,
          first_name: displayName?.split(' ')[0] || 'User',
          last_name: displayName?.split(' ').slice(1).join(' ') || '',
          root_admin: false,
          language: 'en',
        }),
      });
      return resp;
    }

    // First attempt with base username
    let pteroUserResponse = await createPteroUser(username);

    if (!pteroUserResponse.ok) {
      const errorText = await pteroUserResponse.text();
      // If user already exists, try to find them by email
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
            await pool.execute(
              `UPDATE users SET pterodactyl_user_id = ? WHERE id = ?`,
              [pteroUserId, userId]
            );
            return pteroUserId;
          }
        }

        // Username collision (422 with no existing email match): retry once with a suffixed username.
        const suffix = String(userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6) || 'user';
        const altUsername = `${username}-${suffix}`.slice(0, 32);
        pteroUserResponse = await createPteroUser(altUsername);
        if (!pteroUserResponse.ok) {
          const retryText = await pteroUserResponse.text();
          throw new Error(`Failed to create Pterodactyl user after retry: ${retryText}`);
        }
      } else {
        throw new Error(`Failed to create Pterodactyl user: ${errorText}`);
      }
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
    // Walk all pages; the listing endpoint caps per_page (usually 100) and a
    // busy node can easily have more than that. Picking from page 1 only
    // risks handing back an assigned allocation if page 1 is fully used.
    const PER_PAGE = 100;
    const MAX_PAGES = 50;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const pageRes = await fetch(
        `${panelUrl}/api/application/nodes/${nodeId}/allocations?per_page=${PER_PAGE}&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${panelAppKey}`,
            'Accept': 'Application/vnd.pterodactyl.v1+json',
          },
        }
      );
      if (!pageRes.ok) break;
      const pageData = await pageRes.json();
      const allocations = pageData?.data || [];
      for (const allocation of allocations) {
        if (allocation?.attributes?.assigned === false) {
          return allocation;
        }
      }
      const pagination = pageData?.meta?.pagination || {};
      const totalPages = Number(pagination.total_pages ?? 1);
      const currentPage = Number(pagination.current_page ?? page);
      if (currentPage >= totalPages) break;
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

/**
 * Get active addons for a game server order.
 * Returns addon orders where:
 *   - parent_order_id matches the game server order
 *   - the addon has an active PayPal or Stripe subscription (not canceled)
 *   - OR the addon order is in a paid/provisioned status
 */
export async function getActiveAddonsForOrder(parentOrderId) {
  try {
    const [rows] = await pool.execute(
      `SELECT
        o.id, o.plan_id, o.status, o.created_at,
        p.display_name AS addon_name, p.description AS addon_description,
        p.price_monthly,
        ps.status AS paypal_status
       FROM orders o
       LEFT JOIN plans p ON p.id = o.plan_id
       LEFT JOIN paypal_subscriptions ps ON ps.order_id = o.id
       WHERE o.parent_order_id = ?
         AND o.item_type = 'vps'
         AND o.status NOT IN ('canceled', 'failed', 'error')
       ORDER BY o.created_at DESC`,
      [parentOrderId],
    );
    return rows;
  } catch (error) {
    console.error('Error fetching addons for order:', error);
    throw error;
  }
}

/**
 * Check if a specific addon plan is active for a given server order.
 */
export async function hasActiveAddon(parentOrderId, planId) {
  try {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM orders o
       LEFT JOIN paypal_subscriptions ps ON ps.order_id = o.id
       WHERE o.parent_order_id = ?
         AND o.plan_id = ?
         AND o.item_type = 'vps'
         AND o.status NOT IN ('canceled', 'failed', 'error')
       LIMIT 1`,
      [parentOrderId, planId],
    );
    return rows[0]?.cnt > 0;
  } catch (error) {
    console.error('Error checking addon:', error);
    return false;
  }
}

export default pool;

