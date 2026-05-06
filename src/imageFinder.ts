import * as path from 'path';
import * as fs from 'fs-extra';
import { IMAGE_TYPES, IMAGE_EXTENSIONS } from './constants';

export async function findLocalImage(
  romNameNoExt: string,
  type: string,
  imagesDir: string
): Promise<string | null> {
  for (const ext of IMAGE_EXTENSIONS) {
    const fileName = `${romNameNoExt} - ${type}${ext}`;
    const filePath = path.join(imagesDir, fileName);
    if (await fs.pathExists(filePath)) {
      return `./images/${fileName}`;
    }
  }
  return null;
}

export function getRomNameWithoutExt(romFileName: string): string {
  // Bỏ phần mở rộng cuối cùng (ví dụ .sfc)
  const lastDot = romFileName.lastIndexOf('.');
  return lastDot > 0 ? romFileName.substring(0, lastDot) : romFileName;
}