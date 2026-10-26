import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './components/auth/AuthContext'
import { Spinner } from './components/auth/Guards'
import { CartProvider } from './components/cart/CartContext'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CartProvider>
          <Suspense fallback={<Spinner />}>
            <App />
          </Suspense>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
