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

const cards = ["a", "b", "c", "d", "e", "f", "g", "h"];

export const ProductGrid: Story = {
  render: () => (
    <Container className="py-8">
      <Grid columns="products" gap={4}>
        {cards.map((id) => (
          <Skeleton key={id} shape="image" />
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

export const MobileGrid: Story = {
  ...ProductGrid,
  globals: { viewport: { value: "mobile1" } },
};
