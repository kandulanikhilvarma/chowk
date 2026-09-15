// Title words to category slug (slugs from supabase/seed/01_reference.sql). No AI call, no cost.
// ponytail: keyword hit count, first category wins a tie. Swap for a trained classifier if picks go wrong often.
const KEYWORDS: Record<string, string[]> = {
  mobiles: ["iphone", "phone", "mobile", "smartphone", "redmi", "galaxy", "oneplus", "realme", "vivo", "oppo", "poco", "pixel", "motorola"],
  vehicles: ["car", "swift", "i10", "i20", "creta", "innova", "scorpio", "alto", "wagonr", "baleno", "nexon", "xuv", "sedan", "suv", "hatchback", "hyundai", "maruti"],
  bikes: ["bike", "activa", "scooty", "scooter", "splendor", "pulsar", "royal enfield", "bullet", "cycle", "bicycle", "ktm", "apache", "jupiter"],
  furniture: ["sofa", "bed", "table", "chair", "wardrobe", "almirah", "mattress", "dining", "cot", "shelf", "cupboard", "seater"],
  electronics: ["laptop", "macbook", "tv", "television", "fridge", "refrigerator", "washing machine", "ac", "camera", "speaker", "headphones", "monitor", "printer", "cooler", "microwave", "ipad", "tablet"],
  property: ["bhk", "1rk", "flat", "apartment", "house", "plot", "pg", "rent", "villa", "office space"],
  fashion: ["saree", "sari", "kurta", "lehenga", "shoes", "sneakers", "dress", "jeans", "jacket", "bangles", "watch", "handbag", "sherwani"],
  books: ["book", "books", "novel", "ncert", "upsc", "jee", "neet", "textbook", "papers"],
  kids: ["stroller", "pram", "baby", "toy", "toys", "crib", "kids", "school bag"],
  hobbies: ["guitar", "piano", "tabla", "harmonium", "drums", "violin", "cricket bat", "badminton", "dumbbell", "dumbbells", "treadmill", "carrom", "chess"],
  pets: ["puppy", "puppies", "dog", "cat", "kitten", "labrador", "aquarium", "adopt", "adoption"],
  services: ["tuition", "tutor", "repair", "plumber", "electrician", "coaching", "cleaning", "painting", "movers", "packers"],
};

export function suggestCategory(title: string): string | null {
  const t = ` ${title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  let best: string | null = null;
  let bestHits = 0;
  for (const [slug, words] of Object.entries(KEYWORDS)) {
    const hits = words.filter((w) => t.includes(` ${w} `)).length;
    if (hits > bestHits) [best, bestHits] = [slug, hits];
  }
  return best;
}
