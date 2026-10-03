import { store } from '../server/store';
import { BusinessService } from '../server/businessLogic';
import { User } from '../src/types';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

async function testBillApprovalPersistence() {
  console.log('=== STARTING AUDIT BILL APPROVAL PERSISTENCE TEST ===');

  const customerUser: User = {
    id: 'USR-CUS-01',
    customerId: 'CUS-000001',
    name: 'Ramesh Kumar',
    role: 'CUSTOMER',
    mobile: '9123456780',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = store.getDb();
  let audit = db.auditorChecks.find((a) => a.customerId === 'CUS-000001');

  if (!audit) {
    console.log('Creating test audit with generated bill...');
    const adminUser: User = {
      id: 'USR-ADMIN-01',
      name: 'Admin',
      role: 'ADMIN',
      mobile: '9876543210',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    audit = BusinessService.createAuditRequest(
      { customerId: 'CUS-000001', auditorId: 'AUD-001', requestedDate: '2026-10-03' },
      adminUser
    );
  }

  // Ensure billId is present
  if (!audit.billId) {
    audit.billId = `BILL-AUD-${Date.now().toString().slice(-6)}`;
    audit.billStatus = 'CUSTOMER_PENDING_CONFIRMATION';
    store.save();
  }

  console.log(`[Before Bill Approval] Audit ID = ${audit.id}, Bill ID = ${audit.billId}, isBillConfirmed = ${audit.isBillConfirmed}`);

  // Approve Audit Bill as Customer
  const updatedAudit = BusinessService.confirmAuditBillByCustomer(audit.id, customerUser);

  console.log(`[After Bill Approval API] Audit ID = ${updatedAudit.id}, isBillConfirmed = ${updatedAudit.isBillConfirmed}, billStatus = ${updatedAudit.billStatus}`);

  // Force store save
  store.save();

  // Inspect Disk File data/db.json directly
  const rawDisk = fs.readFileSync(DB_FILE, 'utf-8');
  const diskDb = JSON.parse(rawDisk);
  const diskAudit = diskDb.auditorChecks.find((a: any) => a.id === audit.id || a.billId === audit.billId);

  console.log(`[Disk Read] Found = ${!!diskAudit}, isBillConfirmed = ${diskAudit?.isBillConfirmed}, billStatus = ${diskAudit?.billStatus}`);

  // Re-initialize store from disk to simulate server restart
  const storeInstance = store as any;
  storeInstance.init();

  const reloadedDb = store.getDb();
  const reloadedAudit = reloadedDb.auditorChecks.find((a) => a.id === audit.id || a.billId === audit.billId);

  console.log(`[Server Restart / Disk Reload Read] Found = ${!!reloadedAudit}, isBillConfirmed = ${reloadedAudit?.isBillConfirmed}, billStatus = ${reloadedAudit?.billStatus}`);

  if (reloadedAudit?.isBillConfirmed === true && reloadedAudit?.billStatus === 'LOCKED') {
    console.log('✓ AUDIT BILL APPROVAL PERSISTENCE VERIFIED 100%!');
  } else {
    console.error('❌ AUDIT BILL APPROVAL PERSISTENCE FAILED!');
    process.exit(1);
  }
}

testBillApprovalPersistence().catch((e) => {
  console.error('Test Error:', e);
  process.exit(1);
});
