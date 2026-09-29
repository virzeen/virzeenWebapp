# API Contract — `/api/v1`

Used by the mobile app (and any future client). The web app uses Server Actions that call the same core services.
Changing a shape here requires updating this doc in the same PR. Breaking changes require `/api/v2`.

## Conventions

- JSON only. Auth via the Better Auth session cookie (same origin in the Capacitor shell).
- Success: `200/201` with `{ "data": ... }`
- Error: `4xx/5xx` with `{ "error": { "code": "OUT_OF_STOCK", "message": "Only 2 left in size M." } }`
- Codes come from `backend-policies.md` §3. HTTP mapping: `VALIDATION_FAILED`→400, `UNAUTHENTICATED`→401, `FORBIDDEN`→403, `NOT_FOUND`→404, `CONFLICT/PRICE_CHANGED/OUT_OF_STOCK/INVALID_STATE_TRANSITION/CART_EMPTY/PAYMENT_FAILED/PAYMENT_PENDING/PAYMENT_AMOUNT_MISMATCH`→409, `RATE_LIMITED`→429, everything else→500. `VALIDATION_FAILED` also carries `fields` (field → message).
- Mutations (`POST/PATCH/DELETE`) are refused with 403 when the `Origin` header is present and is not the site origin.
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
  imageUrl: string | null;
  imageAlt: string;
  hoverImageUrl: string | null;
  inStock: boolean;
  colorCount: number;
  hasStylePhotos: boolean; // the colours are styles with their own photos ("{n} styles"), specs/product-styles.md
};
type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  care: string | null;
  benefits: string[]; // "Benefits" bullets in the product details popup (specs/product-page.md)
  details: string[]; // "Product details" bullets
  countryOfOrigin: string | null;
  fromPricePaisa: number;
  inStock: boolean;
  imageUrl: string | null;
  images: { url: string; alt: string; color: string | null }[]; // color: the style (variant color) shown; null = every style
  features: { title: string; body: string; imageUrl: string; imageAlt: string }[]; // "Features that perform", in order
  sizeGuide: SizeGuide | null; // null when the product has none (specs/size-guides.md)
  styles: Style[]; // in style order: one per colour for sale, or one with color "" when nothing for sale has a colour
  variants: Variant[];
};
type Style = {
  color: string; // the style (a variant color); "" = a product without styles
  code: string; // style number, e.g. "VZ0042-101": never changes, never reused (specs/product-editor-on-page.md)
  colourShown: string | null; // "Colour shown", e.g. "Black/White"; falls back to color (null for the "" style)
};
type SizeGuide = {
  name: string;
  intro: string | null;
  chart: { columns: string[]; rows: { size: string; values: string[] }[] }; // values in cm, e.g. "96" or "96-101"
  fitTips: string | null;
  howToMeasure: string[];
  imageUrl: string | null;
  imageAlt: string | null;
};
type Variant = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  pricePaisa: number;
  stock: number;
};
type Cart = { id: string; items: CartItem[]; subtotalPaisa: number; itemCount: number }; // id is "" when no cart exists yet
type CartItem = {
  id: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  unitPricePaisa: number;
  quantity: number;
  lineTotalPaisa: number;
  imageUrl: string | null;
  imageAlt: string;
  maxQuantity: number;
  isAvailable: boolean;
};
type OrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "COD" | "ESEWA" | "KHALTI";
  totalPaisa: number;
  itemCount: number;
  createdAt: string;
};
type OrderDetail = Omit<OrderSummary, "itemCount"> & {
  items: OrderItemSnapshot[];
  subtotalPaisa: number;
  shippingPaisa: number;
  address: AddressSnapshot;
  courierName: string | null;
  trackingNumber: string | null;
  timeline: { status: string; at: string }[];
};
type OrderItemSnapshot = {
  productName: string;
  productSlug: string;
  sku: string;
  variantLabel: string;
  imageUrl: string | null;
  unitPricePaisa: number;
  quantity: number;
};
```

Address management for the app (list/add/edit) is not part of v1 yet; the app uses the web account pages in the Capacitor shell. The same goes for favourites (`specs/favourites.md`): the app uses the web Favourites page.

## Not public

`/api/payments/*` (provider callbacks), `/api/cron/*` (secret-protected), `/api/auth/*` (Better Auth) are not part of this contract.
