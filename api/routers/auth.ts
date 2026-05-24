import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// Simple password hashing using built-in crypto
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "medilogix-salt");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const authRouter = createRouter({
  login: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const passwordHash = await hashPassword(input.password);

      const result = await db
        .select()
        .from(users)
        .where(eq(users.name, input.name));

      const user = result[0];
      if (!user || user.passwordHash !== passwordHash) {
        throw new Error("Invalid credentials");
      }

      if (!user.isActive) {
        throw new Error("Account is inactive");
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        token: `${user.id}:${passwordHash}`,
      };
    }),

  me: publicQuery
    .input(z.object({ token: z.string() }).optional())
    .query(async ({ input }) => {
      if (!input?.token) return null;
      const [userId] = input.token.split(":");
      if (!userId) return null;

      const db = getDb();
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(userId)));

      const user = result[0];
      if (!user || !user.isActive) return null;

      return {
        id: user.id,
        name: user.name,
        role: user.role,
      };
    }),

  setup: publicQuery.mutation(async () => {
    const db = getDb();
    const existing = await db.select().from(users);
    if (existing.length > 0) {
      return { message: "Already set up" };
    }

    const passwordHash = await hashPassword("admin");
    await db.insert(users).values({
      name: "Doctor",
      role: "doctor",
      passwordHash,
      isActive: true,
    });

    return { message: "Setup complete. Default password: admin" };
  }),
});
