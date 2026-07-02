const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, 'server');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js') && file !== 'prisma.js') {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;

            // Remove: import { PrismaClient } from '@prisma/client';
            content = content.replace(/import\s+{\s*PrismaClient\s*}\s+from\s+['"]@prisma\/client['"];?\n?/g, '');
            
            // Remove: const prisma = new PrismaClient(); or similar
            content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\([^)]*\);?\n?/g, '');

            // Add import prisma from relative path
            if (original !== content) {
                // Calculate relative path to server/prisma.js
                const relativePath = path.relative(path.dirname(fullPath), path.join(__dirname, 'server', 'prisma.js')).replace(/\\/g, '/');
                const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
                const importStatement = `import prisma from '${importPath}';\n`;
                
                // Add import statement after the last import, or at the top
                const lastImportIndex = content.lastIndexOf('import ');
                if (lastImportIndex !== -1) {
                    const endOfLastImport = content.indexOf('\n', lastImportIndex);
                    content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);
                } else {
                    content = importStatement + content;
                }
                
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDirectory(rootDir);
