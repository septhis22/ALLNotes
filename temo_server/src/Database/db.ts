import { Pool } from '../../node_modules/@types/pg';

// Your connection configuration
const connectionConfig = {
  user: 'postgres.chshfxzxdtdyyzcnnusr',
  password: 'harsh@1290', // Replace with your actual password
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false } // Often needed for Supabase connections
};

// Create a new pool instance
 export const pool = new Pool(connectionConfig);

// Example function to test the connection
export default pool;