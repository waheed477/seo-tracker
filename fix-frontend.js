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

// 1. Fix useAuthStore import in api.ts
const apiPath = path.join(__dirname, 'frontend/src/api/api.ts');
let apiCode = fs.readFileSync(apiPath, 'utf8');
if (!apiCode.includes('import { useAuthStore }')) {
  apiCode = "import { useAuthStore } from '../store/authStore';\n" + apiCode;
}
fs.writeFileSync(apiPath, apiCode);

// 2. Fix authStore calls
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // token is passed as the LAST argument to almost all api methods.
  // We can use a regex to find all api calls that end with `, token)`
  // Wait, the token variable is usually called `token`.
  // Let's replace `, token)` with `)`
  // Also `, token,` with `,` (though unlikely in these calls)
  
  // Specific method signatures from the tsc output:
  // src/components/UpgradeModal.tsx(24,64): error TS2554: Expected 1 arguments, but got 2.
  //   workspaceApi.createCheckout(workspaceId, token) -> workspaceApi.createCheckout(workspaceId)
  
  // Actually, since all api methods no longer take `token`, any call passing `token` as the last arg is wrong.
  // Let's do a simple regex:
  // `api\.[a-zA-Z]+\.[a-zA-Z]+\(.*?(,\s*token)\)` 
  // Wait, we can just replace `, token)` with `)` everywhere an API is called.
  
  content = content.replace(/,\s*token\s*\)/g, ')');
  content = content.replace(/\(\s*token\s*\)/g, '()');
  // Sometimes it's `user.token` or `auth.token`? No, authStore exposes token. Usually destructured: `const { token } = useAuthStore();`
  content = content.replace(/,\s*token\s*!/g, ''); // if token!
  
  // Remove `const { token } = useAuthStore();` or `const token = useAuthStore(s => s.token);`
  content = content.replace(/const\s+\{\s*token[^}]*\}\s*=\s*useAuthStore\(\);?\n?/g, '');
  content = content.replace(/const\s+token\s*=\s*useAuthStore[^;]+;?\n?/g, '');
  
  // Fix authStore.ts
  if (file.endsWith('authStore.ts')) {
    content = content.replace(/token:\s*string\s*\|\s*null;/g, '');
    content = content.replace(/token:\s*null,/g, '');
    content = content.replace(/setAuth:\s*\(token:\s*string,\s*user:\s*AuthUser\)\s*=>\s*void;/g, 'setAuth: (user: AuthUser) => void;');
    content = content.replace(/setAuth:\s*\(token,\s*user\)\s*=>\s*set\(\{\s*token,\s*user,\s*isAuthenticated:\s*true\s*\}\),/g, 'setAuth: (user) => set({ user, isAuthenticated: true }),');
    content = content.replace(/clearAuth:\s*\(\)\s*=>\s*set\(\{\s*token:\s*null,\s*user:\s*null,\s*isAuthenticated:\s*false\s*\}\),/g, 'clearAuth: () => set({ user: null, isAuthenticated: false }),');
  }

  // Fix Login.tsx / Register.tsx / ResetPassword.tsx
  // setAuth(res.data.token, res.data.user) -> setAuth(res.data.user)
  content = content.replace(/setAuth\([^,]+,\s*(res\.data\.user|data\.user)\)/g, 'setAuth($1)');
  
  // Also fix api.ts exports
  // export interface AuthPayload { token: string; user: ... }
  // We can leave AuthPayload as is, backend still sends it (though it's in the cookie mostly, the backend response also contains `{ token, user }`).
  
  if (content !== original) {
    fs.writeFileSync(file, content);
  }
});

console.log('Fixed token params');
