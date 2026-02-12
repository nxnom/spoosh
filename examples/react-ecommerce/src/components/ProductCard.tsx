import { Link } from "react-router-dom";
import { CartIcon, HeartIcon, StarIcon } from "./icons";
import { formatPrice } from "../utils/formatPrice";
import type { ProductRaw } from "../lib/schema";

type ProductCardProps = {
  product: ProductRaw;
  onHover: (id: string) => void;
  onAddToCart: (product: ProductRaw) => void;
};

export function ProductCard({
  product,
  onHover,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article className="product-card" onMouseEnter={() => onHover(product.id)}>
      <Link className="product-link" to={`/products/${product.id}`}>
        <div className="product-image-wrap">
          <img
            src={product.image_url}
            alt={product.title}
            className="product-image"
            loading="lazy"
          />

          <div className="product-badges">
            {!product.in_stock && (
              <span className="product-badge out-of-stock">Sold Out</span>
            )}
          </div>

          <button
            type="button"
            className="wishlist-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <HeartIcon />
          </button>
        </div>

        <div className="product-content">
          <span className="product-category">Electronics</span>
          <h3>{product.title}</h3>
          <p className="description">{product.description}</p>
          <div className="product-meta">
            <span className="product-price">
              {formatPrice(product.price_cents)}
            </span>
            <span className="product-rating">
              <StarIcon />
              {product.rating_avg.toFixed(1)}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        className="btn primary"
        disabled={!product.in_stock}
        onClick={() => onAddToCart(product)}
      >
        <CartIcon />
        {product.in_stock ? "Add to Cart" : "Out of Stock"}
      </button>
    </article>
  );
}
