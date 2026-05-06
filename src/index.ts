#!/usr/bin/env node
import * as path from "path";
import * as fs from "fs-extra";
import minimist from "minimist";
import { SYSTEM_MAP, DEFAULT_DELAY_MS, IGNORE_EXTENSIONS } from "./constants";
import { Logger } from "./logger";
import { GameListHandler } from "./gameListHandler";
import { ScreenscraperClient } from "./screenscraperClient";
import { ImageDownloader } from "./imageDownloader";
import { RomProcessor } from "./romProcessor";
import { SystemInfo, RomProcessingResult, ProcessingReport } from "./types";

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["system", "log-file", "report-file", "devid", "devpassword"],
    default: {
      delay: DEFAULT_DELAY_MS,
      "log-file": "process.log",
      "report-file": "report.txt",
    },
  });
  const delay = Number(argv.delay) || DEFAULT_DELAY_MS;
  const romDir = argv._[0];
  if (!romDir) {
    console.error(
      'Usage: node dist/index.js <rom-directory> [--system "System Name"] [--delay ms]',
    );
    process.exit(1);
  }

  const absRomDir = path.resolve(romDir);
  const imagesDir = path.join(absRomDir, "images");

  // Logger
  const logFilePath = path.resolve(absRomDir, argv["log-file"]);
  const logger = new Logger(logFilePath);
  logger.log("Starting ROM processing...");
  logger.log(`ROM directory: ${absRomDir}`);

  // Xác định hệ máy
  let system: SystemInfo | undefined;
  if (argv.system) {
    system = SYSTEM_MAP.find((s) => s.name === argv.system);
    if (!system) {
      logger.log(
        `Warning: Unknown system "${argv.system}". Will try to guess from files.`,
      );
    }
  }

  // Lấy danh sách file ROM
  const allFiles = await fs.readdir(absRomDir);
  let romFiles: string[] = [];

  if (system) {
    // Lọc theo extensions
    const exts = system.extensions;
    romFiles = allFiles.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return (
        exts.includes(ext) &&
        !f.startsWith(".") &&
        f !== "images" &&
        !IGNORE_EXTENSIONS.includes(ext)
      );
    });
  } else {
    // Chưa có system, tạm lấy tất cả file không phải thư mục và không phải gamelist.xml
    for (const f of allFiles) {
      const fPath = path.join(absRomDir, f);
      const stat = await fs.stat(fPath);
      if (stat.isFile() && f !== "gamelist.xml") {
        const ext = path.extname(f).toLowerCase();
        if (!IGNORE_EXTENSIONS.includes(ext)) {
          romFiles.push(f);
        }
      }
    }
    // Thử suy đoán hệ máy từ file đầu tiên
    if (romFiles.length > 0) {
      const firstExt = path.extname(romFiles[0]).toLowerCase();
      const guessedSystem = SYSTEM_MAP.find((s) =>
        s.extensions.includes(firstExt),
      );
      if (guessedSystem) {
        system = guessedSystem;
        logger.log(`Guessed system: ${system.name} from extension ${firstExt}`);
      } else {
        logger.log(
          `Could not guess system from files. Screenscraper will be disabled.`,
        );
      }
    }
  }

  if (romFiles.length === 0) {
    logger.log("No ROM files found. Exiting.");
    process.exit(0);
  }

  // Screenscraper client
  const devid = process.env.SCREENSCRAPER_DEVID || "";
  const devpassword = process.env.SCREENSCRAPER_DEVPASSWORD || "";
  let scraperClient: ScreenscraperClient | null = null;
  if (devid && devpassword) {
    scraperClient = new ScreenscraperClient(devid, devpassword, delay, logger);
    logger.log("Screenscraper credentials loaded.");
  } else {
    logger.log(
      "Screenscraper credentials not set. Will only use local images.",
    );
  }

  // Khởi tạo các handler
  const gameListHandler = new GameListHandler(absRomDir, logger);
  const imageDownloader = new ImageDownloader(logger);
  const romProcessor = new RomProcessor(
    gameListHandler,
    scraperClient,
    imageDownloader,
    logger,
    system,
  );

  // Xử lý từng ROM
  const results: RomProcessingResult[] = [];
  for (const romFile of romFiles) {
    const romIndex = romFiles.indexOf(romFile);
    logger.log(
      `Process ${romIndex + 1}/${romFiles.length} (${Math.round(((romIndex + 1) / romFiles.length) * 100)}%)`,
    );
    const romPath = path.join(absRomDir, romFile);
    const result = await romProcessor.processRom(romPath, imagesDir);
    results.push(result);
  }

  // Tổng hợp báo cáo
  const report: ProcessingReport = {
    total: results.length,
    processed: results.filter((r) => r.action !== "skipped").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    missingImagesCount: results.filter((r) => r.missingImages.length > 0)
      .length,
    listMissing: results
      .filter((r) => r.missingImages.length > 0)
      .map((r) => `${r.romPath} (missing: ${r.missingImages.join(", ")})`),
  };

  logger.log("===== FINAL REPORT =====");
  logger.log(`Total ROM files: ${report.total}`);
  logger.log(`Processed (added/updated): ${report.processed}`);
  logger.log(`Skipped (already complete): ${report.skipped}`);
  logger.log(`Missing some images: ${report.missingImagesCount}`);
  if (report.listMissing.length > 0) {
    logger.log("List of incomplete ROMs:");
    report.listMissing.forEach((line) => logger.log(line));
  }

  // Ghi file báo cáo riêng
  const reportFilePath = path.resolve(absRomDir, argv["report-file"]);
  let reportContent = `Processing Report\n`;
  reportContent += `Total ROMs: ${report.total}\n`;
  reportContent += `Processed: ${report.processed}\n`;
  reportContent += `Skipped: ${report.skipped}\n`;
  reportContent += `Missing images: ${report.missingImagesCount}\n`;
  if (report.listMissing.length > 0) {
    reportContent +=
      `\nIncomplete ROMs:\n` + report.listMissing.join("\n") + "\n";
  }
  await fs.writeFile(reportFilePath, reportContent, "utf-8");
  logger.log(`Report saved to ${reportFilePath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
