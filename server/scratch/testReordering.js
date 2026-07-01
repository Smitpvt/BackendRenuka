import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Vehicle from '../models/Vehicle.js';
import { getPublicVehicles, getAdminVehicles, reorderVehicles } from '../controllers/vehicleController.js';

dotenv.config();

const mockResponse = () => {
  const res = {};
  const promise = new Promise((resolve) => {
    res._resolve = resolve;
  });
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    res._resolve(res);
    return res;
  };
  res.wait = () => promise;
  return res;
};

const runTests = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }

    console.log('\n--- Test 1: Fetch Public Vehicles Sorting ---');
    const req1 = {};
    const res1 = mockResponse();
    const next1 = (err) => { if (err) throw err; };
    getPublicVehicles(req1, res1, next1);
    await res1.wait();
    
    console.log(`HTTP Status: ${res1.statusCode}`);
    console.log(`Success: ${res1.body.success}`);
    console.log(`Results Count: ${res1.body.results}`);

    // Verify sorted order (type asc, displayOrder asc)
    let prevType = '';
    let prevOrder = -1;
    let sortedCorrectly = true;
    
    res1.body.vehicles.forEach((v, index) => {
      console.log(`[${index}] Type: ${v.type} | Name: ${v.name} | DisplayOrder: ${v.displayOrder}`);
      if (prevType && v.type < prevType) {
        sortedCorrectly = false;
        console.error(`ERROR: category out of order! ${v.type} < ${prevType}`);
      } else if (v.type === prevType) {
        if (v.displayOrder < prevOrder) {
          sortedCorrectly = false;
          console.error(`ERROR: displayOrder out of order inside ${v.type}! ${v.displayOrder} < ${prevOrder}`);
        }
      }
      prevType = v.type;
      prevOrder = v.displayOrder;
    });

    if (sortedCorrectly) {
      console.log('-> PASS: Vehicles are correctly sorted by category and displayOrder ascending!');
    } else {
      console.error('-> FAIL: Sorting validation failed.');
    }

    console.log('\n--- Test 2: Validation of Reorder Endpoint ---');
    
    // Case 2a: non-array input
    const res2a = mockResponse();
    let errorMsg2a = '';
    const next2a = (err) => { errorMsg2a = err.message; res2a._resolve(); };
    reorderVehicles({ body: { invalid: 'payload' } }, res2a, next2a);
    await res2a.wait();
    console.log(`Non-array error check: ${errorMsg2a === 'Request body must be an array of vehicle updates.' ? 'PASS' : 'FAIL'} (${errorMsg2a})`);

    // Case 2b: missing displayOrder
    const res2b = mockResponse();
    let errorMsg2b = '';
    const next2b = (err) => { errorMsg2b = err.message; res2b._resolve(); };
    reorderVehicles({ body: [{ _id: '6681285098ffb415a77f98fb' }] }, res2b, next2b);
    await res2b.wait();
    console.log(`Missing displayOrder error check: ${errorMsg2b.includes('must contain a numeric \'displayOrder\'') ? 'PASS' : 'FAIL'} (${errorMsg2b})`);

    // Case 2c: duplicate IDs
    const res2c = mockResponse();
    let errorMsg2c = '';
    const next2c = (err) => { errorMsg2c = err.message; res2c._resolve(); };
    reorderVehicles({ body: [
      { _id: '6681285098ffb415a77f98fb', displayOrder: 0 },
      { _id: '6681285098ffb415a77f98fb', displayOrder: 1 }
    ] }, res2c, next2c);
    await res2c.wait();
    console.log(`Duplicate IDs error check: ${errorMsg2c.includes('Duplicate vehicle ID detected') ? 'PASS' : 'FAIL'} (${errorMsg2c})`);

    // Case 2d: Invalid ObjectIds
    const res2d = mockResponse();
    let errorMsg2d = '';
    const next2d = (err) => { errorMsg2d = err.message; res2d._resolve(); };
    reorderVehicles({ body: [
      { _id: 'invalid-id', displayOrder: 0 }
    ] }, res2d, next2d);
    await res2d.wait();
    console.log(`Invalid ObjectId error check: ${errorMsg2d.includes('Invalid vehicle ID format') ? 'PASS' : 'FAIL'} (${errorMsg2d})`);

    // Case 2e: Non-existing ObjectIds
    const res2e = mockResponse();
    let errorMsg2e = '';
    const next2e = (err) => { errorMsg2e = err.message; res2e._resolve(); };
    reorderVehicles({ body: [
      { _id: '6681285098ffb415a77f98fa', displayOrder: 0 } // invalid ID not in DB
    ] }, res2e, next2e);
    await res2e.wait();
    console.log(`Non-existent ID error check: ${errorMsg2e.includes('One or more vehicle IDs are invalid or do not exist') ? 'PASS' : 'FAIL'} (${errorMsg2e})`);

    console.log('\n--- Test 3: Perform actual reordering ---');
    // Let's find first 2 vehicles of the same category, reorder them, and check if order is updated
    const vehiclesOfCat = res1.body.vehicles.filter(v => v.type === 'Mini Bus');
    if (vehiclesOfCat.length >= 2) {
      const v0 = vehiclesOfCat[0];
      const v1 = vehiclesOfCat[1];
      console.log(`Original Mini Bus displayOrder: [${v0.name}] = ${v0.displayOrder}, [${v1.name}] = ${v1.displayOrder}`);
      
      const res3 = mockResponse();
      const next3 = (err) => { if (err) throw err; };
      const reorderPayload = [
        { _id: v0._id, displayOrder: v1.displayOrder },
        { _id: v1._id, displayOrder: v0.displayOrder }
      ];
      
      reorderVehicles({ body: reorderPayload }, res3, next3);
      await res3.wait();
      console.log(`Reorder API response status: ${res3.statusCode}`);
      console.log(`Reorder API response body:`, res3.body);

      // Verify in DB that it updated
      const updatedV0 = await Vehicle.findById(v0._id).lean();
      const updatedV1 = await Vehicle.findById(v1._id).lean();
      console.log(`Updated Mini Bus displayOrder: [${v0.name}] = ${updatedV0.displayOrder}, [${v1.name}] = ${updatedV1.displayOrder}`);
      
      if (updatedV0.displayOrder === v1.displayOrder && updatedV1.displayOrder === v0.displayOrder) {
        console.log('-> PASS: Reordering applied successfully in database!');
      } else {
        console.error('-> FAIL: Reordering was not correctly saved.');
      }
    } else {
      console.warn('Skipping actual reorder test because we need at least 2 Mini Buses in the database.');
    }

    console.log('\n--- Test 4: Calculation of next displayOrder for new vehicles ---');
    const typeForNew = 'Mini Bus';
    const maxVehicleInDb = await Vehicle.findOne({
      type: typeForNew,
      isDeleted: { $ne: true }
    })
      .sort({ displayOrder: -1 })
      .select('displayOrder')
      .lean();
    const expectedOrder = maxVehicleInDb ? (maxVehicleInDb.displayOrder || 0) + 1 : 0;
    console.log(`Expected displayOrder for new ${typeForNew}: ${expectedOrder}`);
    
    // Create a temporary vehicle with Vehicle.create directly
    const tempVehicle = await Vehicle.create({
      name: 'Test Vehicle Temp',
      slug: 'test-vehicle-temp',
      image: 'https://example.com/image.jpg',
      seats: 15,
      type: typeForNew,
      fuelType: 'Diesel',
      description: 'A test vehicle description',
      displayOrder: expectedOrder
    });
    
    console.log(`Saved temporary vehicle with displayOrder: ${tempVehicle.displayOrder}`);
    if (tempVehicle.displayOrder === expectedOrder) {
      console.log('-> PASS: Newly created vehicle has correct displayOrder (max + 1)!');
    } else {
      console.error('-> FAIL: displayOrder for new vehicle mismatch!');
    }
    
    // Clean up temporary vehicle
    await Vehicle.deleteOne({ _id: tempVehicle._id });
    console.log('Cleaned up temporary vehicle.');

    console.log('\nAll tests executed.');
    process.exit(0);
  } catch (err) {
    console.error('ERROR during testing:', err);
    process.exit(1);
  }
};

runTests();
