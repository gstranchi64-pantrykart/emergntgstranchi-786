import { store } from '../server/store';
import { BusinessService } from '../server/businessLogic';
import { User } from '../src/types';

async function testMissingItemInUsedHistory() {
  console.log('=== TESTING MISSING ITEM MOVEMENT TO USED HISTORY ===');

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

  const auditorUser: User = {
    id: 'USR-AUD-01',
    name: 'Suresh Field Auditor',
    role: 'AUDITOR',
    mobile: '9876500001',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = store.getDb();
  let activePci = db.pantryCardItems.find((p) => p.customerId === 'CUS-000001' && p.quantity > 0 && p.status !== 'CONSUMED_AND_PAID');

  if (!activePci) {
    console.log('Creating active test pantry item...');
    activePci = {
      id: `PCI-ACT-${Date.now()}`,
      customerId: 'CUS-000001',
      customerName: 'Ramesh Kumar',
      orderId: 'ORD-TEST-001',
      productId: 'PRD-001',
      productName: 'Horlicks Classic Malt 500g',
      brand: 'Horlicks',
      weightSize: '500g',
      barcode: '8901030382910',
      batchId: 'BATCH-001',
      batchNumber: 'ATT-801',
      manufacturingDate: '2026-08-01',
      expiryDate: '2027-08-01',
      image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2',
      quantity: 3,
      unitPrice: 285,
      totalValue: 855,
      deliveryDate: '2026-09-01',
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.pantryCardItems.unshift(activePci);
    store.save();
  }

  const targetPci = activePci!;

  const initialUsedCount = db.pantryCardItems.filter(
    (p) => p.customerId === 'CUS-000001' && ((p.quantity || 0) === 0 || p.status === 'CONSUMED_AND_PAID')
  ).length;

  console.log(`[Initial State] Customer Active Qty = ${targetPci.quantity}, Used History Count = ${initialUsedCount}`);

  // Auditor submits check with 1 Missing item
  const auditCheck = BusinessService.submitAuditorCheck(
    {
      auditorId: 'AUD-001',
      customerId: 'CUS-000001',
      itemsChecked: [
        {
          pantryCardItemId: targetPci.id,
          verificationStatus: 'NOT_AVAILABLE',
          actionTaken: 'WALLET_DEDUCTION',
          qtyAvailable: targetPci.quantity - 1,
          qtyMissing: 1,
          qtyDamaged: 0,
          qtyReturn: 0,
          qtyReplacement: 0,
          qtyPantryPay: 0,
          remarks: 'Missing 1 Pack during Physical Inspection',
        },
      ],
      overallRemarks: 'Pantry physical verification conducted with missing item flag',
    },
    auditorUser
  );

  console.log(`[Audit Submitted] Check ID = ${auditCheck.id}, Bill ID = ${auditCheck.billId}`);

  // Confirm audit bill
  BusinessService.confirmAuditBillByCustomer(auditCheck.id, customerUser);

  // Re-fetch pantry items from store
  const freshDb = store.getDb();
  const freshUsedItems = freshDb.pantryCardItems.filter(
    (p) => p.customerId === 'CUS-000001' && ((p.quantity || 0) === 0 || p.status === 'CONSUMED_AND_PAID')
  );

  console.log(`[After Bill Confirmation] Used History Items Count = ${freshUsedItems.length}`);
  const auditorMissingItem = freshUsedItems.find((p) => (p.lastAuditorRemarks || '').includes('Audited'));

  console.log(`[Auditor Missing Item in Used History] Found = ${!!auditorMissingItem}`);
  if (auditorMissingItem) {
    console.log(`  Item Name: ${auditorMissingItem.productName}`);
    console.log(`  Remarks: ${auditorMissingItem.lastAuditorRemarks}`);
    console.log(`  Status: ${auditorMissingItem.status}`);
  }

  if (freshUsedItems.length > initialUsedCount && auditorMissingItem) {
    console.log('✓ MISSING ITEM MOVED TO USED HISTORY VERIFIED 100%!');
  } else {
    console.error('❌ MISSING ITEM TEST FAILED!');
    process.exit(1);
  }
}

testMissingItemInUsedHistory().catch((e) => {
  console.error('Test Error:', e);
  process.exit(1);
});
