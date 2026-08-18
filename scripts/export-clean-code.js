const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist-export');
const EXPORT_FOLDER = path.join(OUTPUT_DIR, 'clean-source-code');
const ZIP_PATH = path.join(OUTPUT_DIR, 'apex-printing-clean-code.zip');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'venv',
  '.venv',
  '.git',
  '.expo',
  '.vercel',
  'dist-export',
  'clean-build',
  'dist',
  'build',
  '__pycache__'
]);

const EXCLUDED_EXACT_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.DS_Store',
  'Thumbs.db'
]);

function isExcluded(filePath, relativePath) {
  const baseName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Strict Exclusion: Exclude ALL .md files (*.md)
  if (ext === '.md') {
    return true;
  }

  // Exclude sensitive .env files except .env.example
  if (baseName.startsWith('.env') && baseName !== '.env.example') {
    return true;
  }

  if (EXCLUDED_EXACT_FILES.has(baseName)) {
    return true;
  }

  return false;
}

function copyCleanDirectory(srcDir, destDir) {
  let count = 0;
  let skipped = 0;

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        skipped++;
        continue;
      }
      const res = copyCleanDirectory(srcPath, destPath);
      count += res.count;
      skipped += res.skipped;
    } else if (entry.isFile()) {
      if (isExcluded(srcPath, entry.name)) {
        skipped++;
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }

  return { count, skipped };
}

console.log('====================================================');
console.log('  APEX PRINTING - CLEAN SOURCE CODE EXPORTER');
console.log('====================================================');
console.log(`Source Directory : ${ROOT_DIR}`);
console.log(`Export Output    : ${OUTPUT_DIR}`);
console.log('----------------------------------------------------');

// Clean previous export folder
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(EXPORT_FOLDER, { recursive: true });

// Copy clean files
const { count, skipped } = copyCleanDirectory(ROOT_DIR, EXPORT_FOLDER);

// Create ZIP archive using python export_clean script or PowerShell fallback
let zipCreated = false;
try {
  const pyScriptPath = path.join(ROOT_DIR, 'export_clean.py');
  if (fs.existsSync(pyScriptPath)) {
    execSync(`python "${pyScriptPath}"`, { stdio: 'ignore' });
    zipCreated = fs.existsSync(ZIP_PATH);
  }
} catch (err) {
  // Fallback to powershell Compress-Archive on Windows
  try {
    execSync(`powershell -Command "Compress-Archive -Path '${EXPORT_FOLDER}\\*' -DestinationPath '${ZIP_PATH}' -Force"`);
    zipCreated = fs.existsSync(ZIP_PATH);
  } catch (psErr) {
    console.warn('Note: Zip compression fallback notice:', psErr.message);
  }
}

const zipSize = zipCreated && fs.existsSync(ZIP_PATH) 
  ? (fs.statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2) + ' MB'
  : 'N/A';

console.log('\nEXPORT SUMMARY:');
console.log(`  - Clean Files Copied  : ${count}`);
console.log(`  - Excluded Items      : ${skipped} (.md files, node_modules, .env, etc.)`);
console.log(`  - Clean Folder Path   : ${EXPORT_FOLDER}`);
if (zipCreated) {
  console.log(`  - ZIP Archive Path    : ${ZIP_PATH} (${zipSize})`);
}
console.log('\n[SUCCESS] Clean source code export completed successfully!');
console.log('====================================================');
