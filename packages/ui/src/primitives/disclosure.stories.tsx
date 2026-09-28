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
