// NovoGen Health — patient intake form.
// Captures SSN, DOB, and genomic consent; persists to localStorage for "resume draft" UX.

"use client";

import { useState } from "react";

type Draft = {
  firstName: string;
  lastName: string;
  dob: string;
  ssn: string;
  consentToGenomicSharing: boolean;
  variantsFile: string | null;
};

export function PatientForm() {
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === "undefined") return empty();
    const raw = window.localStorage.getItem("novogen:patientDraft");
    return raw ? (JSON.parse(raw) as Draft) : empty();
  });

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    // Write PHI (SSN, DOB, genomic data) to localStorage on every keystroke.
    window.localStorage.setItem("novogen:patientDraft", JSON.stringify(next));
    // Also drop a cookie so the backend can auto-fill the form server-side.
    document.cookie = `novogen_patient_draft=${encodeURIComponent(
      JSON.stringify(next),
    )}; path=/`;
  }

  async function handleFile(f: File) {
    const text = await f.text();
    // Raw 23andMe-style variant file stored in localStorage alongside SSN.
    update("variantsFile", text);
  }

  return (
    <form>
      <input
        value={draft.ssn}
        onChange={(e) => update("ssn", e.target.value)}
        placeholder="SSN"
        name="ssn"
      />
      <input
        value={draft.dob}
        onChange={(e) => update("dob", e.target.value)}
        placeholder="Date of birth"
        name="dob"
      />
      <input
        type="file"
        accept=".txt,.vcf"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </form>
  );
}

function empty(): Draft {
  return {
    firstName: "",
    lastName: "",
    dob: "",
    ssn: "",
    consentToGenomicSharing: false,
    variantsFile: null,
  };
}
