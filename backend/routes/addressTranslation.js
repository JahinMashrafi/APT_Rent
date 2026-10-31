
const express = require("express");
const rateLimitModule = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");
const { createHash } = require("crypto");

const router = express.Router();

const rateLimit =
  rateLimitModule.rateLimit ||
  rateLimitModule.default ||
  rateLimitModule;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend .env"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Limit requests to protect the free translation quota.
const translationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many translation requests. Please try again later.",
  },
});

function hasBangla(text) {
  return /[\u0980-\u09FF]/u.test(text);
}

function getCacheKey(address) {
  return createHash("sha256")
    .update(`en\u0000bn\u0000${address}`, "utf8")
    .digest("hex");
}

// Translate one address using MyMemory.
async function translateAddress(address) {
  if (Buffer.byteLength(address, "utf8") > 500) {
    throw new Error("Address exceeds the 500-byte limit.");
  }

  const params = new URLSearchParams({
    q: address,
    langpair: "en|bn",
    mt: "1",
  });

  if (process.env.MYMEMORY_CONTACT_EMAIL) {
    params.set("de", process.env.MYMEMORY_CONTACT_EMAIL);
  }

  const response = await fetch(
    `https://api.mymemory.translated.net/get?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`MyMemory HTTP error: ${response.status}`);
  }

  const result = await response.json();

  const translated = result?.responseData?.translatedText;

  if (
    result?.responseStatus !== 200 ||
    typeof translated !== "string" ||
    !translated.trim()
  ) {
    throw new Error(
      result?.responseDetails || "Translation was not returned."
    );
  }

  return translated.trim();
}

// POST /api/translate/addresses
// Request: { "addresses": ["House 47, Road 8, Dhaka"] }
router.post("/addresses", translationLimiter, async (req, res) => {
  try {
    const addresses = req.body?.addresses;

    if (!Array.isArray(addresses)) {
      return res.status(400).json({
        error: "addresses must be an array.",
      });
    }

    if (addresses.length > 20) {
      return res.status(400).json({
        error: "Maximum 20 addresses per request.",
      });
    }

    const cleanedAddresses = [];

    for (const address of addresses) {
      if (typeof address !== "string") {
        return res.status(400).json({
          error: "Every address must be a string.",
        });
      }

      const cleaned = address.trim();

      if (!cleaned) continue;

      if (Buffer.byteLength(cleaned, "utf8") > 500) {
        return res.status(400).json({
          error: "Each address must be 500 bytes or fewer.",
        });
      }

      cleanedAddresses.push(cleaned);
    }

    // Remove duplicates and skip addresses already written in Bangla.
    const uniqueAddresses = [
      ...new Set(cleanedAddresses),
    ].filter((address) => !hasBangla(address));

    const translationsMap = new Map();
    const cachedKeys = new Set();

    // 1. Check Supabase cache first.
    if (uniqueAddresses.length > 0) {
      const cacheKeys = uniqueAddresses.map(getCacheKey);

      const { data, error } = await supabase
        .from("address_translation_cache")
        .select("cache_key, source_text, translated_text")
        .in("cache_key", cacheKeys);

      if (error) throw error;

      for (const row of data || []) {
        translationsMap.set(
          row.source_text,
          row.translated_text
        );

        cachedKeys.add(row.cache_key);
      }
    }

    // 2. Find addresses not already cached.
    const missingAddresses = uniqueAddresses.filter(
      (address) => !translationsMap.has(address)
    );

    const rowsToSave = [];

    // 3. Translate missing addresses one at a time.
    for (const address of missingAddresses) {
      try {
        const translated = await translateAddress(address);

        translationsMap.set(address, translated);

        rowsToSave.push({
          cache_key: getCacheKey(address),
          source_text: address,
          source_lang: "en",
          target_lang: "bn",
          translated_text: translated,
          provider: "mymemory",
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.warn(
          "Address translation failed:",
          error.message
        );

        // If translation fails, show the original address.
        translationsMap.set(address, address);
      }
    }

    // 4. Store successful translations in Supabase.
    if (rowsToSave.length > 0) {
      const { error } = await supabase
        .from("address_translation_cache")
        .upsert(rowsToSave, {
          onConflict: "cache_key",
        });

      if (error) {
        console.error(
          "Translation cache save failed:",
          error.message
        );
      }
    }

    // 5. Return translations in the original input order.
    const translations = cleanedAddresses.map((address) => ({
      source: address,
      translated: hasBangla(address)
        ? address
        : translationsMap.get(address) || address,
      cached: cachedKeys.has(getCacheKey(address)),
    }));

    return res.status(200).json({
      translations,
    });
  } catch (error) {
    console.error("Address translation error:", error);

    return res.status(500).json({
      error: "Address translation is temporarily unavailable.",
    });
  }
});

module.exports = router;
