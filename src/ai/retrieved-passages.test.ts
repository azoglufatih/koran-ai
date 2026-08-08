import { describe, expect, it } from "vitest";
import type { RetrievedPassage } from "@/retrieval/corpus-retriever";
import type { ChatMessage } from "./ai-client";
import { retrievalQuestion, retrievedPassagesPrompt } from "./retrieved-passages";
import type { VerseContext } from "./verse-context";

const ASKING_ABOUT_2_45: VerseContext = {
  ref: { surah: 2, ayah: 45 },
  arabic: "وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ",
  translation: { language: "en", text: "Seek help in steadfastness and prayer" },
  // The reader has selected "steadfastness".
  selection: { in: "translation", start: 13, end: 26 },
};

describe("retrievalQuestion", () => {
  const asked = (...messages: ChatMessage[]) => messages;

  it("searches on what the reader asked", () => {
    expect(retrievalQuestion(asked({ role: "user", content: "What is steadfastness?" }), undefined))
      .toBe("What is steadfastness?");
  });

  it("searches on the words the reader selected as well", () => {
    const question = retrievalQuestion(
      asked({ role: "user", content: "What does this mean?" }),
      ASKING_ABOUT_2_45,
    );

    // The question alone shares no word with the corpus; the selection is the whole of the search.
    expect(question).toBe("What does this mean? steadfastness");
  });

  it("searches on the latest question, not the one before it", () => {
    const question = retrievalQuestion(
      asked(
        { role: "user", content: "Who was Thamud?" },
        { role: "assistant", content: "A people to whom Salih was sent." },
        { role: "user", content: "What is steadfastness?" },
      ),
      undefined,
    );

    expect(question).toBe("What is steadfastness?");
  });

  it("searches on nothing when the reader has asked nothing", () => {
    expect(retrievalQuestion([], undefined)).toBe("");
  });
});

describe("retrievedPassagesPrompt", () => {
  const PASSAGES: RetrievedPassage[] = [
    {
      ref: { surah: 2, ayah: 45 },
      kind: "translation",
      text: "Seek help in steadfastness and prayer",
    },
    {
      ref: { surah: 94, ayah: 5 },
      kind: "tafsir",
      text: "With every hardship there comes an ease that follows it",
    },
  ];

  it("gives the model the corpus's own words, not the terms they were matched on", () => {
    const prompt = retrievedPassagesPrompt(PASSAGES);

    expect(prompt).toContain("Seek help in steadfastness and prayer");
    expect(prompt).toContain("With every hardship there comes an ease that follows it");
  });

  it("names the Ayah and the rendering each passage is, so an answer can cite it", () => {
    const prompt = retrievedPassagesPrompt(PASSAGES);

    expect(prompt).toContain("2:45 — translation");
    expect(prompt).toContain("94:5 — tafsir");
  });

  it("tells the model these were found by wording, so it can pass over the ones that missed", () => {
    expect(retrievedPassagesPrompt(PASSAGES)).toMatch(/shared wording|not by meaning/);
  });
});
