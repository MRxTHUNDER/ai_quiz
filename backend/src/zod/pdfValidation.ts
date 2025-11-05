import z from "zod";

export const createPdfBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
});
