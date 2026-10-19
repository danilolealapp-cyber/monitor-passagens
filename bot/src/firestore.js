// Acesso ao Firestore pela API REST (o Cloudflare Workers não roda o firebase-admin).
// Autentica com a mesma chave de serviço usada pelo robô de varredura.

let cachedToken = null;

const b64url = (data) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function importKey(pem) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await importKey(sa.private_key);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const jwt = `${header}.${claims}.${b64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Falha ao autenticar no Firebase: ${JSON.stringify(json).slice(0, 200)}`);
  cachedToken = { value: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cachedToken.value;
}

// ---------- Conversão entre o formato do Firestore e objetos comuns ----------
function decode(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return new Date(value.timestampValue);
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  return null;
}
const decodeFields = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
}

const docToObject = (doc) => ({ id: doc.name.split('/').pop(), ...decodeFields(doc.fields ?? {}) });

// ---------- Cliente ----------
export function firestore(env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;

  async function call(url, init = {}) {
    const token = await accessToken(sa);
    const res = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  return {
    async get(path) {
      const doc = await call(`${base}/${path}`);
      return doc ? docToObject(doc) : null;
    },

    async list(collection) {
      const json = await call(`${base}/${collection}?pageSize=100`);
      return (json?.documents ?? []).map(docToObject);
    },

    // Atualiza só os campos informados (cria o documento se não existir)
    async merge(path, data) {
      const mask = Object.keys(data)
        .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
        .join('&');
      const body = { fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])) };
      await call(`${base}/${path}?${mask}`, { method: 'PATCH', body: JSON.stringify(body) });
    },

    // Últimos documentos de uma coleção, do mais novo para o mais antigo
    async latest(parentPath, collectionId, orderField, limit) {
      const url = parentPath ? `${base}/${parentPath}:runQuery` : `${base}:runQuery`;
      const json = await call(url, {
        method: 'POST',
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId }],
            orderBy: [{ field: { fieldPath: orderField }, direction: 'DESCENDING' }],
            limit,
          },
        }),
      });
      return (json ?? []).filter((r) => r.document).map((r) => docToObject(r.document));
    },
  };
}
