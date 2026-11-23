import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import '../../../Core/src/styles/reset.css';
import '../../../Core/src/styles/variables.css';
import '../../../Core/src/styles/global.css';
import '../../back_office/src/back-office/styles/variables.css';
import '../../back_office/src/back-office/layouts/MainLayout/MainLayout.css';
import '../../back_office/src/back-office/components/Header/Header.css';
import '../../back_office/src/back-office/components/Sidebar/Sidebar.css';
import './styles/operations.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
