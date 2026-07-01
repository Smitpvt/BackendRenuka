async function run() {
  try {
    const res = await fetch("http://localhost:5000/api/v1/packages/lonavala-weekend-getaway");
    const data = await res.json();
    console.log("API Response package.gallery:");
    console.log(JSON.stringify(data.package.gallery, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
