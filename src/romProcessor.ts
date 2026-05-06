import * as path from "path";
import * as fs from "fs-extra";
import {
  SystemInfo,
  RomProcessingResult,
  GameEntry,
  ScreenscraperMedia,
} from "./types";
import { GameListHandler } from "./gameListHandler";
import { ScreenscraperClient } from "./screenscraperClient";
import { ImageDownloader } from "./imageDownloader";
import { Logger } from "./logger";
import { findLocalImage, getRomNameWithoutExt } from "./imageFinder";
import { IMAGE_TYPES } from "./constants";

export class RomProcessor {
  private gameListHandler: GameListHandler;
  private screenscraperClient: ScreenscraperClient | null;
  private imageDownloader: ImageDownloader;
  private logger: Logger;
  private system?: SystemInfo;

  constructor(
    gameListHandler: GameListHandler,
    screenscraperClient: ScreenscraperClient | null,
    imageDownloader: ImageDownloader,
    logger: Logger,
    system?: SystemInfo,
  ) {
    this.gameListHandler = gameListHandler;
    this.screenscraperClient = screenscraperClient;
    this.imageDownloader = imageDownloader;
    this.logger = logger;
    this.system = system;
  }

  async processRom(
    romPath: string,
    imagesDir: string,
  ): Promise<RomProcessingResult> {
    const romFileName = path.basename(romPath);
    const romRelativePath = `./${romFileName}`;
    this.logger.log(`Processing ROM: ${romFileName}`);

    const entries = await this.gameListHandler.load();
    let entry = this.gameListHandler.findEntryByPath(entries, romRelativePath);

    if (entry) {
      // Kiểm tra xem đã có đủ ảnh chưa
      const missingTypes: string[] = [];
      for (const type of IMAGE_TYPES) {
        const imgPath = entry[type] as string | undefined;
        if (
          !imgPath ||
          !(await fs.pathExists(path.resolve(path.dirname(romPath), imgPath)))
        ) {
          missingTypes.push(type);
        }
      }
      if (missingTypes.length === 0) {
        this.logger.log(`ROM already complete. Skipping.`);
        return {
          romPath: romFileName,
          action: "skipped",
          missingImages: [],
          details: "Already complete",
        };
      }
      // Thiếu ảnh, xử lý tiếp
      return this.updateMissingImages(
        romPath,
        imagesDir,
        entries,
        entry,
        missingTypes,
      );
    } else {
      // Thêm mới
      const newEntry: GameEntry = { path: romRelativePath };
      const allTypesMissing = [...IMAGE_TYPES];
      return this.updateMissingImages(
        romPath,
        imagesDir,
        entries,
        newEntry,
        allTypesMissing,
        true,
      );
    }
  }

  private async updateMissingImages(
    romPath: string,
    imagesDir: string,
    entries: GameEntry[],
    entry: GameEntry,
    missingTypes: string[],
    isNewEntry: boolean = false,
  ): Promise<RomProcessingResult> {
    const romFileName = path.basename(romPath);
    const romNameNoExt = getRomNameWithoutExt(romFileName);
    let fromLocal = 0;
    let fromScraper = 0;
    const stillMissing: string[] = [];

    for (const type of missingTypes) {
      // 1. Tìm local
      const localPath = await findLocalImage(romNameNoExt, type, imagesDir);
      if (localPath) {
        entry[type] = localPath;
        fromLocal++;
        this.logger.log(`Found local ${type} for ${romFileName}`);
        continue;
      }

      // 2. Tìm qua Screenscraper
      if (!this.screenscraperClient) {
        this.logger.log(
          `No Screenscraper credentials, cannot search online for ${type}`,
        );
        stillMissing.push(type);
        continue;
      }

      if (!this.system) {
        this.logger.log(`System info missing, cannot search Screenscraper`);
        stillMissing.push(type);
        continue;
      }

      const medias = await this.screenscraperClient.getMedia(
        romPath,
        this.system,
      );
      const selectedMedia = this.selectMedia(medias, type);
      if (selectedMedia) {
        const ext =
          selectedMedia.format ||
          path.extname(new URL(selectedMedia.url).pathname) ||
          ".png";
        const destFileName = `${romNameNoExt} - ${type}${ext}`;
        const destPath = path.join(imagesDir, destFileName);
        const success = await this.imageDownloader.download(
          selectedMedia.url,
          destPath,
        );
        if (success) {
          entry[type] = `./images/${destFileName}`;
          fromScraper++;
          this.logger.log(
            `Downloaded ${type} from Screenscraper for ${romFileName}`,
          );
          continue;
        }
      }
      // Không tìm thấy
      stillMissing.push(type);
      this.logger.log(`Could not find ${type} for ${romFileName}`);
    }

    // Cập nhật entry
    entries = await this.gameListHandler.addOrUpdate(entries, entry);
    await this.gameListHandler.save(entries);

    const action = isNewEntry ? "added" : "updated_images";
    const details = `Local: ${fromLocal}, Scraper: ${fromScraper}, Missing: ${stillMissing.join(",")}`;
    this.logger.log(`Result for ${romFileName}: ${action} - ${details}`);

    return {
      romPath: romFileName,
      action,
      missingImages: stillMissing,
      details,
    };
  }

  private selectMedia(
    medias: ScreenscraperMedia[],
    type: string,
  ): ScreenscraperMedia | undefined {
    // Xác định loại media tương ứng
    let mediaTypes: string[];
    if (type === "image") {
      mediaTypes = ["box-2D", "box-3D"];
    } else if (type === "thumbnail") {
      mediaTypes = ["ss"];
    } else if (type === "marquee") {
      mediaTypes = ["wheel"];
    } else {
      return undefined;
    }

    // Filter medias theo type và region ưu tiên US > World > khác
    const matching = medias.filter((m) => mediaTypes.includes(m.type));
    if (matching.length === 0) return undefined;

    // Sort: region 'us' > 'wor' > others
    const regionOrder = ["us", "wor"];
    matching.sort((a, b) => {
      const aIdx = regionOrder.indexOf(a.region.toLowerCase());
      const bIdx = regionOrder.indexOf(b.region.toLowerCase());
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    // Ưu tiên box-2D nếu có (đã lọc type)
    if (type === "image") {
      const box2D = matching.find((m) => m.type === "box-2D");
      return box2D || matching[0];
    }

    return matching[0];
  }
}
