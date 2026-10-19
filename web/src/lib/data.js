import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const DAY_MS = 86_400_000;
export const MAX_ACTIVE_ROUTES = 3;

// Lista de rotas, atualizada ao vivo
export function useRoutes() {
  const [state, setState] = useState({ loading: true, routes: [], error: null });
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'routes'), orderBy('createdAt')),
        (snap) => setState({ loading: false, routes: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null }),
        (error) => setState({ loading: false, routes: [], error }),
      ),
    [],
  );
  return state;
}

// Histórico de varreduras de uma rota
export function useHistory(routeId, days) {
  const [history, setHistory] = useState(null);
  useEffect(() => {
    if (!routeId) return undefined;
    const since = Timestamp.fromMillis(Date.now() - days * DAY_MS);
    return onSnapshot(
      query(collection(db, 'routes', routeId, 'snapshots'), where('scannedAt', '>=', since), orderBy('scannedAt')),
      (snap) =>
        setHistory(
          snap.docs.map((d) => {
            const data = d.data();
            return { id: d.id, ...data, at: data.scannedAt.toDate() };
          }),
        ),
      () => setHistory([]),
    );
  }, [routeId, days]);
  return history;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState(null);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(20)),
        (snap) => setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setAlerts([]),
      ),
    [],
  );
  return alerts;
}

export async function createRoute(fields) {
  await addDoc(collection(db, 'routes'), {
    origin: 'BSB',
    ...fields,
    active: true,
    createdAt: serverTimestamp(),
  });
}

// Ao mudar destino ou datas, a melhor data anterior deixa de valer.
export async function updateRoute(id, fields, { resetBest = false } = {}) {
  await updateDoc(doc(db, 'routes', id), resetBest ? { ...fields, lastBest: null } : fields);
}

export async function setRouteActive(id, active) {
  await updateDoc(doc(db, 'routes', id), { active });
}

export async function deleteRoute(id) {
  const snaps = await getDocs(collection(db, 'routes', id, 'snapshots'));
  for (let i = 0; i < snaps.docs.length; i += 400) {
    const batch = writeBatch(db);
    snaps.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'routes', id));
}
