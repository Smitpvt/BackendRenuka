import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const packageSchema = new mongoose.Schema({
  title: String,
  slug: String,
  gallery: mongoose.Schema.Types.Mixed,
  active: Boolean,
  isDeleted: Boolean
}, { strict: false });

const Package = mongoose.model('Package', packageSchema, 'packages');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/renuka");
    console.log("Connected to MongoDB");

    const pkgs = await Package.find({});
    console.log(`Found ${pkgs.length} packages:`);

    for (const pkg of pkgs) {
      console.log(`\n--- Package: ${pkg.title} (${pkg.slug}) ---`);
      const gallery = pkg.gallery || [];
      console.log(`Gallery items count: ${gallery.length}`);
      
      for (const item of gallery) {
        console.log("Gallery item:", JSON.stringify(item));
        const url = typeof item === 'string' ? item : item?.image;
        if (url) {
          try {
            const res = await fetch(url);
            console.log(`  -> URL: ${url} | HTTP Status: ${res.status}`);
          } catch (e) {
            console.log(`  -> URL: ${url} | Fetch Error: ${e.message}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
