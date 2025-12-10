import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private logDir: string;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;
  private isProduction: boolean;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(level: LogLevel): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${level.toLowerCase()}-${date}.log`);
  }

  private rotateLogs(filePath: string) {
    if (!fs.existsSync(filePath)) return;

    const stats = fs.statSync(filePath);
    if (stats.size < this.maxLogSize) return;

    // Rotate logs
    for (let i = this.maxLogFiles - 1; i >= 1; i--) {
      const oldFile = `${filePath}.${i}`;
      const newFile = `${filePath}.${i + 1}`;
      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile);
      }
    }

    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, `${filePath}.1`);
    }
  }

  private writeLog(level: LogLevel, message: string, metadata?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata,
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const logFile = this.getLogFileName(level);

    this.rotateLogs(logFile);
    fs.appendFileSync(logFile, logLine);

    // Also output to console
    const consoleMessage = `[${timestamp}] [${level}] ${message}`;
    if (level === LogLevel.ERROR) {
      console.error(consoleMessage, metadata || '');
    } else if (level === LogLevel.WARN) {
      console.warn(consoleMessage, metadata || '');
    } else {
      console.log(consoleMessage, metadata || '');
    }
  }

  debug(message: string, metadata?: any) {
    // Skip debug logs in production
    if (!this.isProduction) {
      this.writeLog(LogLevel.DEBUG, message, metadata);
    }
  }

  info(message: string, metadata?: any) {
    // Reduce info logs in production - only log important info
    if (!this.isProduction || this.isImportantInfo(message)) {
      this.writeLog(LogLevel.INFO, message, metadata);
    }
  }

  private isImportantInfo(message: string): boolean {
    const importantKeywords = ['started', 'stopped', 'settled', 'error', 'failed', 'success'];
    return importantKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  warn(message: string, metadata?: any) {
    this.writeLog(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: any) {
    this.writeLog(LogLevel.ERROR, message, metadata);
  }

  // Transaction logging
  logTransaction(signature: string, type: string, success: boolean, error?: string) {
    this.info('Transaction', {
      signature,
      type,
      success,
      error,
    });
  }

  // Event logging
  logEvent(eventType: string, data: any) {
    this.info('Event', {
      eventType,
      ...data,
    });
  }

  // Performance logging
  logPerformance(operation: string, duration: number, metadata?: any) {
    this.debug('Performance', {
      operation,
      duration,
      ...metadata,
    });
  }
}

export const logger = new Logger();
