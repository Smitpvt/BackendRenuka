import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Package from '../models/Package.js';
import { updatePackage } from '../controllers/packageController.js';

dotenv.config({ path: 'd:/renuka/server/.env' });

async function run() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to database URI (masked):', uri ? uri.substring(0, 30) + '...' : 'undefined');
  
  await mongoose.connect(uri);
  
  // Explicitly wait for connection to be fully ready
  while (mongoose.connection.readyState !== 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('Connected!');

  const pkg = await Package.findOne({ isDeleted: { $ne: true } });
  if (!pkg) {
    console.error('No package found in the database!');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Testing with package: ${pkg.title} (ID: ${pkg._id})`);

  // Mock Request
  const req = {
    params: { id: pkg._id.toString() },
    body: {
      title: pkg.title,
      category: pkg.category,
      desc: pkg.desc + ' (updated description)',
      existingGallery: undefined, // Simulates user not changing the gallery
      galleryStructure: undefined // Simulates no galleryStructure sent
    },
    files: {}
  };

  // Mock Response
  const res = {
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(data) {
      console.log('\n--- SUCCESS RESPONSE ---');
      console.log('Status Code:', this.statusCode);
      console.log('Body:', JSON.stringify(data, null, 2));
    }
  };

  // Mock Next
  const next = (err) => {
    console.error('\n--- ERROR / NEXT CALLED ---');
    if (err) {
      console.error('Error Code:', err.statusCode || 500);
      console.error('Error Message:', err.message);
      console.error('Stack Trace:\n', err.stack);
    } else {
      console.error('Next called with no error.');
    }
  };

  console.log('\nInvoking updatePackage...');
  try {
    await updatePackage(req, res, next);
  } catch (err) {
    console.error('\n--- UNCAUGHT CONTROLLER EXCEPTION ---');
    console.error(err.stack);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
});
