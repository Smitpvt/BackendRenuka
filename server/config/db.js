import mongoose from 'mongoose';

const connectDB = async () => {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  const options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(dbUri, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected! Attempting auto-reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully!');
});

mongoose.connection.on('error', (err) => {
  console.error(`Mongoose Connection Event Error: ${err.message}`);
});

export default connectDB;
