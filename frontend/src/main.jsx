import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ChessProvider } from './context/ChessContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChessProvider>
       <App />
    </ChessProvider>
  </StrictMode>,
)
