import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Package from '../models/Package.js';

dotenv.config();

const run = async () => {
  await connectDB();
  try {
    const packages = await Package.find({});
    console.log(`--- CURRENT PACKAGES IN MONGO (Count: ${packages.length}) ---`);
    for (const pkg of packages) {
      console.log(`Package: ${pkg.title}`);
      console.log(`  Slug: ${pkg.slug}`);
      console.log(`  Image: ${pkg.image}`);
      console.log(`  Gallery: ${JSON.stringify(pkg.gallery)}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
