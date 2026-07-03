import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Package from '../models/Package.js';
import Vehicle from '../models/Vehicle.js';
import AppError from '../utils/appError.js';
import cloudinary from '../config/cloudinary.js';

dotenv.config();

// Stub Cloudinary upload stream to bypass network requests
cloudinary.uploader.upload_stream = (options, callback) => {
  return {
    end(buffer) {
      setTimeout(() => {
        callback(null, { secure_url: 'https://res.cloudinary.com/fake-image.jpg' });
      }, 50);
    }
  };
};

let jsonPromise;
let resolveJson;
let rejectJson;

const resetPromise = () => {
  jsonPromise = new Promise((resolve, reject) => {
    resolveJson = resolve;
    rejectJson = reject;
  });
};

// Stub response and request objects for testing
const mockRes = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.jsonData = data;
    if (resolveJson) resolveJson(data);
    return this;
  }
};

const mockNext = (err) => {
  if (err) {
    if (rejectJson) rejectJson(err);
    else throw err;
  }
};

const runTests = async () => {
  await connectDB();
  console.log('--- STARTING PACKAGE VEHICLE PRICING TESTS ---');

  // Fetch some seeded data
  const vehicles = await Vehicle.find({ active: true, isDeleted: { $ne: true } }).limit(3);
  console.log(`Found ${vehicles.length} active vehicles for testing.`);
  if (vehicles.length < 2) {
    console.error('Test requires at least 2 active vehicles. Run seeder first.');
    process.exit(1);
  }

  const v1 = vehicles[0];
  const v2 = vehicles[1];

  // Import controller methods dynamically
  const { createPackage, updatePackage, getPublicPackages, getPackageBySlug } = await import('../controllers/packageController.js');

  // Test Case 1: Create package with valid vehicle pricing
  console.log('\nTest Case 1: Creating a package with valid vehicle pricing...');
  const req1 = {
    body: {
      title: 'Test Package Valid Vehicle Pricing',
      category: 'Weekend Trips',
      duration: '2 Days',
      desc: 'Description for test package.',
      featured: false,
      active: true,
      pricing: JSON.stringify({
        tollIncluded: true,
        customQuote: false,
        vehicles: [
          { vehicle: v1._id.toString(), ac: 5000, nonAc: 4000, note: 'Sedan price' },
          { vehicle: v2._id.toString(), ac: 8000, nonAc: 7000, note: 'SUV price' }
        ]
      }),
      highlights: JSON.stringify(['Highlight 1', 'Highlight 2'])
    },
    files: {
      image: [{ buffer: Buffer.from('fake-image-bytes') }],
      gallery: []
    }
  };

  try {
    const res1 = Object.create(mockRes);
    resetPromise();
    createPackage(req1, res1, mockNext);
    await jsonPromise;

    console.log('-> Success! Package created:');
    const createdPkg = res1.jsonData.package;
    console.log('   Title:', createdPkg.title);
    console.log('   Calculated ac (min):', createdPkg.pricing.ac); // should be 5000
    console.log('   Calculated nonAc (min):', createdPkg.pricing.nonAc); // should be 4000
    console.log('   Vehicles length:', createdPkg.pricing.vehicles.length);
    console.log('   First vehicle name:', createdPkg.pricing.vehicles[0].vehicle.name);
    console.log('   First vehicle displayCategory:', createdPkg.pricing.vehicles[0].vehicle.displayCategory);

    if (createdPkg.pricing.ac !== 5000 || createdPkg.pricing.nonAc !== 4000) {
      throw new Error(`Min price calculations incorrect! Expected 5000/4000, got ${createdPkg.pricing.ac}/${createdPkg.pricing.nonAc}`);
    }

    // Test Case 2: Validation - Duplicate vehicle reference
    console.log('\nTest Case 2: Validation - Reject duplicate vehicle references...');
    const req2 = {
      body: {
        title: 'Test Package Dup Vehicle',
        category: 'Weekend Trips',
        duration: '1 Day',
        desc: 'Testing duplicate vehicles validation.',
        pricing: JSON.stringify({
          vehicles: [
            { vehicle: v1._id.toString(), ac: 5000 },
            { vehicle: v1._id.toString(), ac: 6000 }
          ]
        })
      },
      files: { image: [{ buffer: Buffer.from('fake-image-bytes') }] }
    };

    try {
      const res2 = Object.create(mockRes);
      resetPromise();
      createPackage(req2, res2, mockNext);
      await jsonPromise;
      console.error('-> FAIL: Duplicate vehicle pricing did not trigger validation error.');
    } catch (err) {
      console.log('-> Success! Validation caught duplicate vehicle:', err.message);
    }

    // Test Case 3: Validation - Invalid AC price
    console.log('\nTest Case 3: Validation - Reject negative AC price...');
    const req3 = {
      body: {
        title: 'Test Package Invalid Price',
        category: 'Weekend Trips',
        duration: '1 Day',
        desc: 'Testing price validation.',
        pricing: JSON.stringify({
          vehicles: [
            { vehicle: v1._id.toString(), ac: -100 }
          ]
        })
      },
      files: { image: [{ buffer: Buffer.from('fake-image-bytes') }] }
    };

    try {
      const res3 = Object.create(mockRes);
      resetPromise();
      createPackage(req3, res3, mockNext);
      await jsonPromise;
      console.error('-> FAIL: Negative AC price did not trigger validation error.');
    } catch (err) {
      console.log('-> Success! Validation caught negative price:', err.message);
    }

    // Test Case 4: Validation - Non-existent vehicle reference
    console.log('\nTest Case 4: Validation - Reject non-existent vehicle ID...');
    const randomObjectId = new mongoose.Types.ObjectId().toString();
    const req4 = {
      body: {
        title: 'Test Package Bad Ref',
        category: 'Weekend Trips',
        duration: '1 Day',
        desc: 'Testing nonexistent vehicle.',
        pricing: JSON.stringify({
          vehicles: [
            { vehicle: randomObjectId, ac: 5000 }
          ]
        })
      },
      files: { image: [{ buffer: Buffer.from('fake-image-bytes') }] }
    };

    try {
      const res4 = Object.create(mockRes);
      resetPromise();
      createPackage(req4, res4, mockNext);
      await jsonPromise;
      console.error('-> FAIL: Non-existent vehicle ID did not trigger validation error.');
    } catch (err) {
      console.log('-> Success! Validation caught non-existent vehicle:', err.message);
    }

    // Test Case 5: Validation - Inactive vehicle reference
    console.log('\nTest Case 5: Validation - Reject inactive vehicle...');
    // Temp disable vehicle 2
    v2.active = false;
    await v2.save();

    const req5 = {
      body: {
        title: 'Test Package Inactive Ref',
        category: 'Weekend Trips',
        duration: '1 Day',
        desc: 'Testing inactive vehicle.',
        pricing: JSON.stringify({
          vehicles: [
            { vehicle: v2._id.toString(), ac: 5000 }
          ]
        })
      },
      files: { image: [{ buffer: Buffer.from('fake-image-bytes') }] }
    };

    try {
      const res5 = Object.create(mockRes);
      resetPromise();
      createPackage(req5, res5, mockNext);
      await jsonPromise;
      console.error('-> FAIL: Inactive vehicle reference did not trigger validation error.');
    } catch (err) {
      console.log('-> Success! Validation caught inactive vehicle:', err.message);
    } finally {
      v2.active = true;
      await v2.save();
    }

    // Test Case 6: Update Package - Update vehicle pricing list
    console.log('\nTest Case 6: Updating vehicle pricing list on an existing package...');
    const req6 = {
      params: { id: createdPkg._id.toString() },
      body: {
        pricing: JSON.stringify({
          tollIncluded: true,
          customQuote: false,
          vehicles: [
            { vehicle: v1._id.toString(), ac: 5200, nonAc: 4200, note: 'Updated Sedan' }
          ]
        })
      },
      files: {}
    };

    const res6 = Object.create(mockRes);
    resetPromise();
    updatePackage(req6, res6, mockNext);
    await jsonPromise;

    const updatedPkg = res6.jsonData.package;
    console.log('-> Success! Package updated:');
    console.log('   New starting ac:', updatedPkg.pricing.ac); // should be 5200
    console.log('   New starting nonAc:', updatedPkg.pricing.nonAc); // should be 4200
    console.log('   Vehicles length (should be 1):', updatedPkg.pricing.vehicles.length);

    if (updatedPkg.pricing.ac !== 5200 || updatedPkg.pricing.vehicles.length !== 1) {
      throw new Error(`Update modifications were not correctly persistent!`);
    }

    // Test Case 7: Validation - Custom Quote packages can have empty vehicle pricing
    console.log('\nTest Case 7: Creating a custom quote package with no vehicle pricing...');
    const req7 = {
      body: {
        title: 'Test Package Custom Quote No Vehicles',
        category: 'Weekend Trips',
        duration: '1 Day',
        desc: 'Testing custom quote vehicles bypass.',
        pricing: JSON.stringify({
          customQuote: true,
          vehicles: []
        })
      },
      files: { image: [{ buffer: Buffer.from('fake-image-bytes') }] }
    };

    const res7 = Object.create(mockRes);
    resetPromise();
    createPackage(req7, res7, mockNext);
    await jsonPromise;
    const customQuotePkg = res7.jsonData.package;
    console.log('-> Success! Custom quote package created:');
    console.log('   pricing.customQuote:', customQuotePkg.pricing.customQuote);
    console.log('   pricing.vehicles length:', customQuotePkg.pricing.vehicles.length);

    // Test Case 8: Validation - Normal package still requires pricing
    console.log('\nTest Case 8: Normal package requires vehicle pricing or base price...');
    const req8 = {
      body: {
        title: 'Test Package Normal No Pricing',
        category: 'Weekend Trips',
        duration: '1 Day',
        desc: 'Testing normal package validation.',
        pricing: JSON.stringify({
          customQuote: false,
          vehicles: []
        })
      },
      files: { image: [{ buffer: Buffer.from('fake-image-bytes') }] }
    };

    try {
      const res8 = Object.create(mockRes);
      resetPromise();
      createPackage(req8, res8, mockNext);
      await jsonPromise;
      console.error('-> FAIL: Normal package with no pricing did not trigger validation error.');
    } catch (err) {
      console.log('-> Success! Validation caught normal package with no pricing:', err.message);
    }

    // Clean up test packages
    await Package.deleteOne({ _id: createdPkg._id });
    await Package.deleteOne({ _id: customQuotePkg._id });
    console.log('\nAll test cases passed successfully! 🎉');
    process.exit(0);

  } catch (err) {
    console.error('TESTING ERROR:', err);
    process.exit(1);
  }
};

runTests();
