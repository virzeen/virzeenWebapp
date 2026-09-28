"use server";

import "server-only";
import { portfolioService } from "@virzeen/core";
import { archiveSchema, savePortfolioProjectSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAdminAction } from "./guard";

export async function savePortfolioProjectAction(input: unknown) {
  return runAdminAction("savePortfolioProject", async (admin) => {
    const { id, project } = savePortfolioProjectSchema.parse(input);
    const saved = await portfolioService.save(admin.id, { id, project });
    revalidatePath("/portfolio", "layout");
    revalidatePath("/");
    return saved;
  });
}

export async function archivePortfolioProjectAction(input: unknown) {
  return runAdminAction("archivePortfolioProject", async (admin) => {
    const { id } = archiveSchema.parse(input);
    const result = await portfolioService.archive(admin.id, id);
    revalidatePath("/portfolio", "layout");
    revalidatePath("/");
    return result;
  });
}
