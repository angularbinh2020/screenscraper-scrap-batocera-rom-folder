import * as fs from 'fs-extra';
import * as path from 'path';

export class Logger {
  private logFilePath: string;

  constructor(logFile: string) {
    this.logFilePath = logFile;
    fs.ensureFileSync(this.logFilePath);
  }

  log(message: string) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;
    console.log(line);
    fs.appendFileSync(this.logFilePath, line + '\n');
  }

  error(message: string) {
    this.log(`ERROR: ${message}`);
  }
}