async function run() {
  const urls = [
    "https://res.cloudinary.com/osfkcnuo/image/upload/v1782836750/renuka-tours/packages/w4aozgwzodlejpmomu5h.jpg",
    "https://res.cloudinary.com/osfkcnuo/image/upload/v1782836749/renuka-tours/packages/ernn3nkvvxscly4x1ai7.jpg",
    "https://res.cloudinary.com/osfkcnuo/image/upload/v1782836749/renuka-tours/packages/rmgn3pcogwsvtlgwpdao.jpg"
  ];

  for (const url of urls) {
    try {
      console.log(`\nFetching ${url}...`);
      const res = await fetch(url);
      console.log(`Status: ${res.status}`);
      // Read some bytes to confirm complete download
      const buf = await res.arrayBuffer();
      console.log(`Downloaded ${buf.byteLength} bytes.`);
    } catch (err) {
      console.error("Fetch failed!");
      console.error("Error name:", err.name);
      console.error("Error message:", err.message);
      if (err.cause) {
        console.error("Cause name:", err.cause.name || err.cause.code);
        console.error("Cause message:", err.cause.message);
      }
    }
  }
}

run();
