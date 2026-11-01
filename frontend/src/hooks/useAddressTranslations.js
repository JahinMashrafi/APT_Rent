
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export function useAddressTranslations(addresses, enabled = true) {
  const [translations, setTranslations] = useState({});

  // Remove empty addresses, Bangla addresses and duplicates.
  const normalizedAddresses = useMemo(() => {
    const list = Array.isArray(addresses) ? addresses : [];

    return [
      ...new Set(
        list
          .filter((address) => typeof address === "string")
          .map((address) => address.trim())
          .filter(
            (address) =>
              address.length > 0 &&
              !/[\u0980-\u09FF]/u.test(address)
          )
      ),
    ];
  }, [addresses]);

  // A stable dependency for the effect.
  const addressesKey = JSON.stringify(normalizedAddresses);

  useEffect(() => {
    const batch = JSON.parse(addressesKey);

    if (!enabled || batch.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadTranslations() {
      try {
        const response =
          await api.addressTranslations.translate(batch);

        const results =
          response?.translations ??
          response?.data?.translations ??
          [];

        const newTranslations = {};

        for (const item of results) {
          if (
            typeof item.source === "string" &&
            typeof item.translated === "string"
          ) {
            newTranslations[item.source] = item.translated;
          }
        }

        if (!cancelled && Object.keys(newTranslations).length > 0) {
          setTranslations((previous) => ({
            ...previous,
            ...newTranslations,
          }));
        }
      } catch (error) {
        console.warn(
          "Unable to translate apartment addresses:",
          error.message
        );
      }
    }

    loadTranslations();

    return () => {
      cancelled = true;
    };
  }, [enabled, addressesKey]);

  return translations;
}
