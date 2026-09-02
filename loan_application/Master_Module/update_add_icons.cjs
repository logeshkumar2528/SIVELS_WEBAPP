const fs = require('fs');
const path = require('path');

const ICON_MAP = {
  'InterestTypePage': 'Percent',
  'Title': 'Type',
  'Relationship': 'UserPlus',
  'SourcingChannel': 'Network',
  'DocumentType': 'FileText',
  'StatusRole': 'UserCog',
  'Status': 'ToggleRight',
  'LoanType': 'CreditCard',
  'LoanProduct': 'Package',
  'LoanPurpose': 'Target',
  'LoanTransactionType': 'Repeat',
  'Gender': 'User',
  'MaritalStatus': 'Heart',
  'BankBranch': 'Building',
  'State': 'Map',
  'City': 'Building2',
  'EmploymentType': 'Briefcase',
  'Bank': 'Landmark',
  'Country': 'Globe',
  'District': 'MapPin',
  'EmploymentTypeDocumentMapping': 'Link',
  'LoanProductVariation': 'Layers',
  'Verification': 'ShieldCheck',
  'Property': 'Home',
  'PropertyUsage': 'Key',
  'Education': 'GraduationCap',
  'Religion': 'Star',
  'Caste': 'Contact',
  'LoanProductCollateral': 'Shield'
};

const mastersDir = path.join(__dirname, 'src', 'pages', 'masters');
const folders = fs.readdirSync(mastersDir);

for (const folder of folders) {
  const folderPath = path.join(mastersDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  
  const icon = ICON_MAP[folder];
  if (!icon) continue;
  
  let mainFile = path.join(folderPath, `${folder}.jsx`);
  if (!fs.existsSync(mainFile)) continue;
  
  let content = fs.readFileSync(mainFile, 'utf8');
  
  if (content.includes('<Plus size={18} />')) {
      content = content.replace(/<Plus size=\{18\}\s*\/>/g, `<${icon} size={18} />`);
      
      const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/;
      const match = content.match(importRegex);
      if (match) {
        let existingIcons = match[1].split(',').map(s => s.trim()).filter(s => s);
        existingIcons = existingIcons.filter(i => i !== 'Plus');
        if (!existingIcons.includes(icon)) {
            existingIcons.push(icon);
        }
        const newImport = `import { ${existingIcons.join(', ')} } from 'lucide-react';`;
        content = content.replace(importRegex, newImport);
      }
      
      fs.writeFileSync(mainFile, content, 'utf8');
      console.log(`Updated Add button in ${folder}`);
  }
}
