const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('Error: MONGO_URL is not defined in the environment variables.');
      process.exit(1);
    }

    // Connect to MongoDB using Mongoose
    const conn = await mongoose.connect(mongoUrl, {
      dbName: 'invoicing', // Specify the database name explicitly
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
