import { store } from '../server/store';
import { BusinessService } from '../server/businessLogic';
import { User, Product } from '../src/types';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

async function testLiveE2eAudit() {
  console.log('===============================================================');
  console.log('=== FULL END-TO-END SUPABASE / LIVE BACKEND AUDIT TEST MATRIX ===');
  console.log('===============================================================\n');

  const adminUser: User = {
    id: 'USR-ADMIN-01',
    name: 'System Administrator',
    role: 'ADMIN',
    mobile: '9876543210',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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

  // ---------------- 1. PRODUCT ADD & READ-BACK ----------------
  console.log('--- 1. TESTING PRODUCT ADD & DATABASE READ-BACK ---');
  const testBarcode = `890${Date.now().toString().slice(-10)}`;
  const newProductData: Partial<Product> = {
    name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch (Live Test)',
    brand: 'Fortune',
    category: 'Oils & Ghee',
    subCategory: 'Cooking Oils',
    unit: '1 L',
    weightSize: '1L Pouch',
    description: 'Light and healthy sunflower oil for daily cooking',
    barcode: testBarcode,
    mrp: 175,
    sellingPrice: 152,
    costPrice: 130,
    status: 'PUBLISHED',
  };

  const createdProduct = BusinessService.createProduct(newProductData, adminUser);
  console.log(`[Product Created] ID = ${createdProduct.id}, Name = ${createdProduct.name}, Barcode = ${createdProduct.barcode}`);

  // Create initial batch for product stock
  BusinessService.purchaseStock(
    {
      productId: createdProduct.id,
      productName: createdProduct.name,
      batchNumber: 'OIL-BATCH-01',
      barcode: testBarcode,
      quantity: 50,
      purchaseRate: 130,
      sellingPrice: 152,
      mrp: 175,
      manufacturingDate: '2026-09-01',
      expiryDate: '2027-09-01',
      shopkeeperName: 'Fortune Agro Suppliers',
      shopkeeperContact: '9876543210',
      invoiceReference: `INV-${Date.now()}`,
    },
    adminUser
  );

  // Force store save & sync
  store.save();

  // Reload store to simulate server restart / fresh page fetch
  const storeInstance = store as any;
  storeInstance.init();

  const reloadedDb1 = store.getDb();
  const fetchedProduct = reloadedDb1.products.find((p) => p.id === createdProduct.id || p.barcode === testBarcode);

  const isProductAddPassed = !!fetchedProduct && fetchedProduct.name === createdProduct.name;
  console.log(`[Product Read-Back Test] ${isProductAddPassed ? 'PASS ✓' : 'FAIL ❌'}\n`);

  // ---------------- 2. ORDER CREATION & READ-BACK ----------------
  console.log('--- 2. TESTING ORDER CREATION & DATABASE READ-BACK ---');
  const orderPayload = {
    customerId: 'CUS-000001',
    customerName: 'Ramesh Kumar',
    customerMobile: '9123456780',
    deliveryAddress: 'House #42, Green Park Main, Block B, New Delhi',
    orderType: 'PANTRY' as const,
    items: [
      {
        productId: createdProduct.id,
        productName: createdProduct.name,
        brand: createdProduct.brand,
        quantity: 2,
        price: createdProduct.sellingPrice,
        unit: createdProduct.unit,
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5',
      },
    ],
    subtotal: createdProduct.sellingPrice * 2,
    deliveryFee: 0,
    totalAmount: createdProduct.sellingPrice * 2,
    pantryDebitAmount: createdProduct.sellingPrice * 2,
    codAmount: 0,
    paymentMethod: 'PANTRY_LIMIT',
    paymentStatus: 'PAID' as const,
  };

  const createdOrder = BusinessService.createPantryOrder(orderPayload, customerUser);
  console.log(`[Order Created] Order ID = ${createdOrder.id}, Amount = ₹${createdOrder.totalAmount}, Status = ${createdOrder.orderStatus}`);

  store.save();
  storeInstance.init();

  const reloadedDb2 = store.getDb();
  const fetchedOrder = reloadedDb2.orders.find((o) => o.id === createdOrder.id);
  const isOrderPassed = !!fetchedOrder && fetchedOrder.totalAmount === createdOrder.totalAmount;
  console.log(`[Order Read-Back Test] ${isOrderPassed ? 'PASS ✓' : 'FAIL ❌'}\n`);

  // ---------------- 3. REAL AUDIT IDs PERMISSION APPROVAL ----------------
  console.log('--- 3. TESTING REAL 5 AUDIT IDs APPROVAL ---');
  const realAuditIds = ['AUD-000001', 'AUD-000003', 'AUD-000004', 'AUD-MUR0AVZK', 'AUD-MUS42M8N'];
  let allAuditsPassed = true;

  for (const auditId of realAuditIds) {
    const approvedAudit = BusinessService.confirmAuditRequestByCustomer(auditId, customerUser);
    store.save();
    storeInstance.init();

    const reloadedDb3 = store.getDb();
    const verifiedAudit = reloadedDb3.auditorChecks.find(
      (a) => a.id === auditId || a.auditRequestId === auditId || a.billId === auditId || a.auditorId === auditId
    );

    const isAuditPassed =
      approvedAudit.status === 'CUSTOMER_CONFIRMED' &&
      approvedAudit.isPermissionGranted === true &&
      verifiedAudit?.status === 'CUSTOMER_CONFIRMED' &&
      verifiedAudit?.isPermissionGranted === true;

    if (!isAuditPassed) allAuditsPassed = false;
    console.log(`  Audit ${auditId}: Status = ${verifiedAudit?.status}, Granted = ${verifiedAudit?.isPermissionGranted} -> ${isAuditPassed ? 'PASS ✓' : 'FAIL ❌'}`);
  }
  console.log(`[Real 5 Audit IDs Test] ${allAuditsPassed ? 'PASS ✓' : 'FAIL ❌'}\n`);

  // ---------------- 4. PANTRY PAY & USED HISTORY ----------------
  console.log('--- 4. TESTING PANTRY PAY & USED HISTORY MOVEMENT ---');
  let pantryItem = reloadedDb2.pantryCardItems.find((p) => p.customerId === 'CUS-000001' && p.quantity > 0);
  if (!pantryItem) {
    pantryItem = {
      id: `PCI-TEST-${Date.now()}`,
      customerId: 'CUS-000001',
      customerName: 'Ramesh Kumar',
      orderId: createdOrder.id,
      productId: createdProduct.id,
      productName: createdProduct.name,
      brand: createdProduct.brand,
      weightSize: createdProduct.weightSize || '1L Pouch',
      barcode: testBarcode,
      batchId: 'BCH-OIL-01',
      batchNumber: 'OIL-502',
      manufacturingDate: '2026-08-24',
      expiryDate: '2027-04-21',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5',
      quantity: 2,
      unitPrice: 152,
      totalValue: 304,
      deliveryDate: '2026-09-24',
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reloadedDb2.pantryCardItems.unshift(pantryItem);
    store.save();
  }

  const payUnitPrice = Number(pantryItem.unitPrice || (pantryItem as any).price || createdProduct.sellingPrice || 152);
  const paymentResult = BusinessService.createPantryPayment(
    {
      customerId: 'CUS-000001',
      productId: pantryItem.productId,
      productName: pantryItem.productName,
      barcode: testBarcode,
      amount: payUnitPrice,
      paymentMethod: 'UPI',
    },
    customerUser
  );

  console.log(`[Pantry Pay Created] Payment ID = ${paymentResult.id}, Amount = ₹${paymentResult.amount}`);

  store.save();
  storeInstance.init();

  const reloadedDb4 = store.getDb();
  const usedPantryItem = reloadedDb4.pantryCardItems.find(
    (p) => p.customerId === 'CUS-000001' && (p.quantity === 0 || p.status === 'CONSUMED_AND_PAID')
  );

  const isPantryPayPassed = !!usedPantryItem && (usedPantryItem.status === 'CONSUMED_AND_PAID' || usedPantryItem.quantity === 0);
  console.log(`[Pantry Pay & Used History Test] ${isPantryPayPassed ? 'PASS ✓' : 'FAIL ❌'}\n`);

  // ---------------- FINAL AUDIT SUMMARY ----------------
  console.log('===============================================================');
  console.log('=== FINAL AUDIT SUMMARY RESULT MATRIX ===');
  console.log('===============================================================');
  console.log(`1. Product Add & Read-Back: ${isProductAddPassed ? 'PASS ✓' : 'FAIL ❌'}`);
  console.log(`2. Order Creation & Read-Back: ${isOrderPassed ? 'PASS ✓' : 'FAIL ❌'}`);
  console.log(`3. Real 5 Audit Permission Approval: ${allAuditsPassed ? 'PASS ✓' : 'FAIL ❌'}`);
  console.log(`4. Pantry Pay & Used History: ${isPantryPayPassed ? 'PASS ✓' : 'FAIL ❌'}`);

  const allPassed = isProductAddPassed && isOrderPassed && allAuditsPassed && isPantryPayPassed;
  console.log(`\nOVERALL END-TO-END AUDIT RESULT: ${allPassed ? 'ALL TESTS PASSED 100% ✓' : 'SOME TESTS FAILED ❌'}`);
}

testLiveE2eAudit().catch((e) => {
  console.error('Audit Exec Error:', e);
  process.exit(1);
});
