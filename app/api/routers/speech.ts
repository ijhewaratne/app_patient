import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";

export const speechRouter = createRouter({
  refineText: publicQuery
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      const text = input.text;

      // Simple rule-based medical text refinement
      // In production, this would call an AI service
      let refined = text
        // Capitalize first letter of sentences
        .replace(/(^.|\.\s+)([a-z])/g, (_, sep, char) => sep + char.toUpperCase())
        // Fix common speech-to-text issues
        .replace(/\s+/g, " ")
        .trim()
        // Add period at end if missing
        .replace(/([^\.!?])$/, "$1.")
        // Fix common medical abbreviations
        .replace(/\bdaily\b/gi, "daily")
        .replace(/\btwice daily\b/gi, "twice daily")
        .replace(/\bthree times daily\b/gi, "three times daily")
        .replace(/\bpatient\b/gi, "patient")
        .replace(/\bmedication\b/gi, "medication")
        .replace(/\bprescription\b/gi, "prescription")
        // Fix common typos
        .replace(/\bteh\b/gi, "the")
        .replace(/\bhte\b/gi, "the")
        .replace(/\badn\b/gi, "and")
        .replace(/\bhte\b/gi, "the")
        .replace(/\bwiat\b/gi, "wait")
        .replace(/\bsymptom\b/gi, "symptom")
        // Ensure consistent spacing after punctuation
        .replace(/([.,;:])([^\s])/g, "$1 $2");

      // Structure the text into paragraphs if it's long
      if (refined.length > 200) {
        const sentences = refined.match(/[^.!?]+[.!?]+/g) || [refined];
        const paragraphs: string[] = [];
        let currentParagraph = "";

        for (const sentence of sentences) {
          currentParagraph += sentence.trim() + " ";
          if (currentParagraph.length > 150) {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = "";
          }
        }

        if (currentParagraph) {
          paragraphs.push(currentParagraph.trim());
        }

        refined = paragraphs.join("\n\n");
      }

      return { refinedText: refined };
    }),
});
