-- Run on VPS: APP_PASS=...; mysql -u app_rw -p"$APP_PASS" -h 127.0.0.1 app_core < recent-orders-audit.sql
SELECT o.id,
       o.status,
       p.game,
       o.server_name,
       o.ptero_identifier,
       o.ptero_server_id,
       LEFT(COALESCE(o.error_message, ''), 140) AS error_head,
       o.created_at,
       o.updated_at
FROM orders o
LEFT JOIN plans p ON p.id = o.plan_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 21 DAY)
ORDER BY o.created_at DESC
LIMIT 40;

SELECT status, COUNT(*) AS cnt
FROM orders
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 21 DAY)
GROUP BY status
ORDER BY cnt DESC;
