// Simple frontend logger that respects production environment
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    console.warn(...args); // Always show warnings
  },
  
  error: (...args: any[]) => {
    console.error(...args); // Always show errors
  },
  
  // Special method for important production logs
  production: (...args: any[]) => {
    console.log(...args); // Always log these
  }
};