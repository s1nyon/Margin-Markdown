import { describe, expect, it } from "vitest";
import {
  layoutCollapsibleMargin,
  layoutMarginCards,
} from "../src/core/margin-layout";

describe("margin card layout", () => {
  it("keeps cards ordered and non-overlapping", () => {
    const result = layoutMarginCards(
      [
        { id: "c", anchorY: 220, height: 80 },
        { id: "a", anchorY: 100, height: 60 },
        { id: "b", anchorY: 115, height: 70 },
      ],
      { pageHeight: 500, padding: 10, gap: 8 },
    );

    expect(result.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(result[0].y).toBeGreaterThanOrEqual(10);
    expect(result[1].y).toBeGreaterThanOrEqual(result[0].y + result[0].height + 8);
    expect(result[2].y).toBeGreaterThanOrEqual(result[1].y + result[1].height + 8);
    expect(result[2].y + result[2].height).toBeLessThanOrEqual(490);
  });

  it("preserves controls instead of overlapping when a page is overfull", () => {
    const result = layoutMarginCards(
      Array.from({ length: 5 }, (_, index) => ({
        id: String(index),
        anchorY: 20 + index * 10,
        height: 70,
      })),
      { pageHeight: 200, gap: 5 },
    );

    for (let index = 1; index < result.length; index += 1) {
      expect(result[index].y).toBeGreaterThanOrEqual(
        result[index - 1].y + result[index - 1].height + 5,
      );
    }
  });

  it("folds the remaining cards into a bottom summary", () => {
    const result = layoutCollapsibleMargin(
      [
        { id: "a", anchorY: 20, height: 60 },
        { id: "b", anchorY: 90, height: 60 },
        { id: "c", anchorY: 160, height: 60 },
        { id: "d", anchorY: 230, height: 60 },
      ],
      { pageHeight: 220, padding: 8, gap: 8, summaryHeight: 34 },
    );

    expect(result.overflow).toBe(true);
    expect(result.positions.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.hiddenIDs).toEqual(["c", "d"]);
    expect(result.summaryY).toBe(178);
  });

  it("lays out every card in a scrollable expanded column", () => {
    const result = layoutCollapsibleMargin(
      Array.from({ length: 5 }, (_, index) => ({
        id: String(index),
        anchorY: 20 + index * 30,
        height: 70,
      })),
      { pageHeight: 220, padding: 8, gap: 8, expanded: true },
    );

    expect(result.positions).toHaveLength(5);
    expect(result.hiddenIDs).toEqual([]);
    expect(result.contentHeight).toBeGreaterThan(220);
  });

  it("keeps the hovered card anchored while expanded and pushes later cards down", () => {
    const result = layoutCollapsibleMargin(
      [
        { id: "above", anchorY: 20, height: 48 },
        { id: "hovered", anchorY: 90, height: 160 },
        { id: "below", anchorY: 150, height: 60 },
      ],
      {
        pageHeight: 220,
        padding: 8,
        gap: 8,
        stableAnchor: {
          id: "hovered",
          top: 64,
          previousPositions: new Map([
            ["above", 8],
            ["hovered", 64],
            ["below", 112],
          ]),
        },
      },
    );

    expect(result.positions.map(({ id }) => id)).toEqual(["above", "hovered", "below"]);
    expect(result.positions[1].y).toBe(64);
    expect(result.positions[2].y).toBeGreaterThanOrEqual(
      result.positions[1].y + result.positions[1].height + 8,
    );
    expect(result.hiddenIDs).toEqual([]);
    expect(result.overflow).toBe(true);
  });
});
