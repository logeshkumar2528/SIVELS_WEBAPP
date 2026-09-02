const fs = require('fs');
const path = require('path');

const mastersDir = path.join(__dirname, 'src', 'pages', 'masters');
const folders = fs.readdirSync(mastersDir);

let count = 0;

for (const folder of folders) {
  const folderPath = path.join(mastersDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  
  let mainFile = path.join(folderPath, `${folder}.jsx`);
  if (!fs.existsSync(mainFile)) {
    if (folder === 'InterestTypePage') {
       mainFile = path.join(folderPath, `InterestTypePage.jsx`);
    } else {
       continue;
    }
  }
  
  let content = fs.readFileSync(mainFile, 'utf8');
  let original = content;
  
  content = content.replace(/const\s+PAGE_SIZE\s*=\s*10;\r?\n?/g, '');
  
  if (content.includes('const [currentPage, setCurrentPage] = useState(1);') && !content.includes('const [pageSize, setPageSize]')) {
      content = content.replace(/const\s+\[currentPage,\s*setCurrentPage\]\s*=\s*useState\(1\);/g, 
        'const [currentPage, setCurrentPage] = useState(1);\n  const [pageSize, setPageSize] = useState(10);');
  }
  
  content = content.replace(/PAGE_SIZE/g, 'pageSize');
  
  const fallbackRegex = /<MasterPagination[\s\S]*?\/>/;
  const existing = content.match(fallbackRegex);
  if (existing && !existing[0].includes('onPageSizeChange')) {
      content = content.replace(fallbackRegex, `<MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />`);
  }
  
  if (content !== original) {
      fs.writeFileSync(mainFile, content, 'utf8');
      console.log(`Updated pagination in ${folder}`);
      count++;
  }
}
console.log(`Updated ${count} files.`);
