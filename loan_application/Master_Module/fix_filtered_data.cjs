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
  
  // Find what the filtered array is actually called
  const match = content.match(/const (filtered[a-zA-Z0-9_]+) = useMemo/);
  if (match) {
      const correctName = match[1];
      
      // If it's not filteredData, but filteredData is used in totalItems={filteredData.length}
      if (correctName !== 'filteredData') {
          content = content.replace(/totalItems=\{filteredData\.length\}/g, `totalItems={${correctName}.length}`);
      }
  }
  
  if (content !== original) {
      fs.writeFileSync(mainFile, content, 'utf8');
      console.log(`Fixed filteredData in ${folder} -> ${match[1]}`);
  }
}
