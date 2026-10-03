import { store } from '../server/store';
import { BusinessService } from '../server/businessLogic';
import { User } from '../src/types';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

async function testRealFiveIds() {
  console.log('====================================================');
  console.log('=== REAL 5 IDs END-TO-END PERSISTENCE TEST MATRIX ===');
  console.log('====================================================\n');

  const testCustomerUser: User = {
    id: 'USR-CUS-01',
    customerId: 'CUS-000001',
    name: 'Ramesh Kumar',
    role: 'CUSTOMER',
    mobile: '9123456780',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const realIds = ['AUD-000001', 'AUD-000003', 'AUD-000004', 'AUD-MUR0AVZK', 'AUD-MUS42M8N'];
  const summaryResults: Record<string, any> = {};

  for (const auditId of realIds) {
    console.log(`----------------------------------------------------`);
    console.log(`TESTING EXACT REAL ID: [${auditId}]`);
    console.log(`----------------------------------------------------`);

    // 1. Read Before State
    const dbBefore = store.getDb();
    const beforeRecord = dbBefore.auditorChecks.find(
      (a) => a.id === auditId || a.auditRequestId === auditId || a.billId === auditId || a.auditorId === auditId
    );

    const beforeStatus = beforeRecord?.status || 'PENDING/NOT_FOUND';
    const beforeGranted = beforeRecord?.isPermissionGranted ?? false;

    console.log(`[BEFORE APPROVAL]`);
    console.log(`  ID: ${auditId}`);
    console.log(`  Status in Store: ${beforeStatus}`);
    console.log(`  isPermissionGranted: ${beforeGranted}`);

    // 2. Execute Approval (Simulate API request -> BusinessService)
    const apiResult = BusinessService.confirmAuditRequestByCustomer(auditId, testCustomerUser);

    console.log(`[AFTER API APPROVAL RESPONSE]`);
    console.log(`  ID: ${apiResult.id}`);
    console.log(`  Status: ${apiResult.status}`);
    console.log(`  isPermissionGranted: ${apiResult.isPermissionGranted}`);
    console.log(`  customerConfirmedAt: ${apiResult.customerConfirmedAt}`);

    // 3. Inspect Disk File data/db.json directly
    const rawDisk = fs.readFileSync(DB_FILE, 'utf-8');
    const diskDb = JSON.parse(rawDisk);
    const diskRecord = diskDb.auditorChecks.find(
      (a: any) => a.id === auditId || a.auditRequestId === auditId || a.billId === auditId || a.auditorId === auditId
    );

    console.log(`[AFTER DISK SAVE]`);
    console.log(`  Found on Disk: ${!!diskRecord}`);
    console.log(`  Disk Status: ${diskRecord?.status}`);
    console.log(`  Disk isPermissionGranted: ${diskRecord?.isPermissionGranted}`);

    // 4. Simulate Server Restart / Destroy & Reload Store Instance
    const storeInstance = store as any;
    storeInstance.init(); // Reloads directly from data/db.json

    const reloadedDb = store.getDb();
    const reloadedRecord = reloadedDb.auditorChecks.find(
      (a) => a.id === auditId || a.auditRequestId === auditId || a.billId === auditId || a.auditorId === auditId
    );

    console.log(`[AFTER SERVER RESTART & DISK RELOAD]`);
    console.log(`  Reloaded Status: ${reloadedRecord?.status}`);
    console.log(`  Reloaded isPermissionGranted: ${reloadedRecord?.isPermissionGranted}`);

    const isPassed =
      apiResult.status === 'CUSTOMER_CONFIRMED' &&
      apiResult.isPermissionGranted === true &&
      diskRecord?.status === 'CUSTOMER_CONFIRMED' &&
      diskRecord?.isPermissionGranted === true &&
      reloadedRecord?.status === 'CUSTOMER_CONFIRMED' &&
      reloadedRecord?.isPermissionGranted === true;

    summaryResults[auditId] = {
      before: `status: ${beforeStatus}, granted: ${beforeGranted}`,
      afterApi: `status: ${apiResult.status}, granted: ${apiResult.isPermissionGranted}`,
      afterDisk: `status: ${diskRecord?.status}, granted: ${diskRecord?.isPermissionGranted}`,
      afterReload: `status: ${reloadedRecord?.status}, granted: ${reloadedRecord?.isPermissionGranted}`,
      uiDisplay: isPassed ? '✓ Audit Permission Granted' : 'Permission Pending ⚠️',
      result: isPassed ? 'PASS' : 'FAIL',
    };

    console.log(`>>> RESULT FOR ${auditId}: ${isPassed ? 'PASS ✓' : 'FAIL ❌'}\n`);
  }

  console.log('====================================================');
  console.log('=== FINAL RESULTS MATRIX FOR ALL 5 REAL IDs ===');
  console.log('====================================================');

  for (const [id, res] of Object.entries(summaryResults)) {
    console.log(`\nAudit ID: ${id}`);
    console.log(`  Before: ${res.before}`);
    console.log(`  After API: ${res.afterApi}`);
    console.log(`  After db.json: ${res.afterDisk}`);
    console.log(`  After Server Restart: ${res.afterReload}`);
    console.log(`  UI State: ${res.uiDisplay}`);
    console.log(`  FINAL RESULT: ${res.result}`);
  }
}

testRealFiveIds().catch((e) => {
  console.error('Test Execution Error:', e);
  process.exit(1);
});
