const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhM2Q3MmU4N2U1ZjNmYjM2YmMzMDY2MyIsImlhdCI6MTc4Mjg0NDcxMSwiZXhwIjoxNzgyOTMxMTExfQ.qCYh30EPy6jqoBs1WXw1O5mL-vM_DZzpMg_9ctlAS88';
const PKG_ID = '6a43f4af10a3c920353b0a75'; // Lonavala Weekend Getaway ID

async function run() {
  const url = `https://renuka-travels.onrender.com/api/v1/packages/${PKG_ID}`;
  console.log(`Sending PUT request to production backend: ${url}`);

  const formData = new FormData();
  formData.append('title', 'Lonavala Weekend Getaway (Production API test update)');
  
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      },
      body: formData
    });

    const status = res.status;
    const body = await res.json();

    console.log('\n=== PRODUCTION RESPONSE STATUS ===');
    console.log(status);
    console.log('\n=== PRODUCTION RESPONSE BODY ===');
    console.log(JSON.stringify(body, null, 2));

  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

run().catch(console.error);
