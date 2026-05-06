import axios, { AxiosInstance } from "axios";
import * as crypto from "crypto";
import * as fs from "fs-extra";
import { SystemInfo, ScreenscraperMedia } from "./types";
import { Logger } from "./logger";
import path from "path";

export class ScreenscraperClient {
  private devid: string;
  private devpassword: string;
  private delayMs: number;
  private axios: AxiosInstance;
  private logger: Logger;

  constructor(
    devid: string,
    devpassword: string,
    delayMs: number,
    logger: Logger,
  ) {
    this.devid = devid;
    this.devpassword = devpassword;
    this.delayMs = delayMs;
    this.axios = axios.create({
      baseURL: "https://www.screenscraper.fr/api2/",
      timeout: 15000,
    });
    this.logger = logger;
  }

  async getMedia(
    romFilePath: string,
    system: SystemInfo,
  ): Promise<ScreenscraperMedia[]> {
    // Tính MD5
    const md5 = await this.computeMD5(romFilePath);
    const romName = path.basename(romFilePath);
    const stats = await fs.stat(romFilePath);
    const romSize = stats.size;

    // Delay
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    try {
      const response = await this.axios.get("jeuInfos.php", {
        params: {
          devid: this.devid,
          devpassword: this.devpassword,
          softname: "BatoceraRomProcessor",
          output: "json",
          romnom: romName,
          romtaille: romSize,
          rommd5: md5,
          systemeid: system.systemeid,
        },
      });

      const data = response.data;
      if (!data?.response?.jeu) {
        this.logger.log(`No game found on Screenscraper for ${romName}`);
        return [];
      }

      const medias = data.response.jeu.medias || [];
      const result: ScreenscraperMedia[] = medias.map((m: any) => ({
        type: m.type,
        region: m.region,
        url: m.url,
        format: m.format ? "." + m.format : "",
      }));
      return result;
    } catch (error) {
      this.logger.error(`Screenscraper API error for ${romName}: ${error}`);
      return [];
    }
  }

  private async computeMD5(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash("md5").update(buffer).digest("hex");
  }
}
