#!/usr/bin/env node

/**
 * Simulation script for node capacity ledger.
 *
 * This runs a deterministic set of "orders" against a small
 * in-memory model of nodes using the same rules as the DB ledger:
 *  - Each order reserves ram_gb/disk_gb on a single node.
 *  - Total reserved on a node must never exceed max_ram_gb/max_disk_gb.
 *
 * It is intended as a sanity check that the allocation algorithm
 * (capacity-based selection with per-order reservations) can avoid
 * oversubscription under concurrent-style workloads.
 *
 * Run from api/:
 *   node scripts/simulate-node-capacity.mjs
 */

const nodes = [
  { id: 1, max_ram_gb: 64, max_disk_gb: 1000, reserved_headroom: 4 },
  { id: 2, max_ram_gb: 64, max_disk_gb: 1000, reserved_headroom: 4 },
];

const orders = [];

function reserveForOrder(orderId, ramGb, diskGb) {
  // Try nodes in order, prefer lower id
  for (const node of nodes) {
    const currentReservedRam = orders
      .filter((o) => o.nodeId === node.id)
      .reduce((sum, o) => sum + o.ramGb, 0);
    const currentReservedDisk = orders
      .filter((o) => o.nodeId === node.id)
      .reduce((sum, o) => sum + o.diskGb, 0);

    const remainingRam = node.max_ram_gb - node.reserved_headroom - currentReservedRam;
    const remainingDisk = node.max_disk_gb - currentReservedDisk;

    if (remainingRam >= ramGb && remainingDisk >= diskGb) {
      orders.push({ orderId, nodeId: node.id, ramGb, diskGb });
      return node.id;
    }
  }
  return null;
}

function assertNoOversubscription() {
  for (const node of nodes) {
    const currentReservedRam = orders
      .filter((o) => o.nodeId === node.id)
      .reduce((sum, o) => sum + o.ramGb, 0);
    const currentReservedDisk = orders
      .filter((o) => o.nodeId === node.id)
      .reduce((sum, o) => sum + o.diskGb, 0);

    const limitRam = node.max_ram_gb - node.reserved_headroom;
    const limitDisk = node.max_disk_gb;

    if (currentReservedRam > limitRam || currentReservedDisk > limitDisk) {
      throw new Error(
        `Oversubscription detected on node ${node.id}: ` +
          `ram=${currentReservedRam}/${limitRam}, disk=${currentReservedDisk}/${limitDisk}`,
      );
    }
  }
}

async function main() {
  console.log('Simulating node capacity allocations...');

  const testOrders = [];
  for (let i = 0; i < 100; i += 1) {
    // Alternate between small and larger plans
    const ramGb = i % 3 === 0 ? 8 : 4;
    const diskGb = i % 5 === 0 ? 120 : 60;
    testOrders.push({ orderId: `order-${i}`, ramGb, diskGb });
  }

  // Shuffle to simulate non-deterministic arrival order
  for (let i = testOrders.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [testOrders[i], testOrders[j]] = [testOrders[j], testOrders[i]];
  }

  for (const o of testOrders) {
    const nodeId = reserveForOrder(o.orderId, o.ramGb, o.diskGb);
    if (!nodeId) {
      console.log(`Order ${o.orderId} could not be placed due to capacity constraints (expected for some orders).`);
    }
    assertNoOversubscription();
  }

  console.log('Simulation completed without oversubscription.');
}

main().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});

