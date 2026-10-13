/**
 * ============================================================================
 * seedProperties.js
 * ============================================================================
 * Bulk-creates apartment listings directly in the database, with real photo
 * files uploaded into the "property-photos" Supabase Storage bucket — so the
 * newsfeed has plenty of posts to show without you adding them one by one
 * through the landlord dashboard.
 *
 * This writes straight to Postgres/Storage using the Supabase service-role
 * key — it does NOT go through your Express API routes. That's deliberate:
 * it bypasses auth entirely, which is fine for a one-off seed script, and it
 * means it can NEVER conflict with the landlord's own "Add Property" flow in
 * LandlordDashboard.jsx — that flow still goes through POST /properties and
 * POST /properties/:id/photos exactly as before. This script just inserts
 * more rows of the exact same shape.
 *
 * HOW TO RUN
 * ----------
 *   1. cd backend/scripts   (or wherever you placed this file)
 *   2. npm install @supabase/supabase-js node-fetch@2 dotenv
 *   3. cp .env.example .env   and fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   4. node seedProperties.js
 *
 * Re-running it is safe — it always INSERTs new rows (it never deletes or
 * touches existing properties), so run it again any time you want more.
 *
 * PHOTOS: specifically room/house photos (bedroom, living room, kitchen,
 * apartment interior, balcony, house exterior) — see SECTION 2 below for
 * the three photo sources it tries, in order, and why.
 * ============================================================================
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");

// ----------------------------------------------------------------------------
// SECTION 1 — Setup: Supabase admin client + config from .env
// ----------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill them in."
  );
  process.exit(1);
}

// Service-role client: bypasses Row Level Security, required to insert
// properties/photos directly and to upload into Storage from a script.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PROPERTY_COUNT = parseInt(process.env.SEED_PROPERTY_COUNT || "24", 10);
const PHOTOS_PER_PROPERTY = parseInt(process.env.SEED_PHOTOS_PER_PROPERTY || "4", 10);
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || "";

// ----------------------------------------------------------------------------
// SECTION 2 — Room / house photo sourcing
// ----------------------------------------------------------------------------
// Pexels has temporarily paused issuing new API keys, so it's dropped from
// this script. Three tiers now, auto-selected, all specifically targeting
// room/house photos (bedroom, living room, kitchen, apartment interior,
// house exterior — never random unrelated stock photos):
//
//   1. PIXABAY_API_KEY set  -> real curated photos via Pixabay's API.
//      Free, instant key, still issuing normally as of this writing:
//      https://pixabay.com/api/docs/  (sign in -> API tab -> key is right there)
//
//   2. PIXABAY_API_KEY unset -> Openverse (openverse.org), a real photo
//      SEARCH engine over openly-licensed images (Flickr, WordPress.org,
//      museums, etc). NO SIGNUP, NO KEY, NO PAUSE RISK — it's a public,
//      keyless API by design. Real room/house photos, not placeholders.
//      (Images are openly licensed, not Pixabay/Pexels-exclusive content —
//      fine for seeding a dev/demo feed; swap in your own photography
//      before using this commercially if license terms matter to you.)
//
//   3. If Openverse ever returns nothing for a keyword -> loremflickr.com
//      as a last-resort filler, same as before, so the script never just
//      stops because one image source hiccuped.
//
// Whichever tier serves a given photo, the bytes are still DOWNLOADED and
// UPLOADED into your own "property-photos" bucket — not hot-linked — so
// stored photos behave identically to a landlord's own uploads.
// ----------------------------------------------------------------------------

// Specifically room/house keywords, as you asked — never generic stock terms.
const ROOM_KEYWORDS = [
  "bedroom interior",
  "living room interior",
  "modern apartment interior",
  "kitchen interior",
  "apartment balcony",
  "house exterior",
];

async function getPhotoUrlsFromPixabay(count) {
  const urls = [];
  for (let i = 0; i < count; i++) {
    const keyword = ROOM_KEYWORDS[i % ROOM_KEYWORDS.length];
    const page = 1 + Math.floor(Math.random() * 10);
    const res = await fetch(
      `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(keyword)}` +
        `&image_type=photo&category=buildings&safesearch=true&per_page=3&page=${page}`
    );
    if (!res.ok) throw new Error(`Pixabay API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const hit = data.hits && data.hits[Math.floor(Math.random() * data.hits.length)];
    if (hit) urls.push(hit.largeImageURL);
  }
  return urls;
}

async function getPhotoUrlsFromOpenverse(count) {
  const urls = [];
  for (let i = 0; i < count; i++) {
    const keyword = ROOM_KEYWORDS[i % ROOM_KEYWORDS.length];
    const page = 1 + Math.floor(Math.random() * 5);
    const res = await fetch(
      `https://api.openverse.org/v1/images/?q=${encodeURIComponent(keyword)}` +
        `&license_type=commercial&page_size=1&page=${page}&mature=false`
    );
    if (!res.ok) throw new Error(`Openverse API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const result = data.results && data.results[0];
    // Prefer a direct, full-size image URL when Openverse provides one.
    if (result && (result.url || result.thumbnail)) {
      urls.push(result.url || result.thumbnail);
    }
  }
  return urls;
}

function getPhotoUrlsFromLoremFlickr(count) {
  const urls = [];
  for (let i = 0; i < count; i++) {
    const keyword = ROOM_KEYWORDS[i % ROOM_KEYWORDS.length].replace(/\s+/g, ",");
    // The `lock=` param (a random number) forces a different image each
    // time instead of loremflickr caching the same one per keyword.
    const lock = Math.floor(Math.random() * 100000);
    urls.push(`https://loremflickr.com/800/600/${keyword}?lock=${lock}`);
  }
  return urls;
}

async function getRoomPhotoUrls(count) {
  if (PIXABAY_API_KEY) {
    try {
      const urls = await getPhotoUrlsFromPixabay(count);
      if (urls.length >= count) return urls;
    } catch (err) {
      console.warn("Pixabay fetch failed, falling back to Openverse:", err.message);
    }
  }

  try {
    const urls = await getPhotoUrlsFromOpenverse(count);
    if (urls.length >= count) return urls;
    // Openverse came back short (a keyword had no results this round) —
    // top up the remainder with loremflickr rather than leaving gaps.
    return [...urls, ...getPhotoUrlsFromLoremFlickr(count - urls.length)];
  } catch (err) {
    console.warn("Openverse fetch failed, falling back to loremflickr:", err.message);
  }

  return getPhotoUrlsFromLoremFlickr(count);
}

// Downloads an image URL's bytes and uploads them into the property-photos
// bucket, returning the bucket's public URL (same shape propertyController's
// uploadPropertyPhotos endpoint produces for a landlord-uploaded photo).
async function uploadPhotoToBucket(propertyId, photoUrl, index) {
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error(`Failed to download photo: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const path = `properties/${propertyId}/seed-${Date.now()}-${index}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("property-photos")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from("property-photos").getPublicUrl(path);
  return publicUrlData.publicUrl;
}

// ----------------------------------------------------------------------------
// SECTION 3 — Fake-but-plausible property data generator (Dhaka-area)
// ----------------------------------------------------------------------------
const AREAS = [
  { name: "Gulshan", lat: 23.7925, lng: 90.4078 },
  { name: "Dhanmondi", lat: 23.7461, lng: 90.3742 },
  { name: "Banani", lat: 23.7937, lng: 90.4066 },
  { name: "Uttara", lat: 23.8759, lng: 90.3795 },
  { name: "Mirpur", lat: 23.8223, lng: 90.3654 },
  { name: "Mohammadpur", lat: 23.7658, lng: 90.3589 },
  { name: "Bashundhara", lat: 23.8151, lng: 90.4336 },
];

const PROPERTY_TYPES = ["apartment", "studio", "duplex", "house"];
const FURNISH_TYPES = ["unfurnished", "semi_furnished", "furnished"];
const FACILITY_POOL = ["balcony", "lift", "generator", "parking", "gas line", "security guard", "rooftop access"];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomFacilities() {
  // Always vary whether "lift" and "balcony" show up, since the frontend
  // filters/badges key off those two specifically.
  const picked = new Set();
  const shuffled = [...FACILITY_POOL].sort(() => Math.random() - 0.5);
  const howMany = 2 + Math.floor(Math.random() * 3);
  shuffled.slice(0, howMany).forEach((f) => picked.add(f));
  return Array.from(picked);
}

function jitter(value, spread) {
  return value + (Math.random() - 0.5) * spread;
}

function buildFakeProperty(ownerId, index) {
  const area = randomItem(AREAS);
  const bedroom = 1 + Math.floor(Math.random() * 4);
  const bathroom = Math.max(1, bedroom - Math.floor(Math.random() * 2));
  const rate = 12000 + Math.floor(Math.random() * 40) * 1000; // 12,000 - 52,000 BDT
  const sizeSqft = 500 + bedroom * 250 + Math.floor(Math.random() * 200);
  const floor = 1 + Math.floor(Math.random() * 9);

  return {
    owner_id: ownerId,
    address: `House ${10 + index}, Road ${1 + (index % 15)}, ${area.name}, Dhaka`,
    latitude: Number(jitter(area.lat, 0.01).toFixed(6)),
    longitude: Number(jitter(area.lng, 0.01).toFixed(6)),
    details: `A ${bedroom}-bedroom ${randomItem(PROPERTY_TYPES)} in ${area.name}, close to main roads and markets.`,
    facilities: randomFacilities(),
    rate,
    property_type: randomItem(PROPERTY_TYPES),
    bedroom,
    bathroom,
    size_sqft: sizeSqft,
    availability_date: new Date().toISOString().slice(0, 10),
    furnish_type: randomItem(FURNISH_TYPES),
    nearest_transport: `${area.name} Bus Stand`,
    deposit: rate * 2,
    floor,
    total_floors: floor + Math.floor(Math.random() * 6),
  };
}

// ----------------------------------------------------------------------------
// SECTION 4 — Finding (or requiring) a landlord to own the seeded listings
// ----------------------------------------------------------------------------
async function resolveLandlordId() {
  if (process.env.SEED_LANDLORD_USER_ID) {
    return Number(process.env.SEED_LANDLORD_USER_ID);
  }

  const { data, error } = await supabase
    .from("users")
    .select("user_id, name")
    .eq("is_landlord", true)
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) {
    console.error(
      "No landlord account found in `users`. Register one landlord account through your normal " +
        "sign-up flow first (so password hashing etc. stays correct), then either re-run this " +
        "script or set SEED_LANDLORD_USER_ID in .env to that user's user_id."
    );
    process.exit(1);
  }

  console.log(`Using existing landlord: ${data[0].name} (user_id ${data[0].user_id})`);
  return data[0].user_id;
}

// ----------------------------------------------------------------------------
// SECTION 5 — Main
// ----------------------------------------------------------------------------
async function main() {
  console.log(`Seeding ${PROPERTY_COUNT} properties with ${PHOTOS_PER_PROPERTY} photos each...`);

  const ownerId = await resolveLandlordId();

  for (let i = 0; i < PROPERTY_COUNT; i++) {
    const propertyData = buildFakeProperty(ownerId, i);

    // --- Insert the property row -------------------------------------------
    const { data: inserted, error: insertError } = await supabase
      .from("properties")
      .insert(propertyData)
      .select("property_id, address")
      .single();

    if (insertError) {
      console.error(`[${i + 1}/${PROPERTY_COUNT}] Failed to insert property:`, insertError.message);
      continue;
    }

    const propertyId = inserted.property_id;
    console.log(`[${i + 1}/${PROPERTY_COUNT}] Created property #${propertyId} — ${inserted.address}`);

    // --- Fetch + upload photos, then record them in property_photos --------
    try {
      const sourceUrls = await getRoomPhotoUrls(PHOTOS_PER_PROPERTY);
      const uploadedUrls = [];
      for (let p = 0; p < sourceUrls.length; p++) {
        const publicUrl = await uploadPhotoToBucket(propertyId, sourceUrls[p], p);
        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        const photoRows = uploadedUrls.map((url) => ({ property_id: propertyId, photo_url: url }));
        const { error: photoError } = await supabase.from("property_photos").insert(photoRows);
        if (photoError) {
          console.error(`  -> Property #${propertyId}: failed to save photo rows:`, photoError.message);
        } else {
          console.log(`  -> Uploaded ${uploadedUrls.length} photos for property #${propertyId}`);
        }
      }
    } catch (photoErr) {
      console.error(`  -> Property #${propertyId}: photo step failed:`, photoErr.message);
      // The property row still exists without photos — not ideal, but not
      // worth rolling back the whole property for a flaky image download.
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Seed script crashed:", err);
  process.exit(1);
});
