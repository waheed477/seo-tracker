const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

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

const files = walk(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Remove `token` from `const { token, user } = useAuthStore()`
  // Or just replace `const { token } = useAuthStore();` with nothing.
  content = content.replace(/const\s+\{\s*token\s*\}\s*=\s*useAuthStore\(\);?\n?/g, '');
  // `const { token, user } = useAuthStore();` -> `const { user } = useAuthStore();`
  content = content.replace(/const\s+\{\s*token,\s*user\s*\}\s*=\s*useAuthStore\(\);?/g, 'const { user } = useAuthStore();');
  content = content.replace(/const\s+\{\s*user,\s*token\s*\}\s*=\s*useAuthStore\(\);?/g, 'const { user } = useAuthStore();');
  
  // `if (!token) return;` or `if (!token) { ... }` that might be dangling
  // A bit harder, let's just let it be and replace token usages if they exist.
  // The errors are `Cannot find name 'token'`. This is because we removed the declaration but left it in a conditional or API call.
  // E.g., `if (!token) return;`
  content = content.replace(/if\s*\(!token\)\s*return;?\n?/g, '');
  content = content.replace(/if\s*\(!token\)\s*\{\s*return;?\s*\}\n?/g, '');
  
  // Sometimes token is passed explicitly, let's remove it from any function call.
  content = content.replace(/,\s*token\s*\)/g, ')');
  content = content.replace(/\(\s*token\s*\)/g, '()');
  content = content.replace(/,\s*token\s*,/g, ',');
  
  // Cannot find name 'user' in Dashboard.tsx, Workspaces.tsx - we might have stripped user by mistake.
  // Wait, I replaced `const { token } = useAuthStore()` earlier, maybe it was `const { user, token }` and I wiped it?
  // Let's restore `const { user } = useAuthStore();` in files where user is missing.
  if (content.includes('Cannot find name \'user\'') || file.includes('Dashboard') || file.includes('Workspaces')) {
      if (!content.includes('const { user }') && content.includes('user')) {
         // insert after useAuthStore import, or at start of component
         // Actually simpler: just find useAuthStore() calls and add user if needed?
         // Let's just fix it manually for the 2 files.
      }
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});

console.log('Fixed token params again');
