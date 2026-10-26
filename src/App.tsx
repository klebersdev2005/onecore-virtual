import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home/HomePage'

const Category = lazy(() => import('./pages/Category/CategoryPage'))
const Collection = lazy(() => import('./pages/Collection/CollectionPage'))
const Product = lazy(() => import('./pages/Product/ProductPage'))
const Search = lazy(() => import('./pages/Search/SearchPage'))
const Cart = lazy(() => import('./pages/Cart/CartPage'))
const Checkout = lazy(() => import('./pages/Checkout/CheckoutPage'))
const Info = lazy(() => import('./pages/NotFound/InfoPage'))
const NotFound = lazy(() => import('./pages/NotFound/NotFoundPage'))

const auth = () => import('./pages/Auth/AuthPages')
const Login = lazy(() => auth().then((m) => ({ default: m.LoginPage })))
const Signup = lazy(() => auth().then((m) => ({ default: m.SignupPage })))
const Forgot = lazy(() => auth().then((m) => ({ default: m.ForgotPage })))
const NewPassword = lazy(() => auth().then((m) => ({ default: m.NewPasswordPage })))

const AccountLayout = lazy(() => import('./pages/Account/AccountLayout'))
const Profile = lazy(() => import('./pages/Account/ProfilePage'))
const Addresses = lazy(() => import('./pages/Account/AddressesPage'))
const Orders = lazy(() => import('./pages/Account/OrdersPage'))
const OrderDetail = lazy(() => import('./pages/Account/OrderDetailPage'))

const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/Admin/AdminProducts'))
const AdminProductEdit = lazy(() => import('./pages/Admin/AdminProductEdit'))
const AdminCategories = lazy(() => import('./pages/Admin/AdminCategories'))
const AdminOrders = lazy(() => import('./pages/Admin/AdminOrders'))
const AdminOrderDetail = lazy(() => import('./pages/Admin/AdminOrderDetail'))
const AdminReviews = lazy(() => import('./pages/Admin/AdminReviews'))
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings'))

export default function App() {
  return (
    <Routes>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="produtos" element={<AdminProducts />} />
        <Route path="produtos/:id" element={<AdminProductEdit />} />
        <Route path="categorias" element={<AdminCategories />} />
        <Route path="pedidos" element={<AdminOrders />} />
        <Route path="pedidos/:id" element={<AdminOrderDetail />} />
        <Route path="avaliacoes" element={<AdminReviews />} />
        <Route path="configuracoes" element={<AdminSettings />} />
      </Route>

      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categoria/:slug" element={<Category />} />
        <Route path="colecao/:slug" element={<Collection />} />
        <Route path="produto/:slug" element={<Product />} />
        <Route path="busca" element={<Search />} />
        <Route path="carrinho" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="ajuda/:slug" element={<Info />} />

        <Route path="conta/entrar" element={<Login />} />
        <Route path="conta/cadastro" element={<Signup />} />
        <Route path="conta/recuperar" element={<Forgot />} />
        <Route path="conta/nova-senha" element={<NewPassword />} />
        <Route path="conta" element={<AccountLayout />}>
          <Route index element={<Profile />} />
          <Route path="enderecos" element={<Addresses />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="pedidos/:id" element={<OrderDetail />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
