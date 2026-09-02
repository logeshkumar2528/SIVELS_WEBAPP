const fs = require('fs');
const path = require('path');

const ICON_MAP = {
  'InterestTypePage': 'Percent',
  'Title': 'Type',
  'Relationship': 'Users',
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
  if (!icon) {
    console.log(`No icon mapped for folder: ${folder}`);
    continue;
  }
  
  // Find main jsx file
  let mainFile = path.join(folderPath, `${folder}.jsx`);
  if (!fs.existsSync(mainFile)) {
    console.log(`Could not find ${mainFile}`);
    continue;
  }
  
  let content = fs.readFileSync(mainFile, 'utf8');
  
  // 1. Update lucide-react import
  // Check if lucide-react is already imported
  if (content.includes("'lucide-react'") || content.includes('"lucide-react"')) {
    // Find the import block
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];/;
    const match = content.match(importRegex);
    if (match) {
      const existingIcons = match[1].split(',').map(s => s.trim()).filter(s => s);
      if (!existingIcons.includes(icon)) {
        // Remove 'Box' if it exists and we're replacing it
        const newIcons = existingIcons.filter(i => i !== 'Box');
        newIcons.push(icon);
        const newImport = `import { ${newIcons.join(', ')} } from 'lucide-react';`;
        content = content.replace(importRegex, newImport);
      } else {
          // just remove Box
          const newIcons = existingIcons.filter(i => i !== 'Box' || icon === 'Box');
          const newImport = `import { ${newIcons.join(', ')} } from 'lucide-react';`;
          content = content.replace(importRegex, newImport);
      }
    }
  } else {
    // Add import after the last import
    const lastImportIndex = content.lastIndexOf('import ');
    const nextLineIndex = content.indexOf('\n', lastImportIndex) + 1;
    content = content.slice(0, nextLineIndex) + `import { ${icon} } from 'lucide-react';\n` + content.slice(nextLineIndex);
  }
  
  // 2. Update Header
  const headerRegex = /<header className="masters-page-header">[\s\S]*?<\/header>/;
  const headerMatch = content.match(headerRegex);
  if (headerMatch) {
    let headerBlock = headerMatch[0];
    
    // Check if it already has the icon container
    if (headerBlock.includes('masters-page-header-icon')) {
      // Replace whatever icon is inside
      const iconRegex = /<[A-Z][a-zA-Z0-9]*\s+size=\{24\}\s*\/>/;
      headerBlock = headerBlock.replace(iconRegex, `<${icon} size={24} />`);
    } else {
      // It doesn't have it. It probably has `<div>` right after `<header ...>`
      const divIndex = headerBlock.indexOf('<div>');
      if (divIndex !== -1) {
        const insertion = `<div className="masters-page-header-icon">\n            <${icon} size={24} />\n          </div>\n          `;
        headerBlock = headerBlock.slice(0, divIndex) + insertion + headerBlock.slice(divIndex);
      }
    }
    content = content.replace(headerRegex, headerBlock);
  }
  
  fs.writeFileSync(mainFile, content, 'utf8');
  console.log(`Updated ${folder}`);
}
