# API Contract — `/api/v1`

Used by the mobile app (and any future client). The web app uses Server Actions that call the same core services.
Changing a shape here requires updating this doc in the same PR. Breaking changes require `/api/v2`.

## Conventions

- JSON only. Auth via the Better Auth session cookie (same origin in the Capacitor shell).
- Success: `200/201` with `{ "data": ... }`
- Error: `4xx/5xx` with `{ "error": { "code": "OUT_OF_STOCK", "message": "Only 2 left in size M." } }`
- Codes come from `backend-policies.md` §3. HTTP mapping: `VALIDATION_FAILED`→400, `UNAUTHENTICATED`→401, `FORBIDDEN`→403, `NOT_FOUND`→404, `CONFLICT/PRICE_CHANGED/OUT_OF_STOCK/INVALID_STATE_TRANSITION`→409, `RATE_LIMITED`→429, everything else→500.
- Money fields are integers in paisa and end with `Paisa`.
- Pagination: `?cursor=<id>&limit=<1..50>` → `{ data: [...], nextCursor: string | null }`.
- Dates: ISO 8601 UTC strings.

## Endpoints

### Catalog

| Method | Path                     | Auth   | Body / Query                              | Returns            |
| ------ | ------------------------ | ------ | ----------------------------------------- | ------------------ |
| GET    | `/api/v1/products`       | public | `category?, collection?, cursor?, limit?` | `ProductSummary[]` |
| GET    | `/api/v1/products/:slug` | public | —                                         | `ProductDetail`    |

### Cart

| Method | Path                         | Auth          | Body                      | Returns |
| ------ | ---------------------------- | ------------- | ------------------------- | ------- |
| GET    | `/api/v1/cart`               | guest or user | —                         | `Cart`  |
| POST   | `/api/v1/cart/items`         | guest or user | `{ variantId, quantity }` | `Cart`  |
| PATCH  | `/api/v1/cart/items/:itemId` | guest or user | `{ quantity }`            | `Cart`  |
| DELETE | `/api/v1/cart/items/:itemId` | guest or user | —                         | `Cart`  |

### Checkout & orders

| Method | Path                          | Auth         | Body                                                     | Returns                                                                                                    |
| ------ | ----------------------------- | ------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/checkout`            | user         | `{ addressId, paymentMethod: "ESEWA"\|"KHALTI"\|"COD" }` | `{ orderNumber, next: { type: "redirect", url } \| { type: "form", action, fields } \| { type: "done" } }` |
| GET    | `/api/v1/orders`              | user         | `cursor?, limit?`                                        | `OrderSummary[]`                                                                                           |
| GET    | `/api/v1/orders/:orderNumber` | user (owner) | —                                                        | `OrderDetail`                                                                                              |

## Shapes

```ts
type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  fromPricePaisa: number;
  imageUrl: string;
  inStock: boolean;
};
type ProductDetail = ProductSummary & {
  description: string;
  images: { url: string; alt: string }[];
  variants: Variant[];
};
type Variant = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  pricePaisa: number;
  stock: number;
};
type Cart = { id: string; items: CartItem[]; subtotalPaisa: number; itemCount: number };
type CartItem = {
  id: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPricePaisa: number;
  quantity: number;
  lineTotalPaisa: number;
  imageUrl: string;
};
type OrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalPaisa: number;
  createdAt: string;
};
type OrderDetail = OrderSummary & {
  items: OrderItemSnapshot[];
  shippingPaisa: number;
  subtotalPaisa: number;
  address: AddressSnapshot;
  timeline: { status: string; at: string }[];
};
```

## Not public

`/api/payments/*` (provider callbacks), `/api/cron/*` (secret-protected), `/api/auth/*` (Better Auth) are not part of this contract.
