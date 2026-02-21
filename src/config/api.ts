// API Configuration
// This file provides the API base URL for the application
import { config } from './environment';

// Use the MySQL-backed API server URL
export const API_BASE_URL = config.api.baseUrl;

