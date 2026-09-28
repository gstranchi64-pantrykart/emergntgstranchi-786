import { supabase } from './supabaseClient';
import { Product } from '../types';

export async function handleDirectSupabaseFetch<T>(
  url: string,
  method: string = 'GET',
  body?: any
): Promise<T | null> {
  const cleanUrl = url.split('?')[0];

  try {
    // ---------------- 1. PRODUCTS API ----------------
    if (cleanUrl.endsWith('/api/products') || cleanUrl.includes('/api/products')) {
      // GET PRODUCTS
      if (method === 'GET') {
        const { data: relData, error: relErr } = await supabase.from('products').select('*');
        if (!relErr && relData && relData.length > 0) {
          const formattedProducts: Product[] = relData.map((p: any) => {
            let imgs: [string, string, string, string] = [
              'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1607349913338-fca6f742960f?w=600&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
            ];

            if (Array.isArray(p.images) && p.images.length >= 4) {
              imgs = [p.images[0], p.images[1], p.images[2], p.images[3]];
            } else if (p.image_url || p.imageUrl) {
              const mainImg = p.image_url || p.imageUrl;
              imgs = [mainImg, mainImg, mainImg, mainImg];
            }

            const mrpVal = Number(p.mrp || p.price || 100);
            const sellingPriceVal = Number(p.selling_price || p.price || p.sellingPrice || mrpVal);
            const discountVal = mrpVal > sellingPriceVal ? Math.round(((mrpVal - sellingPriceVal) / mrpVal) * 100) : Number(p.discount || 0);

            return {
              id: p.id,
              name: p.name || '',
              brand: p.brand || '',
              category: p.category || 'Grains & Flours',
              subCategory: p.sub_category || p.subCategory || '',
              unit: p.unit || '1 kg',
              weightSize: p.weight_size || p.weightSize || p.unit || '1 kg',
              description: p.description || '',
              hsn: p.hsn || '1006',
              barcode: p.barcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
              mrp: mrpVal,
              sellingPrice: sellingPriceVal,
              discount: discountVal,
              orderEligibility: (p.order_eligibility || p.orderEligibility || 'BOTH') as any,
              status: (p.status || 'PUBLISHED') as any,
              images: imgs,
              createdAt: p.created_at || p.createdAt || new Date().toISOString(),
              updatedAt: p.updated_at || p.updatedAt || new Date().toISOString(),
            };
          });

          // Cache in localStorage for zero-flicker reload
          try {
            localStorage.setItem('pm_cached_products', JSON.stringify(formattedProducts));
          } catch {}

          return formattedProducts as unknown as T;
        }

        // Fallback 1: Store Snapshot in pantry_mart_store table
        const { data: snapshotData } = await supabase
          .from('pantry_mart_store')
          .select('data')
          .eq('id', 'latest_state')
          .single();

        if (snapshotData?.data?.products && Array.isArray(snapshotData.data.products) && snapshotData.data.products.length > 0) {
          try {
            localStorage.setItem('pm_cached_products', JSON.stringify(snapshotData.data.products));
          } catch {}
          return snapshotData.data.products as unknown as T;
        }

        // Fallback 2: LocalStorage cache
        const cached = localStorage.getItem('pm_cached_products');
        if (cached) {
          try {
            return JSON.parse(cached) as T;
          } catch {}
        }

        return [] as unknown as T;
      }

      // POST PRODUCT (CREATE)
      if (method === 'POST' && body) {
        const newId = body.id || `PRD-${Date.now().toString(36).toUpperCase()}`;
        const imagesArray = Array.isArray(body.images) && body.images.length >= 4 ? body.images : [
          body.imageUrl || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1607349913338-fca6f742960f?w=600&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
        ];

        const formattedProduct: Product = {
          id: newId,
          name: body.name || '',
          brand: body.brand || '',
          category: body.category || 'Grains & Flours',
          subCategory: body.subCategory || '',
          unit: body.unit || body.weightSize || '1 kg',
          weightSize: body.weightSize || body.unit || '1 kg',
          description: body.description || '',
          hsn: body.hsn || '1006',
          barcode: body.barcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
          mrp: Number(body.mrp || 100),
          sellingPrice: Number(body.sellingPrice || body.mrp || 100),
          discount: Number(body.discount || 0),
          orderEligibility: body.orderEligibility || 'BOTH',
          status: body.status || 'PUBLISHED',
          images: imagesArray,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 1. Upsert into Supabase products table
        await supabase.from('products').upsert([
          {
            id: formattedProduct.id,
            name: formattedProduct.name,
            brand: formattedProduct.brand,
            category: formattedProduct.category,
            sub_category: formattedProduct.subCategory,
            barcode: formattedProduct.barcode,
            images: formattedProduct.images,
            unit: formattedProduct.unit,
            weight_size: formattedProduct.weightSize,
            mrp: formattedProduct.mrp,
            selling_price: formattedProduct.sellingPrice,
            is_pantry_eligible: formattedProduct.orderEligibility !== 'QUICK_ONLY',
            is_quick_order_eligible: formattedProduct.orderEligibility !== 'PANTRY_ONLY',
            status: formattedProduct.status,
            updated_at: formattedProduct.updatedAt,
          },
        ], { onConflict: 'id' });

        // 2. Update pantry_mart_store snapshot table
        await updateSupabaseStoreSnapshot('products', formattedProduct, 'ADD');

        // 3. Update localStorage cache
        updateLocalStorageList('pm_cached_products', formattedProduct, 'ADD');

        return formattedProduct as unknown as T;
      }

      // PUT PRODUCT (UPDATE)
      if (method === 'PUT' && body) {
        const idMatch = cleanUrl.match(/\/api\/products\/([^/]+)/);
        const prodId = idMatch ? idMatch[1] : body.id;

        if (prodId) {
          const imagesArray = Array.isArray(body.images) && body.images.length >= 4 ? body.images : undefined;

          const updatedProduct: Partial<Product> & { id: string } = {
            id: prodId,
            name: body.name,
            brand: body.brand,
            category: body.category,
            subCategory: body.subCategory,
            unit: body.unit || body.weightSize,
            weightSize: body.weightSize || body.unit,
            description: body.description,
            hsn: body.hsn,
            barcode: body.barcode,
            mrp: body.mrp !== undefined ? Number(body.mrp) : undefined,
            sellingPrice: body.sellingPrice !== undefined ? Number(body.sellingPrice) : undefined,
            discount: body.discount !== undefined ? Number(body.discount) : undefined,
            orderEligibility: body.orderEligibility,
            status: body.status,
            images: imagesArray as any,
            updatedAt: new Date().toISOString(),
          };

          const dbUpdateObj: any = { updated_at: updatedProduct.updatedAt };
          if (body.name) dbUpdateObj.name = body.name;
          if (body.brand !== undefined) dbUpdateObj.brand = body.brand;
          if (body.category) dbUpdateObj.category = body.category;
          if (body.subCategory !== undefined) dbUpdateObj.sub_category = body.subCategory;
          if (body.barcode) dbUpdateObj.barcode = body.barcode;
          if (imagesArray) dbUpdateObj.images = imagesArray;
          if (body.unit || body.weightSize) dbUpdateObj.unit = body.unit || body.weightSize;
          if (body.weightSize || body.unit) dbUpdateObj.weight_size = body.weightSize || body.unit;
          if (body.mrp !== undefined) dbUpdateObj.mrp = Number(body.mrp);
          if (body.sellingPrice !== undefined) dbUpdateObj.selling_price = Number(body.sellingPrice);
          if (body.status) dbUpdateObj.status = body.status;

          await supabase.from('products').update(dbUpdateObj).eq('id', prodId);
          await updateSupabaseStoreSnapshot('products', updatedProduct, 'UPDATE');
          updateLocalStorageList('pm_cached_products', updatedProduct, 'UPDATE');

          return updatedProduct as unknown as T;
        }
      }

      // DELETE PRODUCT
      if (method === 'DELETE') {
        const idMatch = cleanUrl.match(/\/api\/products\/([^/]+)/);
        if (idMatch && idMatch[1]) {
          const prodId = idMatch[1];
          await supabase.from('products').delete().eq('id', prodId);
          await updateSupabaseStoreSnapshot('products', { id: prodId }, 'DELETE');
          updateLocalStorageList('pm_cached_products', { id: prodId }, 'DELETE');

          return { success: true, message: `Product ${prodId} deleted successfully from Supabase`, productId: prodId } as unknown as T;
        }
      }
    }

    // ---------------- 2. CATEGORIES API ----------------
    if (cleanUrl.includes('/api/categories')) {
      if (method === 'GET') {
        const { data } = await supabase.from('categories').select('*');
        if (data && data.length > 0) {
          const formattedCategories = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            hindiName: c.hindi_name || c.hindiName || '',
            icon: c.icon || 'Package',
            image: c.image || '',
            subcategories: c.subcategories || [],
          }));
          try {
            localStorage.setItem('pm_cached_categories', JSON.stringify(formattedCategories));
          } catch {}
          return formattedCategories as unknown as T;
        }

        const cachedCat = localStorage.getItem('pm_cached_categories');
        if (cachedCat) {
          try { return JSON.parse(cachedCat) as T; } catch {}
        }
      }
    }

    // ---------------- 3. ORDERS API ----------------
    if (cleanUrl.includes('/api/orders')) {
      if (method === 'GET') {
        const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) {
          const formattedOrders = data.map((o: any) => ({
            id: o.id,
            orderNumber: o.order_number || o.id,
            customerId: o.customer_id,
            customerName: o.customer_name || 'Customer',
            mobile: o.customer_mobile || o.mobile || '',
            orderType: o.order_type || 'QUICK',
            items: o.items || [],
            totalAmount: Number(o.total_amount || 0),
            paidAmount: Number(o.paid_amount || 0),
            pantryCreditUsed: Number(o.pantry_debit_amount || 0),
            walletUsed: Number(o.wallet_used || 0),
            status: o.order_status || o.status || 'PLACED',
            paymentStatus: o.payment_status || 'UNPAID',
            deliveryAddress: o.delivery_address || '',
            createdAt: o.created_at || new Date().toISOString(),
          }));

          try {
            localStorage.setItem('pm_cached_orders', JSON.stringify(formattedOrders));
          } catch {}

          return formattedOrders as unknown as T;
        }

        const cachedOrders = localStorage.getItem('pm_cached_orders');
        if (cachedOrders) {
          try { return JSON.parse(cachedOrders) as T; } catch {}
        }
      }

      if (method === 'POST' && body) {
        const orderId = body.id || `ORD-${Date.now().toString(36).toUpperCase()}`;
        const newOrder = {
          id: orderId,
          order_number: body.orderNumber || orderId,
          customer_id: body.customerId || 'CUS-GUEST',
          customer_name: body.customerName || 'Guest User',
          customer_mobile: body.mobile || body.customerMobile || '',
          order_type: body.orderType || 'QUICK',
          items: body.items || [],
          total_amount: Number(body.totalAmount || 0),
          order_status: 'PLACED',
          payment_status: body.paymentStatus || 'UNPAID',
          delivery_address: body.deliveryAddress || '',
          created_at: new Date().toISOString(),
        };

        await supabase.from('orders').insert([newOrder]);
        await updateSupabaseStoreSnapshot('orders', { ...body, id: orderId, createdAt: newOrder.created_at }, 'ADD');
        updateLocalStorageList('pm_cached_orders', { ...body, id: orderId, createdAt: newOrder.created_at }, 'ADD');

        return { success: true, order: { ...body, id: orderId }, message: 'Order created successfully in Supabase' } as unknown as T;
      }
    }

    // ---------------- 4. SETTINGS API ----------------
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

    // ---------------- 5. GENERIC SNAPSHOT STORE FALLBACK ----------------
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
    }
  } catch (err: any) {
    console.warn('[Direct Supabase Fallback Warning]', err?.message || err);
  }

  return null;
}

// Helper to atomically update Supabase JSON snapshot store
async function updateSupabaseStoreSnapshot(key: string, item: any, action: 'ADD' | 'UPDATE' | 'DELETE') {
  try {
    const { data: snapshot } = await supabase
      .from('pantry_mart_store')
      .select('data')
      .eq('id', 'latest_state')
      .single();

    if (snapshot?.data) {
      const currentData = snapshot.data;
      const list = Array.isArray(currentData[key]) ? [...currentData[key]] : [];

      if (action === 'ADD') {
        const idx = list.findIndex((i: any) => i.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item };
        else list.unshift(item);
      } else if (action === 'UPDATE') {
        const idx = list.findIndex((i: any) => i.id === item.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...item };
        else list.unshift(item);
      } else if (action === 'DELETE') {
        currentData[key] = list.filter((i: any) => i.id !== item.id);
      }

      if (action !== 'DELETE') {
        currentData[key] = list;
      }

      await supabase.from('pantry_mart_store').upsert({
        id: 'latest_state',
        data: currentData,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
  } catch (e: any) {
    console.warn('[Snapshot Sync Note]', e?.message || e);
  }
}

// Helper to update LocalStorage list cache
function updateLocalStorageList(storageKey: string, item: any, action: 'ADD' | 'UPDATE' | 'DELETE') {
  try {
    const raw = localStorage.getItem(storageKey);
    let list: any[] = raw ? JSON.parse(raw) : [];

    if (action === 'ADD') {
      const idx = list.findIndex((i: any) => i.id === item.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...item };
      else list.unshift(item);
    } else if (action === 'UPDATE') {
      const idx = list.findIndex((i: any) => i.id === item.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...item };
      else list.unshift(item);
    } else if (action === 'DELETE') {
      list = list.filter((i: any) => i.id !== item.id);
    }

    localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {}
}
