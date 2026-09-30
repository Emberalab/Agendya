import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env file from this app's directory
config({ path: resolve(__dirname, '../.env') });
