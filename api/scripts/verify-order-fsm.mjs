#!/usr/bin/env node

/**
 * Lightweight verification script for the Order FSM.
 * Prints which status transitions are allowed or rejected by OrderService.
 *
 * Run from api/:
 *   node scripts/verify-order-fsm.mjs
 */

import { ORDER_STATUS, isAllowedStatusTransition } from '../services/OrderService.js';

const cases = [
  // Happy path
  [ORDER_STATUS.PENDING, ORDER_STATUS.PAID],
  [ORDER_STATUS.PAID, ORDER_STATUS.PROVISIONING],
  [ORDER_STATUS.PROVISIONING, ORDER_STATUS.PROVISIONED],

  // Recoverable failure paths
  [ORDER_STATUS.PROVISIONING, ORDER_STATUS.FAILED],
  [ORDER_STATUS.ERROR, ORDER_STATUS.PROVISIONING],
  [ORDER_STATUS.FAILED, ORDER_STATUS.PROVISIONING],

  // Cancellations
  [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.PAID, ORDER_STATUS.CANCELED],

  // Illegal transitions that should be rejected
  [ORDER_STATUS.PAID, ORDER_STATUS.PENDING],
  [ORDER_STATUS.PROVISIONED, ORDER_STATUS.PENDING],
  [ORDER_STATUS.CANCELED, ORDER_STATUS.PAID],
  [ORDER_STATUS.PROVISIONED, ORDER_STATUS.PROVISIONING],
];

function main() {
  console.log('Order FSM transition matrix:\n');
  for (const [from, to] of cases) {
    const ok = isAllowedStatusTransition(from, to);
    const label = ok ? 'ALLOWED ' : 'REJECTED';
    console.log(`${label}  ${from} -> ${to}`);
  }
  console.log('\nDone.');
}

main();

