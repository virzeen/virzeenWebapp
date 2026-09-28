// LOCAL sample data only (docs/database/data-rules.md §4). Never run against production.
// Idempotent: re-running updates the same rows by slug/SKU/email.
import { randomUUID } from "node:crypto";
import { config } from "dotenv";

config({ path: ["../../apps/web/.env.local", "../../apps/web/.env"], quiet: true });

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error("Refusing to seed: DATABASE_URL is not a local database.");
  process.exit(1);
}

const { db } = await import("../src/client");

type SeedVariant = { color: string | null; size: string | null; stock: number };
type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  pricePaisa: number;
  description: string;
  care?: string;
  collections: string[];
  colors: (string | null)[];
  sizes: (string | null)[];
  soldOut?: string[]; // "Color/Size" combos with zero stock
  images: number[];
};

const CATEGORIES = [
  { slug: "tops", name: "Tops", sortOrder: 1 },
  { slug: "bottoms", name: "Bottoms", sortOrder: 2 },
  { slug: "outerwear", name: "Outerwear", sortOrder: 3 },
  { slug: "accessories", name: "Accessories", sortOrder: 4 },
];

const COLLECTIONS = [
  {
    slug: "monochromium-01",
    name: "Monochromium 01",
    description: "The first chapter: black, white and the greys between.",
    isFeatured: true,
  },
  { slug: "essentials", name: "Essentials", description: "Everyday pieces, cut to last.", isFeatured: true },
];

const CARE = "Machine wash cold, inside out. Dry flat in the shade. Cool iron.";

const PRODUCTS: SeedProduct[] = [
  {
    slug: "linen-overshirt",
    name: "Linen Overshirt",
    category: "tops",
    pricePaisa: 450_000,
    description:
      "A relaxed overshirt in washed linen with a boxy fit, patch pockets and horn-effect buttons.",
    care: CARE,
    collections: ["monochromium-01"],
    colors: ["Black", "Bone"],
    sizes: ["S", "M", "L", "XL"],
    soldOut: ["Black/XL", "Bone/XL"],
    images: [3, 7, 11],
  },
  {
    slug: "monochrome-oversized-tee",
    name: "Monochrome Oversized Tee",
    category: "tops",
    pricePaisa: 245_000,
    description: "Heavyweight cotton jersey, dropped shoulders and a clean crew neck.",
    care: CARE,
    collections: ["essentials"],
    colors: ["Black", "White"],
    sizes: ["S", "M", "L", "XL"],
    images: [1, 5],
  },
  {
    slug: "grain-heavyweight-hoodie",
    name: "Grain Heavyweight Hoodie",
    category: "tops",
    pricePaisa: 590_000,
    description: "Brushed-back fleece with a double-layer hood and a subtle tonal mark.",
    care: CARE,
    collections: ["monochromium-01"],
    colors: ["Black", "Charcoal"],
    sizes: ["S", "M", "L", "XL"],
    images: [7, 2],
  },
  {
    slug: "ribbed-knit-sweater",
    name: "Ribbed Knit Sweater",
    category: "tops",
    pricePaisa: 520_000,
    description: "A fine rib knit with a close fit and a soft, dry hand.",
    care: "Hand wash cold. Dry flat.",
    collections: ["monochromium-01"],
    colors: ["Charcoal", "Ivory"],
    sizes: ["S", "M", "L"],
    images: [9, 4],
  },
  {
    slug: "tailored-wide-trousers",
    name: "Tailored Wide Trousers",
    category: "bottoms",
    pricePaisa: 480_000,
    description: "High-rise trousers with a pressed crease and a wide, fluid leg.",
    care: CARE,
    collections: ["monochromium-01", "essentials"],
    colors: ["Black", "Grey"],
    sizes: ["28", "30", "32", "34"],
    images: [5, 10],
  },
  {
    slug: "relaxed-cargo-pants",
    name: "Relaxed Cargo Pants",
    category: "bottoms",
    pricePaisa: 420_000,
    description: "Cotton twill cargos with a tapered hem and hidden-snap pockets.",
    care: CARE,
    collections: ["essentials"],
    colors: ["Black"],
    sizes: ["28", "30", "32", "34"],
    images: [2, 8],
  },
  {
    slug: "pleated-midi-skirt",
    name: "Pleated Midi Skirt",
    category: "bottoms",
    pricePaisa: 390_000,
    description: "Knife pleats that move with you, finished with a clean waistband.",
    care: "Hand wash cold. Hang to dry.",
    collections: ["monochromium-01"],
    colors: ["Black"],
    sizes: ["XS", "S", "M", "L"],
    images: [12, 6],
  },
  {
    slug: "monochromium-bomber",
    name: "Monochromium Bomber",
    category: "outerwear",
    pricePaisa: 890_000,
    description: "A padded bomber in matte nylon with ribbed trims and a two-way zip.",
    care: "Wipe clean. Do not tumble dry.",
    collections: ["monochromium-01"],
    colors: ["Black"],
    sizes: ["S", "M", "L", "XL"],
    images: [11, 3],
  },
  {
    slug: "structured-tote",
    name: "Structured Tote",
    category: "accessories",
    pricePaisa: 320_000,
    description: "A structured canvas tote with an inside zip pocket. Fits a 14-inch laptop.",
    collections: ["essentials"],
    colors: ["Black"],
    sizes: [null],
    images: [4, 9],
  },
  {
    slug: "logo-cap",
    name: "Logo Cap",
    category: "accessories",
    pricePaisa: 180_000,
    description: "Six-panel cotton cap with a tonal embroidered mark and an adjustable strap.",
    collections: ["essentials"],
    colors: ["Black", "White"],
    sizes: [null],
    images: [6, 1],
  },
  {
    slug: "silk-scarf",
    name: "Silk Scarf",
    category: "accessories",
    pricePaisa: 260_000,
    description: "A square silk twill scarf printed with a monochrome gradient.",
    collections: ["monochromium-01"],
    colors: [null],
    sizes: [null],
    images: [10],
  },
  {
    slug: "crew-socks-three-pack",
    name: "Crew Socks — Three Pack",
    category: "accessories",
    pricePaisa: 90_000,
    description: "Combed cotton crew socks with a cushioned sole. Three pairs.",
    collections: ["essentials"],
    colors: ["Black", "White"],
    sizes: ["S/M", "L/XL"],
    images: [8],
  },
];

const sku = (slug: string, color: string | null, size: string | null) =>
  [
    "VZ",
    slug
      .split("-")
      .map((w) => w.slice(0, 3))
      .join("")
      .toUpperCase()
      .slice(0, 10),
    color?.slice(0, 3).toUpperCase() ?? "NA",
    size?.replace("/", "").toUpperCase() ?? "OS",
  ].join("-");

async function main() {
  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name, sortOrder: category.sortOrder, archivedAt: null },
    });
    categoryIds.set(category.slug, row.id);
  }

  const collectionIds = new Map<string, string>();
  for (const collection of COLLECTIONS) {
    const row = await db.collection.upsert({
      where: { slug: collection.slug },
      create: collection,
      update: { ...collection, archivedAt: null },
    });
    collectionIds.set(collection.slug, row.id);
  }

  const productIds = new Map<string, string>();
  for (const [index, product] of PRODUCTS.entries()) {
    const variants: SeedVariant[] = product.colors.flatMap((color) =>
      product.sizes.map((size) => ({
        color,
        size,
        stock: product.soldOut?.includes(`${color}/${size}`)
          ? 0
          : 3 + ((index * 7 + (size?.length ?? 1)) % 9),
      })),
    );
    const data = {
      name: product.name,
      description: product.description,
      care: product.care ?? null,
      seoDescription: `${product.name} by Virzeen. ${product.description}`.slice(0, 155),
      categoryId: categoryIds.get(product.category) as string,
      fromPricePaisa: product.pricePaisa,
      isPublished: true,
      archivedAt: null,
      publishedAt: new Date(Date.now() - index * 86_400_000),
    };
    const row = await db.product.upsert({
      where: { slug: product.slug },
      create: { slug: product.slug, ...data },
      update: data,
    });
    productIds.set(product.slug, row.id);

    await db.product.update({
      where: { id: row.id },
      data: {
        collections: { set: product.collections.map((slug) => ({ id: collectionIds.get(slug) as string })) },
      },
    });
    await db.productImage.deleteMany({ where: { productId: row.id } });
    await db.productImage.createMany({
      data: product.images.map((n, sortOrder) => ({
        productId: row.id,
        url: `/placeholder/product-${String(n).padStart(2, "0")}.jpg`,
        alt: `${product.name} — ${sortOrder === 0 ? "front" : "detail"} (placeholder photo)`,
        sortOrder,
      })),
    });
    for (const [sortOrder, variant] of variants.entries()) {
      const code = sku(product.slug, variant.color, variant.size);
      await db.productVariant.upsert({
        where: { sku: code },
        create: { productId: row.id, sku: code, ...variant, pricePaisa: product.pricePaisa, sortOrder },
        update: { ...variant, pricePaisa: product.pricePaisa, isActive: true, sortOrder },
      });
    }
  }

  const projects = [
    {
      slug: "preorder-starting-soon",
      title: "Preorder starting soon",
      kind: "CAMPAIGN" as const,
      summary: "The first Virzeen pieces are almost here. A quiet announcement in black and white.",
      coverUrl: "/brand/preorder-poster.jpg",
      coverAlt: "A blurred Virzeen mark above the words Preorder Starting Soon",
      sortOrder: 1,
      products: [
        "linen-overshirt",
        "grain-heavyweight-hoodie",
        "monochromium-bomber",
        "tailored-wide-trousers",
      ],
      body: [
        {
          type: "text",
          heading: "Stay tuned",
          text: "Our first collection opens for preorder soon. Every piece is designed in monochrome — nothing to distract from cut, texture and proportion.",
        },
        {
          type: "image",
          url: "/placeholder/story-03.jpg",
          alt: "Soft light falling across a grey backdrop (placeholder)",
          caption: "Placeholder imagery — campaign photography coming soon.",
          layout: "full",
        },
        {
          type: "text",
          text: "Preorders will be paid online with eSewa or Khalti, or on delivery with cash.",
        },
      ],
    },
    {
      slug: "monochromium-01",
      title: "Monochromium 01",
      kind: "LOOKBOOK" as const,
      summary: "Black, white and every grey between: the first Virzeen lookbook.",
      coverUrl: "/brand/cover.jpg",
      coverAlt: "A grainy gradient from light grey to black",
      sortOrder: 2,
      products: ["ribbed-knit-sweater", "pleated-midi-skirt", "monochrome-oversized-tee", "structured-tote"],
      body: [
        {
          type: "text",
          heading: "Timeless monochromium",
          text: "Colour removed, form remains. The lookbook explores texture under changing light.",
        },
        {
          type: "image",
          url: "/placeholder/story-01.jpg",
          alt: "Light gradient study (placeholder)",
          layout: "inset",
        },
        {
          type: "image",
          url: "/placeholder/story-05.jpg",
          alt: "Dark gradient study (placeholder)",
          layout: "full",
        },
      ],
    },
    {
      slug: "light-studies",
      title: "Light studies",
      kind: "LOOKBOOK" as const,
      summary: "How a single light source shapes fabric, from highlight to deep shadow.",
      coverUrl: "/placeholder/story-02.jpg",
      coverAlt: "A soft spotlight on a grey wall (placeholder)",
      sortOrder: 3,
      products: ["silk-scarf", "logo-cap"],
      body: [{ type: "text", text: "A short study in light and shade. Full story coming soon." }],
    },
  ];
  for (const project of projects) {
    const { products, ...data } = project;
    await db.portfolioProject.upsert({
      where: { slug: project.slug },
      create: {
        ...data,
        isPublished: true,
        publishedAt: new Date(),
        products: { connect: products.map((slug) => ({ id: productIds.get(slug) as string })) },
      },
      update: {
        ...data,
        isPublished: true,
        archivedAt: null,
        products: { set: products.map((slug) => ({ id: productIds.get(slug) as string })) },
      },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  if (adminEmail) {
    await db.user.upsert({
      where: { email: adminEmail },
      create: {
        id: randomUUID().replace(/-/g, ""),
        email: adminEmail,
        name: "Virzeen Admin",
        emailVerified: true,
        role: "ADMIN",
      },
      update: { role: "ADMIN" },
    });
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ${projects.length} portfolio projects${adminEmail ? `, admin ${adminEmail}` : ""}.`,
  );
}

await main();
await db.$disconnect();
