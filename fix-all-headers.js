import fs from 'fs';
import path from 'path';

const pagesDir = 'src/pages';
const files = [
  'VPS.tsx', 'Terms.tsx', 'Support.tsx', 'Success.tsx', 'Status.tsx', 'SLA.tsx',
  'RustConfig.tsx', 'Refund.tsx', 'PurchaseSuccess.tsx', 'PurchaseConfirmed.tsx',
  'PalworldConfig.tsx', 'Privacy.tsx', 'MinecraftConfig.tsx', 'Migration.tsx',
  'GivrwrldEssentials.tsx', 'GameExpansionPack.tsx', 'FAQ.tsx', 'Deploy.tsx',
  'Discord.tsx', 'DashboardSettings.tsx', 'DashboardSupport.tsx', 'DashboardBilling.tsx',
  'DashboardOrder.tsx', 'DashboardAffiliate.tsx', 'CommunityPack.tsx', 'Checkout.tsx',
  'Billing.tsx', 'Blog.tsx', 'Affiliate.tsx', 'About.tsx'
];

// Pages that should keep their own Header/Footer (special cases)
const keepHeaders = ['Auth.tsx', 'Checkout.tsx', 'Success.tsx', 'NotFound.tsx'];

files.forEach(file => {
  if (keepHeaders.includes(file)) return;
  
  const filePath = path.join(pagesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove Header imports
    content = content.replace(/import.*Header.*from.*['"][^'"]*['"];?\n/g, '');
    content = content.replace(/import.*Header.*from.*['"][^'"]*['"];?\n/g, '');
    
    // Remove Footer imports
    content = content.replace(/import.*Footer.*from.*['"][^'"]*['"];?\n/g, '');
    content = content.replace(/import.*Footer.*from.*['"][^'"]*['"];?\n/g, '');
    
    // Remove Header JSX
    content = content.replace(/<Header[^>]*\/?>/g, '');
    content = content.replace(/<Header[^>]*>.*?<\/Header>/gs, '');
    
    // Remove Footer JSX
    content = content.replace(/<Footer[^>]*\/?>/g, '');
    content = content.replace(/<Footer[^>]*>.*?<\/Footer>/gs, '');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  }
});

console.log('All pages fixed!');
