import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Package from '../models/Package.js';
import Vehicle from '../models/Vehicle.js';

dotenv.config();

const runMigration = async () => {
  try {
    console.log('Running Package Pricing migration...');

    // Fetch all active, non-deleted vehicles
    const vehicles = await Vehicle.find({ isDeleted: { $ne: true }, active: true }).lean();
    if (vehicles.length === 0) {
      console.log('No active vehicles found. Cannot migrate packages to vehicle pricing. Migration skipped.');
      process.exit(0);
    }

    const getVehiclePriceMultiplier = (vehicleType) => {
      if (vehicleType === 'SUV / Cars') return 0.8;
      if (vehicleType === 'Mini Bus') return 1.4;
      if (vehicleType === 'Luxury Bus') return 2.2;
      return 1.0;
    };

    // Fetch all packages
    const packages = await Package.find({});
    console.log(`Found ${packages.length} packages to evaluate.`);

    let updatedCount = 0;

    for (const pkg of packages) {
      // Check if package already has vehicle-wise pricing populated
      if (pkg.pricing && Array.isArray(pkg.pricing.vehicles) && pkg.pricing.vehicles.length > 0) {
        console.log(`-> Package "${pkg.title}" already has vehicle pricing. Skipping.`);
        continue;
      }

      // If package pricing is a custom quote, just initialize empty array
      if (pkg.pricing && pkg.pricing.customQuote) {
        pkg.pricing.vehicles = [];
        pkg.markModified('pricing');
        await pkg.save();
        updatedCount++;
        console.log(`-> Package "${pkg.title}" (custom quote): Initialized empty vehicles array.`);
        continue;
      }

      // If package has ac price, map to vehicles
      const ac = pkg.pricing ? pkg.pricing.ac : undefined;
      const nonAc = pkg.pricing ? pkg.pricing.nonAc : undefined;

      if (ac) {
        const vehiclesPricing = vehicles.map(vh => {
          const mult = getVehiclePriceMultiplier(vh.type);
          const calculatedAc = Math.round((ac * mult) / 100) * 100;
          const calculatedNonAc = nonAc ? Math.round((nonAc * mult) / 100) * 100 : undefined;
          return {
            vehicle: vh._id,
            ac: calculatedAc,
            nonAc: calculatedNonAc,
            note: `Estimated rate for ${vh.name}`
          };
        });

        pkg.pricing.vehicles = vehiclesPricing;
        pkg.markModified('pricing');
        await pkg.save();
        updatedCount++;
        console.log(`-> Package "${pkg.title}": Populated pricing for ${vehiclesPricing.length} vehicles.`);
      } else {
        // Initialise empty vehicles array
        if (!pkg.pricing) {
          pkg.pricing = { vehicles: [] };
        } else {
          pkg.pricing.vehicles = [];
        }
        pkg.markModified('pricing');
        await pkg.save();
        updatedCount++;
        console.log(`-> Package "${pkg.title}" (no AC price): Initialized empty vehicles array.`);
      }
    }

    console.log(`Migration completed! Successfully updated ${updatedCount} packages.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

const startMigration = async () => {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
    });
  }
  await runMigration();
};

startMigration();
