import { NavLink, Outlet } from "react-router-dom";
import { useRead } from "../lib/spoosh";
import {
  CartIcon,
  CreditCardIcon,
  HomeIcon,
  PlusIcon,
  SpooshLogoIcon,
} from "../components/icons";

export function RootLayout() {
  const cartQuery = useRead((api) => api("cart").GET(), {
    staleTime: 4_000,
  });

  const items = cartQuery.data ?? [];
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container">
          <div className="header-inner">
            <NavLink to="/" className="logo">
              <SpooshLogoIcon className="logo-icon" />
              <span>Spoosh Store</span>
            </NavLink>

            <nav className="main-nav">
              <NavLink
                className={({ isActive }) => (isActive ? "active" : undefined)}
                to="/"
                end
              >
                <HomeIcon className="nav-icon" />
                Home
              </NavLink>
              <NavLink
                className={({ isActive }) => (isActive ? "active" : undefined)}
                to="/products/new"
              >
                <PlusIcon className="nav-icon" />
                Create
              </NavLink>
              <NavLink
                className={({ isActive }) => (isActive ? "active" : undefined)}
                to="/checkout"
              >
                <CreditCardIcon className="nav-icon" />
                Checkout
              </NavLink>
            </nav>

            <div className="header-actions">
              <NavLink to="/cart" className="cart-btn">
                <CartIcon />
                {totalUnits > 0 && <span className="badge">{totalUnits}</span>}
              </NavLink>
            </div>
          </div>
        </div>
      </header>

      <main className="container page-body">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <a
                href="https://spoosh.dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>Spoosh Store</strong>
              </a>{" "}
              — Typesafe API toolkit with composable plugins
            </div>
            <div className="footer-links">
              <a
                href="https://github.com/spooshdev/spoosh/tree/main/examples/react-ecommerce"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href="https://spoosh.dev/docs/react"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function OrdersLayout() {
  return (
    <section className="orders-layout">
      <Outlet />
    </section>
  );
}
