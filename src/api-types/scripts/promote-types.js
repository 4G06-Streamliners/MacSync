#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Team D API Types Promotion Tool');
console.log('===================================');

const overlaysDir = path.join(__dirname, '..', 'overlays');
const sharedTypesDir = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'shared', 'api-types', 'src');

function getOverlayFiles() {
  if (!fs.existsSync(overlaysDir)) {
    return [];
  }
  return fs.readdirSync(overlaysDir)
    .filter(file => file.endsWith('.ts') && file !== 'index.ts')
    .map(file => path.join(overlaysDir, file));
}

function analyzeTypes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const interfaces = content.match(/export interface \w+/g) || [];
  const types = content.match(/export type \w+/g) || [];
  const enums = content.match(/export enum \w+/g) || [];

  return {
    interfaces: interfaces.map(i => i.replace('export interface ', '')),
    types: types.map(t => t.replace('export type ', '').split(/\s|=/)[0]),
    enums: enums.map(e => e.replace('export enum ', '')),
    totalExports: interfaces.length + types.length + enums.length,
    content
  };
}

function promptUser(question) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  const overlayFiles = getOverlayFiles();

  if (overlayFiles.length === 0) {
    console.log('❌ No overlay files found to promote');
    console.log(`   Create TypeScript files in: ${path.relative(process.cwd(), overlaysDir)}`);
    return;
  }

  console.log(`\n📁 Found ${overlayFiles.length} overlay files:`);
  overlayFiles.forEach((file, i) => {
    const analysis = analyzeTypes(file);
    const exports = [];
    if (analysis.interfaces.length > 0) exports.push(`${analysis.interfaces.length} interface(s)`);
    if (analysis.types.length > 0) exports.push(`${analysis.types.length} type(s)`);
    if (analysis.enums.length > 0) exports.push(`${analysis.enums.length} enum(s)`);
    console.log(`  ${i + 1}. ${path.basename(file)} (${exports.join(', ')})`);
  });

  const choice = await promptUser('\n🤔 Which file would you like to promote? (number or "all"): ');

  let filesToPromote = [];
  if (choice === 'all') {
    filesToPromote = overlayFiles;
  } else {
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < overlayFiles.length) {
      filesToPromote = [overlayFiles[index]];
    } else {
      console.log('❌ Invalid choice');
      return;
    }
  }

  for (const file of filesToPromote) {
    const fileName = path.basename(file);
    const analysis = analyzeTypes(file);

    console.log(`\n📋 Promoting ${fileName}:`);
    if (analysis.interfaces.length > 0) {
      console.log(`   📦 Interfaces: ${analysis.interfaces.join(', ')}`);
    }
    if (analysis.types.length > 0) {
      console.log(`   🏷️  Types: ${analysis.types.join(', ')}`);
    }
    if (analysis.enums.length > 0) {
      console.log(`   🔢 Enums: ${analysis.enums.join(', ')}`);
    }

    const proceed = await promptUser(`   ✅ Proceed with promotion? (y/n): `);

    if (proceed === 'y' || proceed === 'yes') {
      // Use the same filename (no renaming)
      const targetPath = path.join(sharedTypesDir, fileName);

      try {
        // Check if file already exists
        if (fs.existsSync(targetPath)) {
          console.log(`   ⚠️  Warning: ${fileName} already exists in shared/api-types/src/`);
          const overwrite = await promptUser(`   🤔 Overwrite existing file? (y/n): `);
          if (overwrite !== 'y' && overwrite !== 'yes') {
            console.log(`   ⏭️  Skipped ${fileName}`);
            continue;
          }
        }

        // Copy file to shared directory
        fs.copyFileSync(file, targetPath);
        console.log(`   ✅ Copied to ${path.relative(process.cwd(), targetPath)}`);

        // Update shared API types index.ts
        console.log('   🔄 Updating shared API types index...');
        const indexPath = path.join(sharedTypesDir, 'index.ts');
        let indexContent = '';
        if (fs.existsSync(indexPath)) {
          indexContent = fs.readFileSync(indexPath, 'utf8');
        }

        const exportName = path.basename(targetPath, '.ts');
        const exportStatement = `export * from './${exportName}';`;

        if (!indexContent.includes(exportStatement)) {
          // Ensure the file ends with a newline before appending
          if (indexContent.length > 0 && !indexContent.endsWith('\n')) {
            fs.appendFileSync(indexPath, '\n');
          }
          fs.appendFileSync(indexPath, exportStatement + '\n');
          console.log(`   ✅ Added export to index.ts`);
        } else {
          console.log(`   ℹ️  Export already exists in index.ts`);
        }

        console.log('   🎉 Types promoted successfully!');
        console.log('   💡 Remember to:');
        console.log('      1. Build shared packages: pnpm build:shared');
        console.log('      2. Update team code to import from @large-event/api-types');
        console.log('      3. Remove or update the overlay file if no longer needed');
        console.log('      4. Test type imports across teams');

      } catch (error) {
        console.error(`   ❌ Failed to promote ${fileName}:`, error.message);
      }
    } else {
      console.log(`   ⏭️  Skipped ${fileName}`);
    }
  }

  console.log('\n🎯 Promotion process completed!');
}

main().catch(console.error);
