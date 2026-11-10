import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Container, Grid, Stack } from "./layout";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Primitives/Layout",
  component: Container,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

const cards = ["a", "b", "c", "d", "e", "f"];

/**
 * The page width and product grid of nike.com (measured 2026-11-10). `Container`: a 24px side margin (`px-gutter`),
 * 48px from 960px wide, content at most 1824px wide (`max-w-page`). `Grid columns="products"`: every grid of product
 * cards (the shop, Favourites, search), 2 a row below 960px running to the screen's edges with 6px between photos, the
 * text 12px in (`px-card-inset`); 3 a row from 960px inside the margin, 16px apart. Square photos.
 */
export const ProductGrid: Story = {
  render: () => (
    <Container className="py-8">
      <Grid columns="products" gap={4}>
        {cards.map((id) => (
          <div key={id} data-testid="card" className="flex flex-col gap-3">
            <Skeleton shape="square" />
            <div className="flex flex-col gap-3 px-card-inset">
              <Skeleton shape="text" className="w-3/4" />
              <Skeleton shape="text" className="w-1/3" />
            </div>
          </div>
        ))}
      </Grid>
    </Container>
  ),
};

export const StackColumn: Story = {
  render: () => (
    <Container width="narrow" className="py-8">
      <Stack gap={4}>
        <Skeleton shape="text" className="w-1/2" />
        <Skeleton shape="text" />
        <Skeleton shape="text" className="w-5/6" />
      </Stack>
    </Container>
  ),
};

export const StackRow: Story = {
  render: () => (
    <Container className="py-8">
      <Stack direction="row" gap={2} align="center">
        <Skeleton className="size-11" shape="circle" />
        <Skeleton shape="text" className="w-40" />
      </Stack>
    </Container>
  ),
};

/** Phones: the grid runs to the screen's edges, 6px between photos. */
export const MobileGrid: Story = {
  ...ProductGrid,
  globals: { viewport: { value: "mobile1" } },
};
