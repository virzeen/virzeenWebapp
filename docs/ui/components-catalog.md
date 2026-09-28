# Components Catalog

The list of approved building blocks and **when to use which**. Storybook shows the live props; this doc explains the decisions.
Before building anything, check here and in Storybook (MCP `list-all-documentation`). If something is missing, add it here + Storybook first.

## 1. Primitives (`@virzeen/ui`)

Built on shadcn/ui (Radix) patterns, variants with `cva`, classes merged with `cn()` (clsx + tailwind-merge).

| Component                    | Variants / sizes                                                                              | Use when                                                      | Don't use when                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `Button`                     | `primary`, `secondary`, `ghost`, `destructive`, `link` · `sm`, `md`, `lg`, `icon` · `loading` | Any action (submit, add to bag, open drawer)                  | Navigating to a page → `Link`                         |
| `Link`                       | `default`, `subtle`, `nav`                                                                    | Navigation to a URL                                           | Triggering an action → `Button`                       |
| `Input`, `Textarea`          | `default`, `error`                                                                            | Free text                                                     | Choosing from a fixed list → `Select`/`RadioGroup`    |
| `Select`                     | —                                                                                             | 5+ options (district, province)                               | 2–4 options → `RadioGroup`                            |
| `RadioGroup`                 | `default`, `card`                                                                             | Payment method, shipping option, 2–4 choices                  | Multiple choices → `Checkbox`                         |
| `Checkbox`, `Switch`         | —                                                                                             | Checkbox: agree/filters. Switch: instant on/off settings      | —                                                     |
| `FormField`                  | —                                                                                             | Wraps label + control + helper + error for every form input   | —                                                     |
| `Dialog`                     | —                                                                                             | Short confirmations that need a decision ("Remove item?")     | Long content or forms → `Sheet`                       |
| `Sheet`                      | `right`, `bottom`                                                                             | Cart drawer (right), mobile filters/menus (bottom)            | Critical confirmations → `Dialog`                     |
| `Toast`                      | `default`, `success`, `error`                                                                 | Feedback after background actions ("Added to bag")            | Errors the user must fix → inline `Alert`/field error |
| `Alert`                      | `info`, `success`, `warning`, `danger`                                                        | Persistent page/section messages                              | Temporary feedback → `Toast`                          |
| `Badge`                      | `neutral`, `accent`, `success`, `warning`, `danger`                                           | Status labels ("New", "Only 3 left", "Paid")                  | Clickable things                                      |
| `Skeleton`                   | shapes                                                                                        | Loading placeholders matching final layout                    | Short button pending → `Button loading`               |
| `EmptyState`                 | —                                                                                             | No data (empty bag, no orders, no results)                    | Errors → `Alert`                                      |
| `Container`, `Stack`, `Grid` | gaps from spacing scale                                                                       | All page/section layout                                       | —                                                     |
| `Separator`                  | —                                                                                             | Dividing groups                                               | Spacing alone is enough                               |
| `Tabs`                       | —                                                                                             | Switching views of the same thing (Details / Care / Shipping) | Navigating pages                                      |
| `Accordion`                  | —                                                                                             | FAQ, product care info on mobile                              | Primary content                                       |
| `Tooltip`                    | —                                                                                             | Explaining icon buttons on desktop                            | Essential info (not visible on touch)                 |
| `DataTable`                  | —                                                                                             | Admin lists (orders, products)                                | Customer-facing UI                                    |
| `VisuallyHidden`             | —                                                                                             | Screen-reader-only labels                                     | —                                                     |

## 2. Shared app components (`apps/web/src/client/components/shared`)

| Component                               | Purpose                                                                 | Rule                                             |
| --------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `Price`                                 | Renders paisa as `Rs 1,250` (en-IN grouping), optional compare-at price | The only way to show money                       |
| `CloudImage`                            | Cloudinary-optimized image with required `alt`, aspect ratio, `sizes`   | The only way to show images                      |
| `QuantityStepper`                       | − / value / + with min/max from stock                                   | Cart and product page                            |
| `StockLabel`                            | "In stock" / "Only N left" / "Out of stock" from a number               | Anywhere stock is shown                          |
| `SiteHeader`, `SiteFooter`, `MobileNav` | Global layout                                                           | Used only in root/group layouts                  |
| `CartDrawer`                            | Right `Sheet` with cart lines and subtotal                              | Opened from header bag icon and after add-to-bag |

## 3. Decision rules

- **Action or navigation?** Changes data or opens UI → `Button`. Goes to a URL → `Link`. Never a clickable `div`.
- **Where does feedback go?** Field problem → under the field. Form-level problem → `Alert` at the top of the form. Background success → `Toast`.
- **Overlay type?** Needs a yes/no → `Dialog`. Holds content or a flow → `Sheet`.
- **New primitive or feature component?** If it has no idea what a product/order is → primitive. If it does → feature component.
- **Variant or new component?** Same structure with different look → add a variant. Different structure → new component.
