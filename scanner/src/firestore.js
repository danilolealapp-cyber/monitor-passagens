import { existsSync, readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// No GitHub a credencial vem do cofre (secret FIREBASE_SERVICE_ACCOUNT).
// No seu computador, basta salvar o arquivo como scanner/service-account.json.
function loadCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  const file = new URL('../service-account.json', import.meta.url);
  if (existsSync(file)) {
    return JSON.parse(readFileSync(file, 'utf8'));
  }
  throw new Error(
    'Credencial do Firebase não encontrada. Salve a chave em scanner/service-account.json ' +
      'ou defina FIREBASE_SERVICE_ACCOUNT.',
  );
}

initializeApp({ credential: cert(loadCredentials()) });

export const db = getFirestore();
export { Timestamp };
