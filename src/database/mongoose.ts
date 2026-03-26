import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const init = () => {
    const dbOptions = {
        autoIndex: false,
        connectTimeoutMS: 10000,
    };

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is not defined in .env');
        return;
    }

    mongoose.connect(uri, dbOptions);

    mongoose.connection.on('connected', () => {
        console.log('Successfully connected to MongoDB!');
    });

    mongoose.connection.on('error', (err) => {
        console.error(`MongoDB connection error: \n${err.stack}`);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB connection lost');
    });
};
