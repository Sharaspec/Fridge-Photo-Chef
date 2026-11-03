// Sample fridges people can explore without taking a photo.
// Picking one skips the Gemini photo scan entirely (no quota used).

import type { Ingredient } from "./types";

export type SampleId = "student" | "veggie" | "breakfast" | "taco";

export interface SampleFridge {
  id: SampleId;
  caption: string;
  blurb: string;
  ingredients: Ingredient[];
}

const i = (name: string, kind: Ingredient["kind"]): Ingredient => ({ name, confidence: 0.95, kind });

export const SAMPLES: SampleFridge[] = [
  {
    id: "student",
    caption: "Student fridge",
    blurb: "Eggs, cheese & leftover rice",
    ingredients: [
      i("egg", "egg"),
      i("cheddar cheese", "dairy"),
      i("rice", "plant"),
      i("spinach", "plant"),
      i("tomato", "plant"),
      i("onion", "plant"),
      i("milk", "dairy"),
      i("butter", "dairy"),
    ],
  },
  {
    id: "veggie",
    caption: "Veggie drawer",
    blurb: "Crunchy, colorful, meat-free",
    ingredients: [
      i("broccoli", "plant"),
      i("carrot", "plant"),
      i("bell pepper", "plant"),
      i("mushroom", "plant"),
      i("garlic", "plant"),
      i("lemon", "plant"),
    ],
  },
  {
    id: "breakfast",
    caption: "Breakfast shelf",
    blurb: "Morning staples, sweet or savory",
    ingredients: [
      i("egg", "egg"),
      i("banana", "plant"),
      i("oat", "plant"),
      i("greek yogurt", "dairy"),
      i("blueberry", "plant"),
      i("bread", "plant"),
    ],
  },
  {
    id: "taco",
    caption: "Taco night",
    blurb: "Tortillas, avocado & lime",
    ingredients: [
      i("chicken", "meat"),
      i("tortilla", "plant"),
      i("avocado", "plant"),
      i("lime", "plant"),
      i("tomato", "plant"),
      i("black bean", "plant"),
      i("cilantro", "plant"),
    ],
  },
];
