import axios from "axios";
import * as path from "path";
import * as fs from "fs-extra";
import { Logger } from "./logger";

export class ImageDownloader {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async download(url: string, destPath: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
      });
      const contentType = response.headers["content-type"] || "";
      if (
        typeof contentType === "string" &&
        !contentType.startsWith("image/")
      ) {
        this.logger.error(
          `Media URL returned non-image: ${contentType}, url: ${url}`,
        );
        return false;
      }
      const mediaBuffer = Buffer.from(response.data);
      try {
        await fs.ensureDir(path.dirname(destPath));
        await fs.writeFile(destPath, mediaBuffer);
      } catch (writeError) {
        this.logger.error(`Failed to write image ${destPath}: ${writeError}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to download ${url}: ${error}`);
      return false;
    }
  }
}
