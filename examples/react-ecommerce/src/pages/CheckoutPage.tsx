import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRead, useWrite } from "../lib/spoosh";
import { InlineError } from "../components/InlineError";
import { LockIcon } from "../components/icons";
import { formatPrice } from "../utils/formatPrice";
import type { CartItemRaw } from "../lib/schema";

export function CheckoutPage() {
  const navigate = useNavigate();

  const cartQuery = useRead((api) => api("cart").GET(), {
    // To always fetch fresh cart data, cuz in a real app the
    // cart can gets updated from other places or some items are no longer available
    staleTime: 0,
    transform: (items) => ({
      totalCents: items.reduce(
        (sum, item) => sum + item.price_cents * item.quantity,
        0
      ),
      totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
  });

  const items: CartItemRaw[] = cartQuery.data ?? [];
  const summary = cartQuery.meta.transformedData ?? {
    totalCents: 0,
    totalUnits: 0,
  };

  const checkout = useWrite((api) => api("checkout").POST());

  const [email, setEmail] = useState("shopper@example.com");
  const [address, setAddress] = useState(
    "121 Market Street, San Francisco, CA"
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await checkout.trigger({
      body: { email: email.trim(), address: address.trim() },
      invalidate: ["self", "cart"],
    });

    if (!result.data) {
      return;
    }

    navigate(`/orders/${result.data.order_id}`);
  }

  return (
    <div className="checkout-grid">
      <div className="checkout-form-section">
        <div>
          <h1>Checkout</h1>
          <p className="subtitle muted">Complete your order securely.</p>
        </div>

        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Shipping Address</label>
            <textarea
              id="address"
              rows={4}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Enter your full shipping address"
              required
            />
          </div>

          {checkout.error && <InlineError message={checkout.error.message} />}

          <button
            className="btn primary lg full"
            disabled={
              cartQuery.loading || checkout.loading || summary.totalUnits === 0
            }
            type="submit"
          >
            <LockIcon />
            {checkout.loading ? "Processing Payment..." : "Place Order"}
          </button>

          <p
            className="muted"
            style={{ textAlign: "center", fontSize: "0.8125rem" }}
          >
            Your payment information is secure and encrypted.
          </p>
        </form>
      </div>

      <aside className="order-summary">
        <h2>Order Summary</h2>

        {cartQuery.loading ? (
          <div style={{ padding: "2rem 0", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <p className="muted">Loading cart...</p>
          </div>
        ) : items.length === 0 ? (
          <p className="muted" style={{ padding: "1rem 0" }}>
            Your cart is empty
          </p>
        ) : (
          <ul className="order-items">
            {items.map((item) => (
              <li key={item.id} className="order-item">
                <span>
                  {item.title} x {item.quantity}
                </span>
                <strong>{formatPrice(item.price_cents * item.quantity)}</strong>
              </li>
            ))}
          </ul>
        )}

        {!cartQuery.loading && (
          <>
            <div className="summary-row" style={{ marginTop: "1rem" }}>
              <span>Subtotal</span>
              <span>{formatPrice(summary.totalCents)}</span>
            </div>

            <div className="summary-row">
              <span>Shipping</span>
              <span>Free</span>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <span>{formatPrice(summary.totalCents)}</span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
