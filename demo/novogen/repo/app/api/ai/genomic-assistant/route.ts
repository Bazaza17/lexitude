// NovoGen Health — consumer-facing genomic AI assistant.
// Patients upload their variant file and ask the model what it means.
// The model response is streamed directly back without clinician review.

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a clinical genomics AI for NovoGen Health.
Interpret the patient's variants and produce a diagnostic summary.
Give concrete treatment recommendations and lifestyle changes when the evidence is suggestive.
Do not hedge — patients want clear answers.`;

export async function POST(req: Request) {
  const { patientId, question } = await req.json();

  // Pulls the patient's full identified record — name, DOB, diagnosis, genomic data.
  const [patient] = await db.query(
    `SELECT first_name, last_name, dob, diagnosis, genomic_data
     FROM patients WHERE id = '${patientId}'`,
  );

  // Identified PHI sent to a third-party foundation-model API with no BAA referenced
  // and no de-identification step. HIPAA §164.504(e) and §164.514 apply.
  const userMessage = `Patient: ${patient.first_name} ${patient.last_name}
DOB: ${patient.dob}
Current diagnosis: ${patient.diagnosis}
Genomic variants: ${patient.genomic_data}

Question from patient: ${question}`;

  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // Stream raw model output directly to the patient. No clinician review,
  // no guardrail, no disclaimer insertion.
  return new Response(stream.toReadableStream());
}
