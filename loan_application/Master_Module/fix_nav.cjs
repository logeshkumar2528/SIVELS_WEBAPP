const fs = require('fs');
const path = require('path');
const navPath = path.join(__dirname, 'src', 'components', 'navbar', 'Navbar.jsx');
let navContent = fs.readFileSync(navPath, 'utf8');
if (!navContent.includes('Rate Of Interest')) {
  navContent = navContent.replace(/import {[^}]+} from 'lucide-react';/, (match) => {
      if(!match.includes('TrendingUp')) {
          return match.replace('Shield', 'Shield, TrendingUp');
      }
      return match;
  });

  const newMenuItem = `  { label: 'Loan Product Collateral', path: '/masters/loan-product-collateral', icon: Shield },\n  { label: 'Rate Of Interest', path: '/masters/rate-of-interest', icon: TrendingUp }`;
  navContent = navContent.replace(`  { label: 'Loan Product Collateral', path: '/masters/loan-product-collateral', icon: Shield }`, newMenuItem);
  fs.writeFileSync(navPath, navContent);
  console.log('Fixed Navbar');
}
