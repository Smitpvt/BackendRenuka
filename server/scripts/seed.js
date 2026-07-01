import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Models
import Admin from '../models/Admin.js';
import Package from '../models/Package.js';
import Vehicle from '../models/Vehicle.js';
import Testimonial from '../models/Testimonial.js';

// Raw data imports from client
import { packages as rawPackages } from '../../client/src/data/packages.js';
import { vehicles as rawVehicles } from '../../client/src/data/vehicles.js';

dotenv.config();

// Helper to parse price string (e.g. "₹18,000" -> 18000)
const parsePrice = (priceStr) => {
  if (!priceStr) return undefined;
  if (priceStr.toLowerCase().includes('custom') || priceStr.toLowerCase().includes('quote')) {
    return undefined;
  }
  const cleanStr = priceStr.replace(/[^\d]/g, '');
  const num = parseInt(cleanStr, 10);
  return isNaN(num) ? undefined : num;
};

// Helper to parse seats string (e.g. "6 Seats" -> 6)
const parseSeats = (seatsStr) => {
  if (!seatsStr) return 7;
  const cleanStr = seatsStr.toString().replace(/[^\d]/g, '');
  const num = parseInt(cleanStr, 10);
  return isNaN(num) ? 7 : num;
};

// Helper to determine vehicle type enum based on seats and name
const determineVehicleType = (seatsCount, name) => {
  const text = (name || '').toLowerCase();
  if (seatsCount >= 30 || text.includes('coach') || text.includes('bus')) {
    return 'Luxury Bus';
  }
  if (seatsCount >= 12 || text.includes('traveller') || text.includes('traveller') || text.includes('mini')) {
    return 'Mini Bus';
  }
  return 'SUV / Cars';
};

// Helper to determine fuel type based on specs
const determineFuelType = (vehicle) => {
  const engineText = (vehicle.specifications?.engine || '').toLowerCase();
  const nameText = (vehicle.name || '').toLowerCase();
  const descText = (vehicle.description || '').toLowerCase();
  const text = `${engineText} ${nameText} ${descText}`;

  if (text.includes('cng')) return 'CNG';
  if (text.includes('petrol')) return 'Petrol';
  if (text.includes('electric') || text.includes('ev')) return 'Electric';
  return 'Diesel'; // Default most common
};

const runSeeder = async () => {
  console.log('Starting Database Seeding...');
  
  // Make sure we have environment variables
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be defined in .env for seeder to run.');
    process.exit(1);
  }

  try {
    // 1. Seed Super Admin
    console.log('Seeding Super Admin account...');
    const superAdminEmail = process.env.ADMIN_EMAIL.toLowerCase();
    
    const adminExists = await Admin.findOne({ email: superAdminEmail });
    if (adminExists) {
      console.log(`-> Super Admin account already exists: (${superAdminEmail}). Skipping admin creation.`);
    } else {
      await Admin.create({
        name: 'Super Admin',
        email: superAdminEmail,
        password: process.env.ADMIN_PASSWORD,
        role: 'superadmin'
      });
      console.log(`-> Created Super Admin account: (${superAdminEmail})`);
    }

    // 2. Seed Packages
    console.log('Seeding Packages...');
    const packagesCount = await Package.countDocuments();
    if (packagesCount > 0) {
      console.log('-> Packages collection is not empty. Skipping packages seeding.');
    } else {
      const packagesToSeed = rawPackages.map((pkg) => {
        const isCustomQuote = !pkg.acPrice || pkg.acPrice.toLowerCase().includes('custom');
        const ac = parsePrice(pkg.acPrice);
        const nonAc = parsePrice(pkg.nonAcPrice);

        // Map local asset image paths directly
        const mainImage = pkg.image || (pkg.gallery && pkg.gallery[0]) || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&fit=crop';
        
        return {
          title: pkg.title,
          slug: pkg.slug,
          category: ['Weekend Trips', 'Pilgrimage', 'Family Tours', 'Corporate Tours'].includes(pkg.category)
            ? pkg.category
            : 'Weekend Trips', // Fallback safety
          duration: pkg.duration || '1 Day',
          desc: pkg.desc || pkg.title,
          image: mainImage,
          gallery: pkg.gallery || [],
          featured: pkg.featured || false,
          active: true,
          pricing: {
            ac,
            nonAc,
            tollIncluded: !pkg.additionalToll,
            customQuote: isCustomQuote
          },
          highlights: pkg.highlights || []
        };
      });

      // Insert packages
      await Package.create(packagesToSeed);
      console.log(`-> Seeded ${packagesToSeed.length} packages successfully!`);
    }

    // 3. Seed Vehicles
    console.log('Seeding Vehicles...');
    // Drop existing to ensure new schema structure is seeded properly
    await Vehicle.deleteMany({});
    console.log('-> Cleared existing vehicles for fresh seeding.');

    const getDefaultPricing = (name, seatsCount) => {
      const text = (name || '').toLowerCase();
      
      if (text.includes('sedan') || text.includes('dzire') || text.includes('etios')) {
        return { nonAc: 14, ac: 14 };
      }
      if (text.includes('ertiga')) {
        return { nonAc: 16, ac: 16 };
      }
      if (text.includes('innova')) {
        return { nonAc: 20, ac: 20 };
      }
      
      // Base on seats
      if (seatsCount === 13) return { nonAc: 22, ac: 24 };
      if (seatsCount === 17) return { nonAc: 23, ac: 26 };
      if (seatsCount === 20) return { nonAc: 24, ac: 27 };
      if (seatsCount === 26) return { nonAc: 30, ac: 32 };
      if (seatsCount === 35 || seatsCount === 37) return { nonAc: 38, ac: 45 };
      if (seatsCount === 40) return { nonAc: 44, ac: 50 };
      if (seatsCount === 45) return { nonAc: 46, ac: 52 };
      if (seatsCount === 49) return { nonAc: 48, ac: 56 };

      // Fallback map by seat range
      if (seatsCount <= 5) return { nonAc: 14, ac: 14 }; // Sedan
      if (seatsCount <= 7) return { nonAc: 20, ac: 20 }; // Innova
      if (seatsCount <= 13) return { nonAc: 22, ac: 24 };
      if (seatsCount <= 17) return { nonAc: 23, ac: 26 };
      if (seatsCount <= 20) return { nonAc: 24, ac: 27 };
      if (seatsCount <= 26) return { nonAc: 30, ac: 32 };
      if (seatsCount <= 37) return { nonAc: 38, ac: 45 };
      if (seatsCount <= 40) return { nonAc: 44, ac: 50 };
      if (seatsCount <= 45) return { nonAc: 46, ac: 52 };
      return { nonAc: 48, ac: 56 }; // 49+ Seater
    };

    const vehiclesToSeed = rawVehicles.map((vh) => {
      const seatsCount = parseSeats(vh.seats);
      const vehicleType = determineVehicleType(seatsCount, vh.name);
      const fuelType = determineFuelType(vh);

      const mainImage = vh.image || (vh.gallery && vh.gallery[0]) || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&fit=crop';
      const basePricing = getDefaultPricing(vh.name, seatsCount);

      const specs = {
        capacity: vh.specifications?.capacity || `${seatsCount} Passengers + 1 Driver`,
        luggage: vh.specifications?.luggage || 'Varies by occupancy',
        engine: vh.specifications?.engine || 'Standard Diesel / Petrol',
        comfort: vh.specifications?.comfort || 'Pushback Comfortable Seats',
        airConditioning: vh.ac !== false ? 'Dual AC Climate Control Vents' : 'Non-AC / Heater Option'
      };

      return {
        name: vh.name.trim(),
        slug: vh.slug.toLowerCase().trim(),
        image: mainImage,
        seats: seatsCount,
        type: vehicleType,
        ac: vh.ac !== false,
        registrationNumber: '',
        fuelType,
        gallery: vh.gallery || [],
        amenities: vh.amenities || [],
        specifications: specs,
        cabinDescription: vh.description || `This vehicle features ${seatsCount} seats configured in an optimized layout to allow max legroom and ease of movement. Headrests are adjustable, and secondary rows contain reclining options for long distance highway travel.`,
        pricing: {
          type: 'per_km',
          ac: basePricing.ac,
          nonAc: basePricing.nonAc,
          label: 'Per KM',
          description: 'Rates are variable based on duration, route, and seasons. Contact us for the best quote guarantee.',
          minimumKm: 300,
          driverAllowance: 500,
          tollIncluded: false,
          parkingIncluded: false
        },
        status: 'Available',
        active: true,
        description: vh.description || `${vh.name} rental vehicle`
      };
    });

    // Insert vehicles
    await Vehicle.create(vehiclesToSeed);
    console.log(`-> Seeded ${vehiclesToSeed.length} vehicles successfully!`);

    // 4. Seed Testimonials
    console.log('Seeding Testimonials...');
    const testimonialsCount = await Testimonial.countDocuments();
    if (testimonialsCount > 0) {
      console.log('-> Testimonials collection is not empty. Skipping testimonials seeding.');
    } else {
      const testimonialsToSeed = [
        {
          name: 'Rajesh Sharma',
          rating: 5,
          review: 'Excellent service! The Innova was clean and the driver was extremely polite and professional. Highly recommended for family trips.'
        },
        {
          name: 'Priya Patel',
          rating: 5,
          review: 'Booked a tempo traveller for our corporate weekend trip to Lonavala. Smooth booking process, punctual driver, and comfortable seating.'
        },
        {
          name: 'Amit Deshmukh',
          rating: 4,
          review: 'Very reliable tours and travels service. We went to Shirdi and the travel was comfortable. Reasonable prices as well.'
        }
      ];

      await Testimonial.create(testimonialsToSeed);
      console.log(`-> Seeded ${testimonialsToSeed.length} testimonials successfully!`);
    }

    console.log('Database Seeding Completed Successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL: Database seeding failed with error:', error);
    process.exit(1);
  }
};

// Execute seeder after connecting to MongoDB
const startSeeder = async () => {
  await connectDB();
  
  // Ensure the connection is fully open before running the seeder
  if (mongoose.connection.readyState !== 1) {
    console.log('Waiting for MongoDB connection to be active...');
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
    });
  }
  
  await runSeeder();
};

startSeeder();
