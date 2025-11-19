#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Team D API Utilities Promotion Tool');
console.log('=======================================');

const overlaysDir = path.join(__dirname, '..', 'overlays');
const sharedApiDir = path.join(__dirname, '..', '..', '..', '..', '..', '..', 'shared', 'api', 'src');

function getOverlayFiles() {
  if (!fs.existsSync(overlaysDir)) {
    return [];
  }
  return fs.readdirSync(overlaysDir)
    .filter(file => file.endsWith('.ts') && file !== 'index.ts')
    .map(file => path.join(overlaysDir, file));
}

function analyzeUtilities(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const functions = content.match(/export (async )?function \w+/g) || [];
  const classes = content.match(/export class \w+/g) || [];
  const constants = content.match(/export const \w+/g) || [];

  return {
    functions: functions.map(f => f.replace(/export (async )?function /, '')),
    classes: classes.map(c => c.replace('export class ', '')),
    constants: constants.map(c => c.replace('export const ', '').split(/\s|:|=/)[0]),
    totalExports: functions.length + classes.length + constants.length,
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
    const analysis = analyzeUtilities(file);
    const exports = [];
    if (analysis.functions.length > 0) exports.push(`${analysis.functions.length} function(s)`);
    if (analysis.classes.length > 0) exports.push(`${analysis.classes.length} class(es)`);
    if (analysis.constants.length > 0) exports.push(`${analysis.constants.length} constant(s)`);
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
    const analysis = analyzeUtilities(file);

    console.log(`\n📋 Promoting ${fileName}:`);
    if (analysis.functions.length > 0) {
      console.log(`   ⚡ Functions: ${analysis.functions.join(', ')}`);
    }
    if (analysis.classes.length > 0) {
      console.log(`   🏛️  Classes: ${analysis.classes.join(', ')}`);
    }
    if (analysis.constants.length > 0) {
      console.log(`   📌 Constants: ${analysis.constants.join(', ')}`);
    }

    const proceed = await promptUser(`   ✅ Proceed with promotion? (y/n): `);

    if (proceed === 'y' || proceed === 'yes') {
      // Use the same filename
      const targetPath = path.join(sharedApiDir, fileName);

      try {
        // Check if file already exists
        if (fs.existsSync(targetPath)) {
          console.log(`   ⚠️  Warning: ${fileName} already exists in shared/api/src/`);
          const overwrite = await promptUser(`   🤔 Overwrite existing file? (y/n): `);
          if (overwrite !== 'y' && overwrite !== 'yes') {
            console.log(`   ⏭️  Skipped ${fileName}`);
            continue;
          }
        }

        // Copy file to shared directory
        fs.copyFileSync(file, targetPath);
        console.log(`   ✅ Copied to ${path.relative(process.cwd(), targetPath)}`);

        // Update shared API index.ts
        console.log('   🔄 Updating shared API index...');
        const indexPath = path.join(sharedApiDir, 'index.ts');
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

        console.log('   🎉 Utilities promoted successfully!');
        console.log('   💡 Remember to:');
        console.log('      1. Build shared packages: pnpm build:shared');
        console.log('      2. Update team code to import from @large-event/api');
        console.log('      3. Remove or update the overlay file if no longer needed');
        console.log('      4. Test utility imports across teams');
        console.log('      5. Ensure no team-specific dependencies in promoted code');

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
