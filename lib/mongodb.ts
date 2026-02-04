import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/little-achievers';

const globalForMongo = global as unknown as { conn: typeof mongoose | null };

export const connectDB = async () => {
  if (globalForMongo.conn) {
    return globalForMongo.conn;
  }

  if (!mongoose.connection.readyState) {
    await mongoose.connect(MONGODB_URI);
  }

  globalForMongo.conn = mongoose;
  return mongoose;
};

export default connectDB;
