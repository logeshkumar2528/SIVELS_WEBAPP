const fs = require('fs');
const path = require('path');

const mastersDir = path.join(__dirname, 'src', 'pages', 'masters');
const folders = fs.readdirSync(mastersDir);

for (const folder of folders) {
  const folderPath = path.join(mastersDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  
  let mainFile = path.join(folderPath, `${folder}.jsx`);
  if (!fs.existsSync(mainFile)) {
    if (folder === 'InterestTypePage') {
       mainFile = path.join(folderPath, `InterestTypePage.jsx`);
    } else continue;
  }
  
  let content = fs.readFileSync(mainFile, 'utf8');
  let original = content;
  
  content = content.replace(/(\[filteredData,\s*currentPage\])/g, '[filteredData, currentPage, pageSize]');
  
  if (content !== original) {
      fs.writeFileSync(mainFile, content, 'utf8');
      console.log(`Fixed deps in ${folder}`);
  }
}
