import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://renukatravels9_db_user:Renuka1234@renuka-tours-cluster.zxcnfsy.mongodb.net/renuka_tours?retryWrites=true&w=majority&appName=renuka-tours-cluster";

const packageSchema = new mongoose.Schema({
  title: String,
  slug: String,
  gallery: [
    {
      image: String,
      title: String
    }
  ]
}, { collection: 'packages' });

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB!");
    
    const Package = mongoose.model('Package', packageSchema);
    const packages = await Package.find({}, 'title slug gallery');
    
    console.log("Seeded/Stored Packages Gallery Data:");
    console.log(JSON.stringify(packages, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
