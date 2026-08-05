const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fileP = path.join(dir, file);
    const stat = fs.statSync(fileP);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fileP));
    } else if (fileP.endsWith('.ts') || fileP.endsWith('.tsx')) {
      results.push(fileP);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'frontend/src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/!token\s*\|\|\s*/g, '');
  content = content.replace(/\s*\|\|\s*!token/g, '');
  content = content.replace(/if\s*\(\s*\)\s*return;?/g, ''); // if left empty
  content = content.replace(/if\s*\(\s*\)\s*\{[\s\S]*?\}/g, '');
  content = content.replace(/if\s*\(!token\)\s*return;/g, '');
  
  content = content.replace(/token,\s*/g, '');
  content = content.replace(/,\s*token/g, '');
  content = content.replace(/token/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});
