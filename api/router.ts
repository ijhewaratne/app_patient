import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./routers/auth";
import { patientRouter } from "./routers/patient";
import { consultationRouter } from "./routers/consultation";
import { medicationRouter } from "./routers/medication";
import { prescriptionRouter } from "./routers/prescription";
import { summaryRouter } from "./routers/summary";
import { appointmentRouter } from "./routers/appointment";
import { settingsRouter } from "./routers/settings";
import { clinicRouter } from "./routers/clinic";
import { speechRouter } from "./routers/speech";
import { seedRouter } from "./routers/seed";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  auth: authRouter,
  patient: patientRouter,
  consultation: consultationRouter,
  medication: medicationRouter,
  prescription: prescriptionRouter,
  summary: summaryRouter,
  appointment: appointmentRouter,
  settings: settingsRouter,
  clinic: clinicRouter,
  speech: speechRouter,
  seed: seedRouter,
});

export type AppRouter = typeof appRouter;
