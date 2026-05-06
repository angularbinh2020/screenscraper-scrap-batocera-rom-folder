export interface GameEntry {
  path: string;
  image?: string;
  thumbnail?: string;
  marquee?: string;
  [key: string]: any;
}

export interface SystemInfo {
  name: string; // tên hiển thị như trong Batocera
  systemeid: number; // ID hệ máy của Screenscraper
  extensions: string[]; // các đuôi file ROM
}

export interface ScreenscraperMedia {
  type: string;
  region: string;
  url: string;
  format: string;
}

export interface RomProcessingResult {
  romPath: string;
  action: "skipped" | "added" | "updated_images" | "partial";
  missingImages: string[];
  details: string;
}

export interface ProcessingReport {
  total: number;
  processed: number;
  skipped: number;
  missingImagesCount: number;
  listMissing: string[];
}
