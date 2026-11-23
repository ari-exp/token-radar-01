import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boardIssue,
  buildBoard,
  buildRadar,
  dataScript,
  parseReputationTable,
  parseSnapshot,
  type ReputationTable,
  type Snapshot,
} from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultInput = '/input/snapshot.json';
const defaultOutput = '/output';

interface Options {
  input: string;
  output: string;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { input: defaultInput, output: defaultOutput };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag !== '--input' && flag !== '--output') {
      throw new Error(`unknown argument: ${flag}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${flag} needs a path`);
    }
    options[flag === '--input' ? 'input' : 'output'] = path.resolve(value);
    index += 1;
  }
  return options;
}

function loadReputation(): ReputationTable | null {
  const file = path.join(here, 'data', 'reputation-reference.json');
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`warning: ${file} missing; using all-unknown reputation`);
      return null;
    }
    throw error;
  }
  return parseReputationTable(text);
}

function loadSnapshot(file: string): Snapshot {
  return parseSnapshot(fs.readFileSync(file, 'utf8'));
}

function copyDirectory(source: string, destination: string): void {
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function hasScreenshots(directory: string): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
  return entries.some((entry) => entry.isFile());
}

function hasDashboard(directory: string): boolean {
  return fs.existsSync(path.join(directory, 'index.html'));
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const snapshot = loadSnapshot(options.input);
  const reputation = loadReputation();
  const board = buildBoard(snapshot, reputation);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Error(`board issue: ${issue}`);
  const radar = buildRadar(snapshot, reputation);

  fs.mkdirSync(options.output, { recursive: true });
  const boardFile = path.join(options.output, 'board.json');
  const dataFile = path.join(options.output, 'data.js');
  fs.writeFileSync(boardFile, JSON.stringify({ rows: board }) + '\n');
  fs.writeFileSync(dataFile, dataScript(radar));
  copyDirectory(path.join(here, 'dashboard'), path.join(options.output, 'dashboard'));
  if (!hasDashboard(path.join(options.output, 'dashboard'))) {
    throw new Error('dashboard copy is missing index.html');
  }
  const screenshots = path.join(here, 'screenshots');
  if (!hasScreenshots(screenshots)) {
    console.error('warning: screenshots/ missing or empty; skipping dossier');
  } else {
    copyDirectory(screenshots, path.join(options.output, 'screenshots'));
  }

  const dossier = path.join(options.output, 'dossier.json');
  if (hasScreenshots(screenshots) && hasScreenshots(path.join(options.output, 'screenshots'))) {
    fs.writeFileSync(dossier, buildDossier(options.output, { text_max_bytes: 65536 }));
    console.log(`rows: ${board.length} written to ${boardFile}; data.js, dashboard/, screenshots/, dossier.json written to ${options.output}`);
  } else {
    console.log(`rows: ${board.length} written to ${boardFile}; data.js, dashboard/ written to ${options.output}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
