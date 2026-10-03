import fetch from 'node-fetch';

const SUPABASE_URL = 'https://bgxnmmecjcgrwtemmjtz.supabase.co';

async function test() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/product_batches?select=*&limit=1`, {
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY || ''}`,
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log('BATCH COLUMNS:', data.length > 0 ? Object.keys(data[0]) : 'TABLE IS EMPTY');
    } else {
      console.log('ERROR:', res.status, await res.text());
    }
  } catch (err) {
    console.log('FETCH FAILED:', err);
  }
}

test();
