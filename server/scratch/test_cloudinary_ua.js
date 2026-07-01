async function testCloudinary(url) {
  const desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const mobileUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  try {
    const desktopRes = await fetch(url, { headers: { "User-Agent": desktopUA } });
    console.log(`[Desktop fetch] URL: ${url} -> Status: ${desktopRes.status}`);

    const mobileRes = await fetch(url, { headers: { "User-Agent": mobileUA } });
    console.log(`[Mobile fetch] URL: ${url} -> Status: ${mobileRes.status}`);
  } catch (err) {
    console.error(`Error fetching ${url}:`, err.message);
  }
}

async function run() {
  const urls = [
    "https://res.cloudinary.com/osfkcnuo/image/upload/v1782836750/renuka-tours/packages/w4aozgwzodlejpmomu5h.jpg",
    "https://res.cloudinary.com/osfkcnuo/image/upload/v1782836749/renuka-tours/packages/ernn3nkvvxscly4x1ai7.jpg",
    "https://res.cloudinary.com/osfkcnuo/image/upload/v1782836749/renuka-tours/packages/rmgn3pcogwsvtlgwpdao.jpg"
  ];

  for (const url of urls) {
    await testCloudinary(url);
  }
}

run();
