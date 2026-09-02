const fs = require('fs');
const path = require('path');

const mastersDir = path.join(__dirname, 'src', 'pages', 'masters');
const folders = fs.readdirSync(mastersDir);

for (const folder of folders) {
  const folderPath = path.join(mastersDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  
  let mainFile = path.join(folderPath, `${folder}.jsx`);
  if (!fs.existsSync(mainFile)) continue;
  
  let content = fs.readFileSync(mainFile, 'utf8');
  let original = content;
  
  // Also fix cases where it's already [filteredData, currentPage, pageSize] so we don't duplicate
  // Let's just find `currentPage]` and replace with `currentPage, pageSize]`
  // But ensure we don't do `currentPage, pageSize, pageSize]`
  if (!content.includes('currentPage, pageSize]')) {
      content = content.replace(/currentPage\]\);/g, 'currentPage, pageSize]);');
  }
  
  if (content !== original) {
      fs.writeFileSync(mainFile, content, 'utf8');
      console.log(`Fixed deps in ${folder}`);
  }
}
