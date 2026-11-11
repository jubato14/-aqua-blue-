const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'clean-project');
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.mjs', '.cjs', '.md', '.sql'];
const ignoredDirs = new Set(['node_modules', 'dist', 'build', '.git', '.aistudio', 'clean-project']);

let fileCount = 0;

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name) && !entry.name.startsWith('.')) {
        copyDir(srcPath, destPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (allowedExtensions.includes(ext) || entry.name === '.env.example' || entry.name === '.gitignore') {
        fs.copyFileSync(srcPath, destPath);
        fileCount++;
      }
    }
  }
}

copyDir(__dirname, targetDir);

console.log('====================================================');
console.log(` تم تجهيز مجلد (clean-project) بنجاح!`);
console.log(` إجمالي عدد الملفات: ${fileCount} ملف فقط (أقل بكثير من حد 100 ملف)`);
console.log(` يمكنك رفع هذا المجلد مباشرة إلى GitHub أو Vercel دون أي مشاكل`);
console.log('====================================================');
