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
  'frontend/src/pages/RankingsPage.tsx',
  'frontend/src/pages/Sites.tsx',
  'frontend/src/pages/Workspaces.tsx'
];

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // We know these specific components have `if (!token || !currentWorkspaceId)` or similar.
  content = content.replace(/!token\s*\|\|\s*/g, '');
  content = content.replace(/if\s*\(!token\)\s*return;?/g, '');
  
  // Dependency arrays
  content = content.replace(/,\s*token\s*\]/g, ']');
  content = content.replace(/\[\s*token\s*,\s*/g, '[');
  content = content.replace(/\[\s*token\s*\]/g, '[]');
  
  fs.writeFileSync(fullPath, content);
});

console.log('Fixed token conditions');
