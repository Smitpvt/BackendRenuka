import dns from 'dns';

dns.resolve4('res.cloudinary.com', (err, addresses) => {
  if (err) {
    console.error("DNS Resolve Error:", err);
  } else {
    console.log("DNS Resolve IP Addresses:", addresses);
  }
});
