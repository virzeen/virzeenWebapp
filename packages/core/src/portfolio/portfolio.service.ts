import "server-only";
import { db, type Prisma } from "@virzeen/db";
import { parsePortfolioBody, type PortfolioProjectInput } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError, isUniqueViolation } from "../errors";
import { catalogReads } from "../catalog/catalog.reads";

const publishedWhere = { isPublished: true, archivedAt: null } satisfies Prisma.PortfolioProjectWhereInput;

export const portfolioService = {
  async listPublished(limit?: number) {
    return db.portfolioProject.findMany({
      where: publishedWhere,
      select: {
        id: true,
        slug: true,
        title: true,
        kind: true,
        summary: true,
        coverUrl: true,
        coverAlt: true,
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });
  },

  async getPublishedBySlug(slug: string) {
    const project = await db.portfolioProject.findFirst({
      where: { ...publishedWhere, slug },
      select: {
        id: true,
        slug: true,
        title: true,
        kind: true,
        summary: true,
        coverUrl: true,
        coverAlt: true,
        body: true,
        publishedAt: true,
        products: { select: { id: true } },
      },
    });
    if (!project) return null;
    const products = await catalogReads.listByIds(project.products.map((p) => p.id));
    return { ...project, body: parsePortfolioBody(project.body), products };
  },

  // ── Admin ──

  async listForAdmin() {
    return db.portfolioProject.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        kind: true,
        isPublished: true,
        sortOrder: true,
        updatedAt: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  },

  async getForAdmin(id: string) {
    const project = await db.portfolioProject.findFirst({
      where: { id, archivedAt: null },
      select: {
        id: true,
        slug: true,
        title: true,
        kind: true,
        summary: true,
        coverUrl: true,
        coverAlt: true,
        body: true,
        isPublished: true,
        sortOrder: true,
        products: { select: { id: true } },
      },
    });
    if (!project) throw new AppError("NOT_FOUND", "Project not found.");
    return {
      ...project,
      body: parsePortfolioBody(project.body),
      productIds: project.products.map((p) => p.id),
    };
  },

  async save(actorId: string, input: { id?: string | undefined; project: PortfolioProjectInput }) {
    const { project } = input;
    try {
      return await db.$transaction(async (tx) => {
        const existing = input.id
          ? await tx.portfolioProject.findFirst({
              where: { id: input.id, archivedAt: null },
              select: { id: true, publishedAt: true },
            })
          : null;
        if (input.id && !existing) throw new AppError("NOT_FOUND", "Project not found.");
        const data = {
          title: project.title,
          slug: project.slug,
          kind: project.kind,
          summary: project.summary,
          coverUrl: project.coverUrl,
          coverAlt: project.coverAlt,
          body: project.body as Prisma.InputJsonValue,
          isPublished: project.isPublished,
          sortOrder: project.sortOrder,
          publishedAt: project.isPublished
            ? (existing?.publishedAt ?? new Date())
            : (existing?.publishedAt ?? null),
        };
        const saved = existing
          ? await tx.portfolioProject.update({
              where: { id: existing.id },
              data: { ...data, products: { set: project.productIds.map((id) => ({ id })) } },
              select: { id: true, slug: true },
            })
          : await tx.portfolioProject.create({
              data: { ...data, products: { connect: project.productIds.map((id) => ({ id })) } },
              select: { id: true, slug: true },
            });
        await recordAudit(tx, {
          actorId,
          action: existing ? "portfolio.update" : "portfolio.create",
          entity: "PortfolioProject",
          entityId: saved.id,
          diff: { title: project.title, isPublished: project.isPublished },
        });
        return saved;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("VALIDATION_FAILED", "This slug is already used.", {
          fields: { slug: "This slug is already used" },
        });
      }
      throw error;
    }
  },

  async archive(actorId: string, id: string) {
    return db.$transaction(async (tx) => {
      const updated = await tx.portfolioProject.updateMany({
        where: { id, archivedAt: null },
        data: { archivedAt: new Date(), isPublished: false },
      });
      if (updated.count === 0) throw new AppError("NOT_FOUND", "Project not found.");
      await recordAudit(tx, {
        actorId,
        action: "portfolio.archive",
        entity: "PortfolioProject",
        entityId: id,
      });
      return { id };
    });
  },
};
