import { z } from "zod";

export const todoSchema = z.object({
  text: z.string().min(1, "Todo text is required"),
});
