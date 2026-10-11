import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api.js';

// 5s, matching the inbox. The tour flow is a handful of steps per
// negotiation, so a push channel would be a lot of machinery for
// very little latency saved.
const POLL_INTERVAL_MS = 5000;

/**
 * Loads the caller's appointments and keeps them fresh.
 *
 * Returns the rows plus the negotiation state derived from them, so
 * both the tenant page and the landlord's requests page read the
 * same rules instead of each re-deriving "which row is the request"
 * and "which are this round's proposals".
 *
 * The grouping relies on `proposed_by` and `appointment_batch_id` from
 * migration 002 — see backend/migrations/002_tour_requests.sql.
 */
export default function useTourNegotiation({ propertyId = null, poll = true } = {}) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await api.appointments.list();
      if (!mountedRef.current) return;
      setAppointments(response?.data ?? []);
      setLoadError('');
    } catch (error) {
      if (!mountedRef.current) return;
      setLoadError(error.message || "Could not load tour appointments.");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching on mount and writing the result to state is exactly what
    // an effect is for; the rule flags the synchronous-looking call, not
    // the async work it starts. The interval below is the real
    // subscribe-and-update path.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    if (!poll) return undefined;

    const timer = setInterval(() => {
      // A failed poll is not worth surfacing — the page keeps showing
      // the last good data and the next tick may well succeed.
      load().catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [load, poll]);

  const scoped = propertyId
    ? appointments.filter((row) => String(row.property_id) === String(propertyId))
    : appointments;

  // A request is the tenant's own row: proposed_by === tenant_id.
  const requests = scoped.filter((row) => row.is_request);
  // A proposal is a landlord row that is still awaiting an answer.
  const openProposals = scoped.filter((row) => row.is_proposal && row.status === 'pending');
  const confirmed = scoped.find((row) => row.status === 'confirmed') ?? null;

  // One live negotiation per property, so each row only shows the slots
  // belonging to the request currently being negotiated.
  const openRequest = requests.find((row) => row.status === 'pending') ?? null;
  const latestBatchId = openRequest?.appointment_batch_id ?? null;
  const currentProposals = latestBatchId
    ? openProposals.filter((row) => row.appointment_batch_id === latestBatchId)
    : [];

  return {
    appointments: scoped,
    isLoading,
    loadError,
    reload: load,
    requests,
    openRequest,
    openProposals,
    currentProposals,
    confirmed,
  };
}
