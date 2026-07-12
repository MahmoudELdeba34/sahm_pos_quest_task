import mongoose from 'mongoose';

export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI is missing. Set it in backend/.env (MongoDB Atlas connection string).',
    );
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('[gourmetos-api] connected to MongoDB');
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
