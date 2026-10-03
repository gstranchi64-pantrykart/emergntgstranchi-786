import { store } from '../server/store';
import { BusinessService } from '../server/businessLogic';
import { User } from '../src/types';

async function runPersistenceTest() {
  console.log('=== STARTING PERSISTENCE INTEGRITY TEST ===');

  // 1. Get acting customer user
  const db = store.getDb();
  const customer = db.customers.find((c) => c.id === 'CUS-000001') || db.customers[0];
  if (!customer) {
    throw new Error('Test customer not found!');
  }

  const customerUser: User = {
    id: customer.id,
    name: customer.fullName,
    role: 'CUSTOMER',
    mobile: customer.mobile,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const adminUser: User = {
    id: 'USR-ADMIN-01',
    name: 'System Admin',
    role: 'ADMIN',
    mobile: '9876543210',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 2. Create a fresh audit request
  const testAudit = BusinessService.createAuditRequest(
    {
      customerId: customer.id,
      auditorId: 'AUD-001',
      requestedDate: new Date().toISOString().split('T')[0],
      purpose: 'End-to-End Automated Persistence Test',
    },
    adminUser
  );

  console.log(`[Step 1] Created fresh audit request: ID = ${testAudit.id}, Status = ${testAudit.status}, Granted = ${testAudit.isPermissionGranted}`);

  if (testAudit.isPermissionGranted === true) {
    console.error('FAIL: Initial audit request should have isPermissionGranted = false/undefined!');
  }

  // 3. Confirm Audit Request by Customer
  const confirmedAudit = BusinessService.confirmAuditRequestByCustomer(testAudit.id, customerUser);
  console.log(`[Step 2] Customer approved audit: ID = ${confirmedAudit.id}, Status = ${confirmedAudit.status}, Granted = ${confirmedAudit.isPermissionGranted}`);

  // 4. Force store save
  store.save();

  // 5. Simulate Server Restart: Re-read database from disk
  // Force store to reload from disk file data/db.json
  const storeInstance = store as any;
  storeInstance.init();

  const reloadedDb = store.getDb();
  const reloadedAudit = reloadedDb.auditorChecks.find((a) => a.id === testAudit.id);

  console.log(`[Step 3] After Server Restart / Disk Reload:`);
  console.log(`  Audit ID: ${reloadedAudit?.id}`);
  console.log(`  Status: ${reloadedAudit?.status}`);
  console.log(`  isPermissionGranted: ${reloadedAudit?.isPermissionGranted}`);
  console.log(`  ConfirmedAt: ${reloadedAudit?.customerConfirmedAt}`);

  if (!reloadedAudit || reloadedAudit.status !== 'CUSTOMER_CONFIRMED' || reloadedAudit.isPermissionGranted !== true) {
    console.error('❌ PERSISTENCE TEST FAILED FOR AUDIT APPROVAL!');
    process.exit(1);
  } else {
    console.log('✓ AUDIT APPROVAL PERSISTENCE VERIFIED SUCCESSFULLY!');
  }

  // 6. Test Pantry Pay Persistence
  const activePantryItem = reloadedDb.pantryCardItems.find(
    (p) => p.customerId === customer.id && (p.quantity || 0) > 0 && p.status !== 'RETURNED'
  );

  if (!activePantryItem) {
    console.log('No active pantry item for customer, creating test pantry item...');
    reloadedDb.pantryCardItems.push({
      id: `PCI-TEST-${Date.now()}`,
      customerId: customer.id,
      customerName: customer.fullName,
      orderId: 'ORD-TEST-01',
      productId: 'PRD-001',
      productName: 'Test Horlicks Pack',
      brand: 'Horlicks',
      weightSize: '500g',
      barcode: '123456789',
      batchId: 'BATCH-001',
      batchNumber: 'BATCH-123',
      manufacturingDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date().toISOString().split('T')[0],
      image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2',
      quantity: 1,
      unitPrice: 200,
      totalValue: 200,
      deliveryDate: new Date().toISOString().split('T')[0],
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    store.save();
  }

  const targetItem = reloadedDb.pantryCardItems.find(
    (p) => p.customerId === customer.id && (p.quantity || 0) > 0 && p.status !== 'RETURNED'
  )!;

  const paymentRecord = BusinessService.createPantryPayment(
    {
      customerId: customer.id,
      productId: targetItem.productId,
      productName: targetItem.productName,
      barcode: targetItem.barcode || '',
      amount: targetItem.unitPrice || 200,
      paymentMethod: 'UPI',
      paymentType: 'PRODUCT_PAYMENT',
      isWalletRecharge: false,
    },
    customerUser
  );

  console.log(`[Step 4] Executed Pantry Pay: Payment ID = ${paymentRecord.id}, Status = ${paymentRecord.paymentStatus}`);

  // Force store save
  store.save();

  // 7. Simulate Server Restart again
  storeInstance.init();

  const reloadedDb2 = store.getDb();
  const reloadedPayment = reloadedDb2.pantryPayments.find((p) => p.id === paymentRecord.id);
  const consumedItems = reloadedDb2.pantryCardItems.filter(
    (p) => p.customerId === customer.id && p.status === 'CONSUMED_AND_PAID'
  );

  console.log(`[Step 5] After Server Restart / Disk Reload for Pantry Pay:`);
  console.log(`  Payment Record Found: ${!!reloadedPayment}`);
  console.log(`  Consumed Items Count in Used History: ${consumedItems.length}`);

  if (!reloadedPayment || consumedItems.length === 0) {
    console.error('❌ PERSISTENCE TEST FAILED FOR PANTRY PAY!');
    process.exit(1);
  } else {
    console.log('✓ PANTRY PAY & USED HISTORY PERSISTENCE VERIFIED SUCCESSFULLY!');
  }

  console.log('=== ALL PERSISTENCE TESTS PASSED 100% ===');
}

runPersistenceTest().catch((err) => {
  console.error('Test Execution Error:', err);
  process.exit(1);
});
