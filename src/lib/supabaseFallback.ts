import { supabase } from './supabaseClient';

export async function handleDirectSupabaseFetch<T>(
  url: string,
  method: string = 'GET',
  body?: any
): Promise<T | null> {
  const cleanUrl = url.split('?')[0];

  try {
    // 1. PRODUCTS API
    if (cleanUrl.endsWith('/api/products') || cleanUrl.includes('/api/products')) {
      if (method === 'GET') {
        const { data: relData, error: relErr } = await supabase.from('products').select('*');
        if (!relErr && relData && relData.length > 0) {
          const formatted = relData.map((p: any) => ({
            id: p.id,
            name: p.name,
            hindiName: p.hindi_name || p.hindiName || '',
            category: p.category,
            subcategory: p.subcategory || '',
            brand: p.brand || '',
            unit: p.unit || '1 kg',
            price: Number(p.price || 0),
            mrp: Number(p.mrp || p.price || 0),
            costPrice: Number(p.cost_price || p.costPrice || 0),
            isPantryEligible: !!p.is_pantry_eligible,
            minStockAlert: Number(p.min_stock_alert || 5),
            imageUrl: p.image_url || p.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600',
            description: p.description || '',
            barcode: p.barcode || '',
            status: p.status || 'ACTIVE',
            totalStock: Number(p.total_stock || p.totalStock || 0),
          }));
          return formatted as unknown as T;
        }

        // Fallback to store snapshot
        const { data: snapshotData } = await supabase
          .from('pantry_mart_store')
          .select('data')
          .eq('id', 'latest_state')
          .single();

        if (snapshotData?.data?.products) {
          return snapshotData.data.products as T;
        }
        return [] as unknown as T;
      }

      if (method === 'POST') {
        if (body) {
          const productToInsert = {
            id: body.id || `PROD-${Date.now().toString(36).toUpperCase()}`,
            name: body.name,
            hindi_name: body.hindiName || '',
            category: body.category,
            subcategory: body.subcategory || '',
            brand: body.brand || '',
            unit: body.unit || '1 kg',
            price: Number(body.price || 0),
            mrp: Number(body.mrp || body.price || 0),
            cost_price: Number(body.costPrice || 0),
            is_pantry_eligible: !!body.isPantryEligible,
            min_stock_alert: Number(body.minStockAlert || 5),
            image_url: body.imageUrl || '',
            description: body.description || '',
            barcode: body.barcode || '',
            status: body.status || 'ACTIVE',
            total_stock: Number(body.totalStock || 0),
          };

          await supabase.from('products').upsert([productToInsert], { onConflict: 'id' });
          return { success: true, product: body, message: 'Product added successfully to Supabase' } as unknown as T;
        }
      }

      if (method === 'DELETE') {
        const idMatch = cleanUrl.match(/\/api\/products\/([^/]+)/);
        if (idMatch && idMatch[1]) {
          const prodId = idMatch[1];
          await supabase.from('products').delete().eq('id', prodId);
          return { success: true, message: `Product ${prodId} deleted successfully from Supabase` } as unknown as T;
        }
      }
    }

    // 2. CATEGORIES API
    if (cleanUrl.includes('/api/categories')) {
      if (method === 'GET') {
        const { data } = await supabase.from('categories').select('*');
        if (data && data.length > 0) {
          return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            hindiName: c.hindi_name || c.hindiName || '',
            icon: c.icon || 'Package',
            image: c.image || '',
            subcategories: c.subcategories || [],
          })) as unknown as T;
        }

        const { data: snapshotData } = await supabase
          .from('pantry_mart_store')
          .select('data')
          .eq('id', 'latest_state')
          .single();

        if (snapshotData?.data?.categories) {
          return snapshotData.data.categories as T;
        }
        return [] as unknown as T;
      }
    }

    // 3. ORDERS API
    if (cleanUrl.includes('/api/orders')) {
      if (method === 'GET') {
        const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number || o.id,
            customerId: o.customer_id,
            customerName: o.customer_name || 'Customer',
            mobile: o.mobile || '',
            orderType: o.order_type || 'QUICK_COD',
            items: o.items || [],
            totalAmount: Number(o.total_amount || 0),
            paidAmount: Number(o.paid_amount || 0),
            pantryCreditUsed: Number(o.pantry_credit_used || 0),
            walletUsed: Number(o.wallet_used || 0),
            status: o.status || 'PENDING',
            paymentStatus: o.payment_status || 'PENDING',
            deliveryAddress: o.delivery_address || '',
            createdAt: o.created_at || new Date().toISOString(),
          })) as unknown as T;
        }

        const { data: snapshotData } = await supabase
          .from('pantry_mart_store')
          .select('data')
          .eq('id', 'latest_state')
          .single();

        if (snapshotData?.data?.orders) {
          return snapshotData.data.orders as T;
        }
        return [] as unknown as T;
      }

      if (method === 'POST' && body) {
        const orderId = body.id || `ORD-${Date.now().toString(36).toUpperCase()}`;
        const newOrder = {
          id: orderId,
          order_number: body.orderNumber || orderId,
          customer_id: body.customerId || 'CUS-GUEST',
          customer_name: body.customerName || 'Guest User',
          mobile: body.mobile || '',
          order_type: body.orderType || 'QUICK_COD',
          items: body.items || [],
          total_amount: Number(body.totalAmount || 0),
          status: 'PENDING',
          payment_status: body.paymentStatus || 'PENDING',
          delivery_address: body.deliveryAddress || '',
          created_at: new Date().toISOString(),
        };

        await supabase.from('orders').insert([newOrder]);
        return { success: true, order: { ...body, id: orderId }, message: 'Order created successfully in Supabase' } as unknown as T;
      }
    }

    // 4. SETTINGS API
    if (cleanUrl.includes('/api/settings')) {
      return {
        defaultPantryLimit: 10000,
        defaultWalletBalance: 1000,
        walletRechargeEnabled: true,
        auditWalletDeductionEnabled: true,
        allowNegativeWallet: false,
        pantryReturnWindowDays: 15,
        nearExpiryDays: 30,
        lowStockThreshold: 5,
        codEnabled: true,
        pantryOrderCodEnabled: false,
        autoAssignDelivery: false,
        activeThemeId: 'yellow-amber',
      } as unknown as T;
    }

    // 5. GENERIC GET FALLBACK FROM SNAPSHOT STORE
    if (method === 'GET') {
      const { data: snapshotData } = await supabase
        .from('pantry_mart_store')
        .select('data')
        .eq('id', 'latest_state')
        .single();

      if (snapshotData?.data) {
        const key = cleanUrl.replace('/api/', '').split('/')[0];
        if (snapshotData.data[key]) {
          return snapshotData.data[key] as T;
        }
      }
      return [] as unknown as T;
    }
  } catch (err: any) {
    console.warn('[Direct Supabase Fallback Error]', err.message);
  }

  return null;
}
