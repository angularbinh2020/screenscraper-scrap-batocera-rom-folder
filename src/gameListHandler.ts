import * as fs from 'fs-extra';
import * as path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { GameEntry } from './types';
import { Logger } from './logger';

export class GameListHandler {
  private filePath: string;
  private logger: Logger;
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor(romDir: string, logger: Logger) {
    this.filePath = path.join(romDir, 'gamelist.xml');
    this.logger = logger;
    this.parser = new XMLParser({ ignoreAttributes: false });
    this.builder = new XMLBuilder({ format: true, ignoreAttributes: false });
  }

  async load(): Promise<GameEntry[]> {
    if (!(await fs.pathExists(this.filePath))) {
      this.logger.log(`gamelist.xml not found, creating new one.`);
      return [];
    }
    const xml = await fs.readFile(this.filePath, 'utf-8');
    const parsed = this.parser.parse(xml);
    const gameList = parsed.gameList?.game;
    if (!gameList) return [];
    // Luôn trả về mảng, kể cả khi chỉ có 1 phần tử
    return Array.isArray(gameList) ? gameList : [gameList];
  }

  async save(entries: GameEntry[]) {
    const xmlObj = {
      '?xml': { '@_version': '1.0' },
      gameList: {
        game: entries
      }
    };
    const xml = this.builder.build(xmlObj);
    await fs.writeFile(this.filePath, xml, 'utf-8');
    this.logger.log(`Saved gamelist.xml`);
  }

  findEntryByPath(entries: GameEntry[], romRelativePath: string): GameEntry | undefined {
    return entries.find(e => e.path === romRelativePath);
  }

  async addOrUpdate(entries: GameEntry[], newEntry: GameEntry): Promise<GameEntry[]> {
    const index = entries.findIndex(e => e.path === newEntry.path);
    if (index >= 0) {
      entries[index] = { ...entries[index], ...newEntry };
    } else {
      entries.push(newEntry);
    }
    return entries;
  }
}