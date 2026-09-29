import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Info } from "lucide-react";
import { expect } from "storybook/test";
import { Badge } from "./badge";
import { Button } from "./button";
import { DataTable } from "./data-table";
import {
  Accordion,
  AccordionItem,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  VisuallyHidden,
} from "./disclosure";

const meta = {
  title: "Primitives/Disclosure",
  component: Accordion,
  tags: ["autodocs"],
  args: { type: "single" },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProductAccordion: Story = {
  render: () => (
    <Accordion type="single" collapsible className="max-w-md">
      <AccordionItem value="description" title="Description">
        Relaxed overshirt in washed linen.
      </AccordionItem>
      <AccordionItem value="care" title="Care">
        Cold wash, dry flat.
      </AccordionItem>
      <AccordionItem value="shipping" title="Shipping & returns">
        Delivered in 2–4 days inside Kathmandu Valley.
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Care" });
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  },
};

/** Right under the page's h1 (the checkout's collapsed summary on phones): `headingLevel={2}`. */
export const SectionHeading: Story = {
  render: () => (
    <Accordion type="single" collapsible className="max-w-md">
      <AccordionItem value="summary" title="Order summary · Rs 6,550" headingLevel={2}>
        Linen Overshirt · M · Rs 4,500
      </AccordionItem>
    </Accordion>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent("Order summary");
  },
};

export const ProductTabs: Story = {
  render: () => (
    <Tabs defaultValue="details" className="max-w-md">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="care">Care</TabsTrigger>
        <TabsTrigger value="shipping">Shipping</TabsTrigger>
      </TabsList>
      <TabsContent value="details">Relaxed overshirt in washed linen.</TabsContent>
      <TabsContent value="care">Cold wash, dry flat.</TabsContent>
      <TabsContent value="shipping">2–4 days inside Kathmandu Valley.</TabsContent>
    </Tabs>
  ),
};

export const Separators: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <p>Subtotal</p>
      <Separator />
      <p>Total</p>
    </div>
  ),
};

export const IconTooltip: Story = {
  render: () => (
    <Tooltip content="Prices include 13% VAT">
      <Button size="icon" variant="ghost" aria-label="About prices">
        <Info className="size-5" strokeWidth={1.5} aria-hidden />
      </Button>
    </Tooltip>
  ),
};

export const ScreenReaderOnly: Story = {
  render: () => (
    <p>
      3 items<VisuallyHidden> in your bag</VisuallyHidden>
    </p>
  ),
};

type OrderRow = { id: string; number: string; status: string; items: number };
const rows: OrderRow[] = [
  { id: "1", number: "VZ-260928-0001", status: "Paid", items: 2 },
  { id: "2", number: "VZ-260928-0002", status: "Pending", items: 5 },
];

export const AdminTable: Story = {
  render: () => (
    <DataTable
      caption="Orders"
      rows={rows}
      getRowId={(row) => row.id}
      columns={[
        { key: "number", header: "Order", cell: (row) => <span className="font-mono">{row.number}</span> },
        {
          key: "status",
          header: "Status",
          cell: (row) => <Badge variant={row.status === "Paid" ? "success" : "warning"}>{row.status}</Badge>,
        },
        { key: "items", header: "Items", align: "right", cell: (row) => row.items },
      ]}
    />
  ),
};

type PlacedOrderRow = {
  id: string;
  number: string;
  placed: string;
  customer: string;
  status: string;
  items: number;
};
const placedOrders: PlacedOrderRow[] = [
  {
    id: "1",
    number: "VZ-260928-0041",
    placed: "28 Sep 2026, 11:48 AM",
    customer: "sita@example.com",
    status: "Confirmed",
    items: 2,
  },
  {
    id: "2",
    number: "VZ-260928-0042",
    placed: "28 Sep 2026, 3:05 PM",
    customer: "ram@example.com",
    status: "Being packed",
    items: 5,
  },
];

/**
 * Secondary columns step aside on smaller screens so Order and Items stay in view: Customer below `xl`
 * (`hideBelow="xl"`) and Status below `md` (`hideOnMobile`, the same as `hideBelow="md"`). On phones the status
 * moves into the Order cell under the date (patterns.md §10).
 */
export const AdminTableResponsiveColumns: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: () => (
    <DataTable
      caption="Orders"
      rows={placedOrders}
      getRowId={(row) => row.id}
      columns={[
        {
          key: "order",
          header: "Order",
          cell: (row) => (
            <span className="flex flex-col items-start gap-1">
              <span className="font-mono whitespace-nowrap">{row.number}</span>
              <span className="text-ink-muted">{row.placed}</span>
              <span className="md:hidden">
                <Badge variant="accent">{row.status}</Badge>
              </span>
            </span>
          ),
        },
        { key: "customer", header: "Customer", hideBelow: "xl", cell: (row) => row.customer },
        {
          key: "status",
          header: "Status",
          hideOnMobile: true,
          cell: (row) => <Badge variant="accent">{row.status}</Badge>,
        },
        { key: "items", header: "Items", align: "right", cell: (row) => row.items },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("columnheader", { name: "Order" })).toBeVisible();
    await expect(canvas.getByRole("columnheader", { name: "Items" })).toBeVisible();
    // Hidden columns are display: none on a phone, so they also leave the accessibility tree.
    await expect(canvas.queryByRole("columnheader", { name: "Customer" })).toBeNull();
    await expect(canvas.queryByRole("columnheader", { name: "Status" })).toBeNull();
  },
};
