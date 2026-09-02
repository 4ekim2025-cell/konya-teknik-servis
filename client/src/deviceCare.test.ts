import { describe, expect, it } from "vitest";
import { deviceCare } from "./deviceCare";

const deviceNames = [
  "Çamaşır Makinesi", "Bulaşık Makinesi", "Kurutma Makinesi", "Fırın", "Ocak",
  "Buzdolabı", "Elektrikli Süpürge", "Davlumbaz", "Derin Dondurucu", "Su Sebili"
];

describe("device-specific care guidance", () => {
  it("defines four practical checks for every device page", () => {
    expect(Object.keys(deviceCare)).toEqual(deviceNames);
    for (const name of deviceNames) {
      expect(deviceCare[name]).toHaveLength(4);
      expect(deviceCare[name].every((tip) => tip.title.length > 8 && tip.text.length > 50)).toBe(true);
    }
  });

  it("includes safe boundaries before customer intervention", () => {
    const allText = Object.values(deviceCare).flat().map((tip) => tip.text).join(" ");
    expect(allText).toMatch(/kılavuz|müdahale etmeyin|kapalı|fişini çekin/i);
    expect(allText).toMatch(/gaz kokusu|duman|yanık kokusu|elektrik/i);
  });
});
