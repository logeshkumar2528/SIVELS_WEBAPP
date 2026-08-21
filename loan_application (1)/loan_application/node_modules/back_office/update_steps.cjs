const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'back-office', 'pages');

function replaceInFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInFiles(fullPath);
    } else if (file.endsWith('Data.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const newSteps = 'export const VERIFICATION_STEPS = [\n' +
'  { id: \'doc-verify\',    label: \'Document Verification\' },\n' +
'  { id: \'pan-eligibility\', label: \'PAN & Eligibility Check\' },\n' +
'  { id: \'bank-verify\',   label: \'Bank Verification\'     },\n' +
'  { id: \'loan-docs\',     label: \'Loan Documents\'        },\n' +
'  { id: \'final-approval\',label: \'Final Approval\'        },\n' +
'  { id: \'disbursement\',  label: \'Disbursement\'          },\n' +
'];';
      
      const regex = /export const VERIFICATION_STEPS = \[[\s\S]*?\];/g;
      
      if (regex.test(content)) {
        content = content.replace(regex, newSteps);
        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

replaceInFiles(dir);
