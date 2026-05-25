import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { appointments, patients } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const appointmentRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        date: z.string().optional(),
        status: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.date) {
        conditions.push(eq(appointments.appointmentDate, new Date(input.date)));
      }

      if (input?.status) {
        conditions.push(eq(appointments.status, input.status as "scheduled" | "waiting" | "in_session" | "completed" | "cancelled"));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          appointment: appointments,
          patient: patients,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .where(where)
        .orderBy(appointments.appointmentTime);

      return result;
    }),

  getToday: publicQuery.query(async () => {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return db
      .select({
        appointment: appointments,
        patient: patients,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.appointmentDate, today))
      .orderBy(appointments.appointmentTime);
  }),

  create: publicQuery
    .input(
      z.object({
        patientId: z.number(),
        appointmentDate: z.string(),
        appointmentTime: z.string().optional(),
        type: z.enum(["new", "follow_up"]).default("follow_up"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(appointments).values({
        patientId: input.patientId,
        appointmentDate: new Date(input.appointmentDate),
        appointmentTime: input.appointmentTime ?? null,
        type: input.type,
        notes: input.notes ?? null,
        status: "scheduled",
      });
      return {
        id: Number(result[0].insertId),
        ...input,
        status: "scheduled" as const,
      };
    }),

  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["scheduled", "waiting", "in_session", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(appointments)
        .set({ status: input.status })
        .where(eq(appointments.id, input.id));
      const updated = await db.select().from(appointments).where(eq(appointments.id, input.id));
      return updated[0];
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(appointments).where(eq(appointments.id, input.id));
      return { success: true };
    }),
});
