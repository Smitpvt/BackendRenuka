import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Vehicle from '../models/Vehicle.js';

dotenv.config();

const runMigration = async () => {
  try {
    console.log('Running manual migration: initializing displayOrder for existing vehicles...');

    // Fetch all non-deleted vehicles
    const vehicles = await Vehicle.find({ isDeleted: { $ne: true } }).lean();

    if (vehicles.length === 0) {
      console.log('No vehicles found in database. Migration skipped.');
      process.exit(0);
    }

    // Group vehicles by category (type)
    const grouped = {};
    vehicles.forEach(v => {
      const cat = v.type || 'SUV / Cars';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(v);
    });

    const bulkOps = [];

    for (const cat of Object.keys(grouped)) {
      const list = grouped[cat];

      // Sort based on:
      // 1. If displayOrder exists (is defined), compare displayOrder.
      // 2. If both displayOrder exist and are equal, or if neither exists, sort by createdAt ascending (preserving original visible order).
      list.sort((a, b) => {
        const orderA = a.displayOrder;
        const orderB = b.displayOrder;
        
        const hasA = orderA !== undefined && orderA !== null;
        const hasB = orderB !== undefined && orderB !== null;

        if (hasA && hasB) {
          if (orderA !== orderB) return orderA - orderB;
        } else if (hasA) {
          return -1;
        } else if (hasB) {
          return 1;
        }

        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateA - dateB; // Ascending order
      });

      // Assign sequential displayOrder
      list.forEach((v, index) => {
        if (v.displayOrder !== index) {
          bulkOps.push({
            updateOne: {
              filter: { _id: v._id },
              update: { $set: { displayOrder: index } }
            }
          });
        }
      });
    }

    if (bulkOps.length > 0) {
      const result = await Vehicle.bulkWrite(bulkOps);
      console.log(`Successfully initialized displayOrder for ${result.modifiedCount} vehicles.`);
    } else {
      console.log('All vehicles already have correct displayOrder initialized.');
    }

    console.log('Migration completed successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL: Migration failed with error:', error);
    process.exit(1);
  }
};

const startMigration = async () => {
  await connectDB();
  
  if (mongoose.connection.readyState !== 1) {
    console.log('Waiting for MongoDB connection to be active...');
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
    });
  }
  
  await runMigration();
};

startMigration();
