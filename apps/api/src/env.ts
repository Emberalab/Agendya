import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from the api directory
config({ path: resolve(__dirname, '../.env') });
