import { describe, expect, it } from "vitest";
import { suggestCategory } from "../../lib/category-suggest";

// Every demo seed title with the category a person picked for it.
const seed: [string, string][] = [
  ["2 BHK flat for rent, semi furnished, near metro", "property"],
  ["3 seater fabric sofa, 2 years old, no stains", "furniture"],
  ["Baby stroller, foldable, used for 8 months", "kids"],
  ["Dell Inspiron laptop, i5 11th gen, 8 GB RAM", "electronics"],
  ["Handmade bangles set, free to a good home", "fashion"],
  ["Home tuition for class 8 to 10 maths, first class free", "services"],
  ["Honda Activa 6G 2022, 9,000 km, all papers clear", "bikes"],
  ["Hyundai i10 2016, well kept, insurance till March", "vehicles"],
  ["iPhone 13, 128 GB, battery 89%, with bill and box", "mobiles"],
  ["Kanchipuram silk saree, worn once at a wedding", "fashion"],
  ["Labrador puppies for adoption, vaccinated", "pets"],
  ["Ladies cycle, 26 inch, swap for a kids cycle", "bikes"],
  ["Looking for a 1 BHK on rent for a working couple", "property"],
  ["Looking for an acoustic guitar for a beginner", "hobbies"],
  ["MacBook Air M1, 256 GB, 180 battery cycles", "electronics"],
  ["Maruti Swift VXI 2018, petrol, 42,000 km, second owner", "vehicles"],
  ["Need JEE Main previous year papers, any edition", "books"],
  ["Pram with sun cover, free, pickup only", "kids"],
  ["Redmi Note 12, 6/128 GB, single hand used", "mobiles"],
  ["Royal Enfield Classic 350, 2021, 18,000 km, first owner", "bikes"],
  ["Samsung 43 inch smart TV, 2021, with remote", "electronics"],
  ["UPSC and NCERT book set, free to a student", "books"],
  ["Want to adopt an indie puppy, can foster first", "pets"],
  ["Yamaha F280 acoustic guitar with bag", "hobbies"],
];

describe("suggestCategory", () => {
  it.each(seed)("%s -> %s", (title, slug) => {
    expect(suggestCategory(title)).toBe(slug);
  });

  it("returns null when no word matches", () => {
    expect(suggestCategory("Misc items, contact for details")).toBeNull();
  });
});
