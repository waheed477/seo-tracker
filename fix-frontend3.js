const fs = require('fs');
const path = require('path');

const filesToFix = [
  'frontend/src/components/ui/NotificationBell.tsx',
  'frontend/src/pages/ActionPlanPage.tsx',
  'frontend/src/pages/AuditPage.tsx',
  'frontend/src/pages/BillingPage.tsx',
  'frontend/src/pages/CompetitorPage.tsx',
  'frontend/src/pages/ContentReviewPage.tsx',
  'frontend/src/pages/Dashboard.tsx',
  'frontend/src/pages/KeywordPage.tsx',
  'frontend/src/pages/Login.tsx',
  'frontend/src/pages/RankingsPage.tsx',
  'frontend/src/pages/Register.tsx',
  'frontend/src/pages/ResetPassword.tsx',
  'frontend/src/pages/Sites.tsx',
  'frontend/src/pages/Workspaces.tsx'
];

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Fix dangling token returns
  content = content.replace(/if\s*\(!token\)\s*return;?\n?/g, '');
  content = content.replace(/if\s*\(!token\)\s*\{\s*return;?\s*\}\n?/g, '');
  
  // Fix token in useEffect dependency arrays: [workspaceId, token] -> [workspaceId]
  content = content.replace(/,\s*token\s*\]/g, ']');
  content = content.replace(/\[\s*token\s*,\s*/g, '[');
  content = content.replace(/\[\s*token\s*\]/g, '[]');
  
  // Fix RankingsPage.tsx connectUrl fallback
  content = content.replace(/connectUrl:\s*api\.gscApi\.connectUrl\(siteId,\s*token\)/g, 'connectUrl: api.gscApi.connectUrl(siteId)');
  content = content.replace(/connectUrl\(siteId,\s*token\)/g, 'connectUrl(siteId)');

  // Fix setAuth calls
  content = content.replace(/setAuth\([^,]+,\s*(.+?)\)/g, 'setAuth($1)');
  
  // Restore user in Dashboard and Workspaces if it was deleted
  if (file.includes('Dashboard.tsx') || file.includes('Workspaces.tsx')) {
    if (!content.includes('const { user } = useAuthStore()') && content.includes('useAuthStore()')) {
      content = content.replace(/const\s+\w+\s*=\s*useAuthStore\(\);?/, match => `${match}\n  const { user } = useAuthStore();`);
    } else if (!content.includes('const { user } = useAuthStore()') && !content.includes('useAuthStore()')) {
      // Just inject it after the component declaration
      content = content.replace(/export default function \w+\(\) \{/, match => `${match}\n  const { user } = useAuthStore();`);
    }
  }

  fs.writeFileSync(fullPath, content);
});

console.log('Fixed final TS errors');
