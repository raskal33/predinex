#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directories and files to exclude
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.vercel',
];

const EXCLUDE_FILES = [
  'package-lock.json',
  'replace-bitr-stt.js', // Don't process this script itself
];

// File extensions to process
const INCLUDE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.html',
  '.css',
  '.scss',
  '.sol', // Include Solidity files too
];

// Replacement mappings
const REPLACEMENTS = [
  // BITR → PRIX (case-sensitive)
  { from: /BITR/g, to: 'PRIX' },
  { from: /bitr/g, to: 'prix' },
  { from: /Bitr/g, to: 'Prix' },
  { from: /BiTr/g, to: 'PrIx' },
  { from: /bItR/g, to: 'pRiX' },
  
  // STT → BNB (case-sensitive)
  { from: /STT/g, to: 'BNB' },
  { from: /stt/g, to: 'bnb' },
  { from: /Stt/g, to: 'Bnb' },
  { from: /StT/g, to: 'BnB' },
  { from: /sTt/g, to: 'bNb' },
  
  // Special cases for variable names and properties
  { from: /usesBitr/g, to: 'usesPrix' },
  { from: /usesSTT/g, to: 'usesBNB' },
  { from: /usesStt/g, to: 'usesBnb' },
  { from: /bitrToken/g, to: 'prixToken' },
  { from: /bitrVolume/g, to: 'prixVolume' },
  { from: /sttVolume/g, to: 'bnbVolume' },
  { from: /bitrAmount/g, to: 'prixAmount' },
  { from: /sttAmount/g, to: 'bnbAmount' },
  { from: /bitrStakers/g, to: 'prixStakers' },
  { from: /sttStakers/g, to: 'bnbStakers' },
  { from: /totalCollectedBITR/g, to: 'totalCollectedPRIX' },
  { from: /totalCollectedSTT/g, to: 'totalCollectedBNB' },
  { from: /minPoolStakeBITR/g, to: 'minPoolStakePRIX' },
  { from: /minPoolStakeSTT/g, to: 'minPoolStakeBNB' },
  { from: /creationFeeBITR/g, to: 'creationFeePRIX' },
  { from: /creationFeeSTT/g, to: 'creationFeeBNB' },
  { from: /minValueBITR/g, to: 'minValuePRIX' },
  { from: /minValueSTT/g, to: 'minValueBNB' },
  { from: /totalVolumeBITR/g, to: 'totalVolumePRIX' },
  { from: /totalVolumeSTT/g, to: 'totalVolumeBNB' },
  { from: /bitrBoostFees/g, to: 'prixBoostFees' },
  { from: /poolUsesBitr/g, to: 'poolUsesPrix' },
  { from: /_poolUsesBitr/g, to: '_poolUsesPrix' },
  { from: /IBitredict/g, to: 'IPredinex' },
  { from: /BitredictToken/g, to: 'PredinexToken' },
  { from: /BitredictPool/g, to: 'PredinexPool' },
  { from: /BitredictStaking/g, to: 'PredinexStaking' },
  { from: /BitredictBoostSystem/g, to: 'PredinexBoostSystem' },
  { from: /BitredictPoolCore/g, to: 'PredinexPoolCore' },
  { from: /bitredictPool/g, to: 'predinexPool' },
  { from: /bitredict-backend/g, to: 'predinex-backend' },
  { from: /BitRedict/g, to: 'Predinex' },
  { from: /bitredict/g, to: 'predinex' },
  { from: /Bitredictor/g, to: 'Predinex' },
  { from: /bitredictor/g, to: 'predinex' },
];

let filesProcessed = 0;
let filesModified = 0;
let totalReplacements = 0;

function shouldProcessFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  // Check if file should be excluded
  if (EXCLUDE_FILES.includes(fileName)) {
    return false;
  }
  
  // Check if extension should be included
  if (INCLUDE_EXTENSIONS.length > 0 && !INCLUDE_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  return true;
}

function shouldProcessDir(dirPath) {
  const dirName = path.basename(dirPath);
  return !EXCLUDE_DIRS.includes(dirName);
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let fileReplacements = 0;
    
    REPLACEMENTS.forEach(({ from, to }) => {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        modified = true;
        fileReplacements += matches.length;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      filesModified++;
      totalReplacements += fileReplacements;
      console.log(`✓ Modified: ${filePath} (${fileReplacements} replacements)`);
    }
    
    filesProcessed++;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (shouldProcessDir(fullPath)) {
          walkDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        if (shouldProcessFile(fullPath)) {
          processFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
}

// Main execution
const rootDir = process.cwd();
console.log(`Starting replacement process in: ${rootDir}\n`);

walkDirectory(rootDir);

console.log(`\n=== Summary ===`);
console.log(`Files processed: ${filesProcessed}`);
console.log(`Files modified: ${filesModified}`);
console.log(`Total replacements: ${totalReplacements}`);

