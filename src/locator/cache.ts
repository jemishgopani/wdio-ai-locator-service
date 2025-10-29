import fs from 'fs';
import path from 'path';
import { LocatorResult } from '../types';
import { log } from '../utils/logger';

export class LocatorCache {
  filePath: string;
  store: Record<string, LocatorResult> = {};

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), '.wdio-ai-locator-cache.json');
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.store = JSON.parse(raw);
      }
    } catch (err) {
      log('LocatorCache load error', err);
    }
  }

  get(key: string): LocatorResult | undefined {
    return this.store[key];
  }

  set(key: string, value: LocatorResult) {
    this.store[key] = value;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.store, null, 2));
    } catch (err) {
      log('LocatorCache write error', err);
    }
  }
}
