import { useApi } from '@directus/extensions-sdk';

export async function getPKFields(collection: string): Promise<string[]> {
  const api = useApi();
  const res = await api.get('/citems/_introspect');
  const found = res.data.data.find((c: any) => c.collection === collection);
  return found?.primary_key_fields || [];
}

export function buildKeyParams(pkFields: string[], item: Record<string, any>) {
  const keys: Record<string, any> = {};
  for (const field of pkFields) keys[field] = item[field];
  return { keys };
}
