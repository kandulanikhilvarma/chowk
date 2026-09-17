"use client";

import Link from "next/link";
import { ImagePlus, Lightbulb, ShieldAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { z } from "zod";
import { createListing, updateListing } from "@/app/post/actions";
import { buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { suggestCategory } from "@/lib/category-suggest";
import type { Json } from "@/lib/database.types";
import { requireAccount } from "@/lib/require-account";
import { formatPrice } from "@/lib/format";
import { FULL_PX, PhotoError, THUMB_PX, resizeImage } from "@/lib/images";
import { MAX_PHOTOS, listingSchema, listingStrength, type ListingInput } from "@/lib/listing-schema";
import { findProhibited } from "@/lib/prohibited";
import { createClient } from "@/lib/supabase/browser";

type AttributeField = { key: string; label: string; type: string; unit?: string; options?: string[] };
type Category = { id: number; slug: string; name: string; attribute_schema: Json };
type City = { id: number; name: string };
type Resized = Awaited<ReturnType<typeof resizeImage>>;
type StoredFile = ListingInput["photos"][number];
// A photo is either already in storage (edit) or a resized file that still needs an upload.
type Photo = { id: string; preview: string } & ({ saved: StoredFile } | { saved?: undefined; full: Resized; thumb: Resized });
type Hint = { median_paise: number; low_paise: number; high_paise: number } | null;

export type SavedPhoto = StoredFile & { url: string };

const DRAFT_KEY = "chowk:post-draft";
const blank = {
  kind: "offer" as "offer" | "wanted",
  title: "",
  description: "",
  categoryId: "",
  priceType: "fixed" as ListingInput["priceType"],
  price: "",
  condition: "",
  cityId: "",
  locality: "",
  pincode: "",
  attributes: {} as Record<string, string | boolean>,
};
export type PostDraft = typeof blank;

const input = "h-11 w-full rounded-field border border-line bg-surface px-3 text-[15px] text-ink";
const labelClass = "mb-1 block text-sm font-medium text-ink";
const priceTypes = [
  ["fixed", "Fixed price"],
  ["negotiable", "Negotiable"],
  ["free", "Free"],
  ["swap", "Swap"],
] as const;
const conditions = [
  ["new", "New"],
  ["like_new", "Like new"],
  ["good", "Good"],
  ["fair", "Fair"],
  ["for_parts", "For parts"],
] as const;

// localStorage can throw (private mode, blocked storage). The draft is a convenience, so failures are ignored.
function readDraft() {
  try {
    return localStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
}
function writeDraft(d: PostDraft | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
}
const noSubscribe = () => () => {};

function toInput(d: PostDraft, photos: ListingInput["photos"], acceptTerms: boolean): ListingInput {
  return {
    kind: d.kind,
    title: d.title,
    description: d.description,
    categoryId: Number(d.categoryId) || 0,
    priceType: d.priceType,
    priceRupees: d.price === "" ? null : Number(d.price),
    condition: (d.condition || null) as ListingInput["condition"],
    cityId: Number(d.cityId) || 0,
    locality: d.locality,
    pincode: d.pincode,
    attributes: d.attributes,
    photos,
    acceptTerms,
  };
}

export function PostForm({
  categories,
  cities,
  needsTerms,
  edit,
}: {
  categories: Category[];
  cities: City[];
  needsTerms: boolean;
  edit?: { id: string; draft: PostDraft; photos: SavedPhoto[] };
}) {
  const router = useRouter();
  const savedDraft = useSyncExternalStore(noSubscribe, readDraft, () => null);
  const [step, setStep] = useState<1 | 2>(edit ? 2 : 1);
  const [photos, setPhotos] = useState<Photo[]>(
    () => edit?.photos.map(({ url, ...saved }) => ({ id: saved.path, preview: url, saved })) ?? [],
  );
  const [draft, setDraft] = useState<PostDraft>(edit?.draft ?? blank);
  const [touched, setTouched] = useState(Boolean(edit));
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [hint, setHint] = useState<Hint>(null);
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();

  const category = categories.find((c) => String(c.id) === draft.categoryId);
  const schema = (Array.isArray(category?.attribute_schema) ? category.attribute_schema : []) as AttributeField[];
  const suggested = draft.categoryId ? null : categories.find((c) => c.slug === suggestCategory(draft.title));
  const banned = findProhibited(`${draft.title} ${draft.description}`);
  const noPrice = draft.priceType === "free" || draft.priceType === "swap";
  const strength = listingStrength({
    title: draft.title,
    description: draft.description,
    photos: photos.length,
    priceSet: noPrice || draft.price !== "",
    placeSet: Boolean(draft.categoryId && draft.cityId),
  });

  function update(patch: Partial<PostDraft>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setTouched(true);
    // Edits save to the ad itself. Only a new ad keeps a local draft.
    if (!edit) writeDraft(next);
    if (patch.categoryId !== undefined) loadHint(patch.categoryId);
  }

  async function loadHint(categoryId: string) {
    setHint(null);
    if (!categoryId) return;
    const { data } = await createClient().rpc("price_hint", { p_category: Number(categoryId) });
    setHint(data as Hint);
  }

  async function addPhotos(files: FileList | null) {
    setPhotoError("");
    for (const file of Array.from(files ?? []).slice(0, MAX_PHOTOS - photos.length)) {
      try {
        const [full, thumb] = await Promise.all([resizeImage(file, FULL_PX), resizeImage(file, THUMB_PX)]);
        const photo: Photo = { id: crypto.randomUUID(), full, thumb, preview: URL.createObjectURL(thumb.blob) };
        setPhotos((p) => (p.length < MAX_PHOTOS ? [...p, photo] : p));
      } catch (e) {
        setPhotoError(e instanceof PhotoError ? e.message : "This photo did not open. Try a different photo.");
      }
    }
  }

  function removePhoto(id: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.id === id);
      if (gone && !gone.saved) URL.revokeObjectURL(gone.preview);
      return p.filter((x) => x.id !== id);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const placeholder = photos.map(() => ({ path: "-", thumbPath: "-", width: 1, height: 1 }));
    const check = listingSchema.safeParse(toInput(draft, placeholder, acceptTerms));
    if (!check.success) {
      setFields(z.flattenError(check.error).fieldErrors);
      return setError("Check the marked fields.");
    }
    setFields({});
    if (banned) return setError(`Chowk does not allow ${banned.group}. Remove "${banned.term}".`);
    if (needsTerms && !acceptTerms) return setError("Accept the terms to post your first ad.");

    startTransition(async () => {
      setStatus("Getting ready");
      const uid = await requireAccount(router);
      if (!uid) return setStatus("");
      const bucket = createClient().storage.from("listing-images");

      const uploaded: ListingInput["photos"] = [];
      for (const [i, p] of photos.entries()) {
        if (p.saved) {
          uploaded.push(p.saved);
          continue;
        }
        setStatus(`Uploading photo ${i + 1} of ${photos.length}`);
        const ext = (b: Blob) => (b.type === "image/webp" ? "webp" : "jpg");
        const path = `${uid}/${p.id}.${ext(p.full.blob)}`;
        const thumbPath = `${uid}/${p.id}_t.${ext(p.thumb.blob)}`;
        const results = await Promise.all([
          bucket.upload(path, p.full.blob, { contentType: p.full.blob.type, upsert: true }),
          bucket.upload(thumbPath, p.thumb.blob, { contentType: p.thumb.blob.type, upsert: true }),
        ]);
        if (results.some((r) => r.error)) {
          setStatus("");
          return setError(`Photo ${i + 1} did not upload. Check your connection and try again.`);
        }
        uploaded.push({ path, thumbPath, width: p.full.width, height: p.full.height });
      }

      setStatus("Saving your ad");
      const data = toInput(draft, uploaded, acceptTerms);
      const result = edit ? await updateListing(edit.id, data) : await createListing(data);
      if ("error" in result) {
        setStatus("");
        setFields(result.fields ?? {});
        return setError(result.error);
      }
      if (!edit) writeDraft(null);
      router.push(`/l/${result.id}`);
    });
  }

  const fieldError = (name: string) =>
    fields[name]?.[0] && <p className="mt-1 text-sm text-danger">{fields[name]![0]}</p>;

  if (step === 1) {
    return (
      <section aria-labelledby="photos-step" className="space-y-4">
        <div>
          <h2 id="photos-step" className="text-xl font-bold">
            {edit ? "Photos" : "Step 1 of 2: Photos"}
          </h2>
          <p className="text-sm text-ink-2">Add up to {MAX_PHOTOS} photos. The first photo is the cover.</p>
        </div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="relative aspect-square overflow-hidden rounded-field bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview or stored thumbnail */}
              <img src={p.preview} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs text-bg">Cover</span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-ink/80 text-bg"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          {photos.length < MAX_PHOTOS && (
            <li>
              <label className="pressable grid aspect-square cursor-pointer place-items-center rounded-field border-2 border-dashed border-line bg-surface text-center text-sm text-ink-2 hover:bg-surface-2">
                <span className="grid justify-items-center gap-1">
                  <ImagePlus className="size-7" aria-hidden />
                  Add photos
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </li>
          )}
        </ul>
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-danger">
          {photoError}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setStep(2)} className={buttonClass()}>
            {edit ? "Back to details" : photos.length ? "Next: details" : "Continue without photos"}
          </button>
          {!edit && savedDraft && !touched && (
            <Chip
              onClick={() => {
                try {
                  setDraft({ ...blank, ...JSON.parse(savedDraft) });
                  setTouched(true);
                } catch {}
              }}
            >
              Use my last draft
            </Chip>
          )}
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-2 rounded-card bg-surface p-4 ring-1 ring-line">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Ad strength</span>
          <span className="text-ink-2">{strength.percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Ad strength"
          aria-valuenow={strength.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full origin-left rounded-full bg-success motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-(--ease-out)"
            style={{ transform: `scaleX(${strength.percent / 100})` }}
          />
        </div>
        {strength.tip && (
          <p className="flex items-start gap-2 text-sm text-ink-2">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            {strength.tip}
          </p>
        )}
      </div>

      <fieldset>
        <legend className={labelClass}>I want to</legend>
        <div className="flex gap-2">
          <Chip selected={draft.kind === "offer"} onClick={() => update({ kind: "offer" })}>
            Sell or give away
          </Chip>
          <Chip selected={draft.kind === "wanted"} onClick={() => update({ kind: "wanted" })}>
            Find something (Wanted)
          </Chip>
        </div>
      </fieldset>

      <div>
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          value={draft.title}
          maxLength={90}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={draft.kind === "wanted" ? "Looking for a study table" : "Honda Activa 6G 2022, 9,000 km"}
          className={input}
        />
        {fieldError("title")}
        {suggested && (
          <Chip className="mt-2" onClick={() => update({ categoryId: String(suggested.id) })}>
            Category: {suggested.name}?
          </Chip>
        )}
      </div>

      {banned && (
        <p role="alert" className="flex items-start gap-2 rounded-field bg-danger-soft p-3 text-sm text-ink">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          Chowk does not allow {banned.group}. Remove &quot;{banned.term}&quot; to post this ad.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            value={draft.categoryId}
            onChange={(e) => update({ categoryId: e.target.value, attributes: {} })}
            className={input}
          >
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldError("categoryId")}
        </div>
        {draft.kind === "offer" && (
          <div>
            <label htmlFor="condition" className={labelClass}>
              Condition
            </label>
            <select id="condition" value={draft.condition} onChange={(e) => update({ condition: e.target.value })} className={input}>
              <option value="">Not stated</option>
              {conditions.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <fieldset>
        <legend className={labelClass}>Price</legend>
        <div className="flex flex-wrap gap-2">
          {priceTypes.map(([v, l]) => (
            <Chip key={v} selected={draft.priceType === v} onClick={() => update({ priceType: v })}>
              {l}
            </Chip>
          ))}
        </div>
        {!noPrice && (
          <div className="mt-3">
            <label htmlFor="price" className="sr-only">
              Price in rupees
            </label>
            <input
              id="price"
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.price}
              onChange={(e) => update({ price: e.target.value })}
              placeholder="₹"
              className={`${input} sm:max-w-48`}
            />
            {fieldError("priceRupees")}
            {hint && (
              <p className="mt-1 text-sm text-ink-2">
                Similar ads: {formatPrice(hint.low_paise)} to {formatPrice(hint.high_paise)}. Middle price{" "}
                {formatPrice(hint.median_paise)}.
              </p>
            )}
          </div>
        )}
      </fieldset>

      {schema.length > 0 && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">{category?.name} details</legend>
          {schema.map((f) => {
            const id = `attr-${f.key}`;
            const value = draft.attributes[f.key];
            const set = (v: string | boolean) => update({ attributes: { ...draft.attributes, [f.key]: v } });
            if (f.type === "boolean") {
              return (
                <label key={f.key} className="flex items-center gap-2 text-[15px]">
                  <input type="checkbox" checked={value === true} onChange={(e) => set(e.target.checked)} className="size-5" />
                  {f.label}
                </label>
              );
            }
            return (
              <div key={f.key}>
                <label htmlFor={id} className={labelClass}>
                  {f.label}
                  {f.unit ? ` (${f.unit})` : ""}
                </label>
                {f.type === "select" ? (
                  <select id={id} value={String(value ?? "")} onChange={(e) => set(e.target.value)} className={input}>
                    <option value="">Not stated</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={id}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    inputMode={f.type === "number" ? "numeric" : undefined}
                    maxLength={60}
                    value={String(value ?? "")}
                    onChange={(e) => set(e.target.value)}
                    className={input}
                  />
                )}
              </div>
            );
          })}
        </fieldset>
      )}

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          rows={5}
          maxLength={4000}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Condition, age, what comes with it, why you sell it"
          className="w-full rounded-field border border-line bg-surface px-3 py-2 text-[15px] text-ink"
        />
        {fieldError("description")}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <select id="city" value={draft.cityId} onChange={(e) => update({ cityId: e.target.value })} className={input}>
            <option value="">Choose a city</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldError("cityId")}
        </div>
        <div>
          <label htmlFor="locality" className={labelClass}>
            Area (optional)
          </label>
          <input
            id="locality"
            value={draft.locality}
            maxLength={60}
            onChange={(e) => update({ locality: e.target.value })}
            placeholder="Kothrud"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="pincode" className={labelClass}>
            PIN code (optional)
          </label>
          <input
            id="pincode"
            inputMode="numeric"
            maxLength={6}
            value={draft.pincode}
            onChange={(e) => update({ pincode: e.target.value })}
            className={input}
          />
          {fieldError("pincode")}
        </div>
      </div>
      <p className="text-xs text-ink-2">Buyers see your area and a distance rounded to 500 m. They never see your exact address.</p>

      {needsTerms && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 size-5" />
          <span>
            I accept the{" "}
            <Link href="/terms" className="text-primary underline">
              terms
            </Link>{" "}
            and confirm this item is allowed on Chowk.
          </span>
        </label>
      )}

      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {error ? <span className="text-danger">{error}</span> : <span className="text-ink-2">{status}</span>}
      </p>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={buttonClass({ variant: "accent" })}>
          {pending ? "Saving" : edit ? "Save changes" : "Post my ad"}
        </button>
        <button type="button" onClick={() => setStep(1)} disabled={pending} className={buttonClass({ variant: "secondary" })}>
          {edit ? `Photos (${photos.length})` : "Back to photos"}
        </button>
      </div>
    </form>
  );
}
