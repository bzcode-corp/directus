import { defineEndpoint } from '@directus/extensions-sdk';
import { createError } from '@directus/errors';

export default defineEndpoint((router, { services, getSchema, database, env }) => {
  if (env.COMPOSITE_PK_ENABLED !== 'true') return;

  const { ItemsService } = services;

  async function introspectComposite() {
    const result = await database.raw(`
      SELECT kc.table_schema, kc.table_name,
             array_agg(kc.column_name ORDER BY kc.ordinal_position) AS pk_columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kc
        ON kc.constraint_name = tc.constraint_name
       AND kc.table_schema = tc.table_schema
       AND kc.table_name = tc.table_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND kc.table_schema NOT IN ('information_schema','pg_catalog')
      GROUP BY kc.table_schema, kc.table_name
      HAVING COUNT(*) > 1;
    `);

    return result.rows.map((row: any) => ({
      collection: row.table_schema === 'public' ? row.table_name : `${row.table_schema}.${row.table_name}`,
      schema: row.table_schema,
      primary_key_fields: row.pk_columns,
    }));
  }

  function parseKeys(input: any) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw createError({ status: 400, code: 'BAD_REQUEST', message: 'keys required' });
    }
    const filter: Record<string, any> = {};
    for (const [field, value] of Object.entries(input)) {
      if (value === undefined || value === null || value === '') {
        throw createError({ status: 400, code: 'BAD_REQUEST', message: `Invalid key for ${field}` });
      }
      let v: any = value;
      if (typeof v === 'string') {
        if (v === 'true') v = true;
        else if (v === 'false') v = false;
        else if (!isNaN(Number(v))) v = Number(v);
      }
      filter[field] = { _eq: v };
    }
    return filter;
  }

  router.get('/_introspect', async (req, res, next) => {
    try {
      const data = await introspectComposite();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:collection', async (req: any, res, next) => {
    try {
      const items = new ItemsService(req.params.collection, {
        schema: await getSchema(),
        accountability: req.accountability,
      });
      const data = await items.readByQuery(req.query);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:collection/by-keys', async (req: any, res, next) => {
    try {
      const keys = parseKeys(req.query.keys);
      const items = new ItemsService(req.params.collection, {
        schema: await getSchema(),
        accountability: req.accountability,
      });
      const result = await items.readByQuery({ filter: keys, limit: 2 });
      if (result.length === 0)
        throw createError({ status: 404, code: 'NOT_FOUND', message: 'Not found' });
      if (result.length > 1)
        throw createError({ status: 409, code: 'CONFLICT', message: 'Ambiguous composite key' });
      res.json({ data: result[0] });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:collection', async (req: any, res, next) => {
    try {
      const items = new ItemsService(req.params.collection, {
        schema: await getSchema(),
        accountability: req.accountability,
      });
      const introspection = await introspectComposite();
      const entry = introspection.find((c: any) => c.collection === req.params.collection);
      const pkFields: string[] = entry?.primary_key_fields || [];
      for (const field of pkFields) {
        if (!(field in req.body)) {
          throw createError({ status: 409, code: 'CONFLICT', message: `Missing PK field ${field}` });
        }
      }
      await items.createOne(req.body);
      const filter = parseKeys(pkFields.reduce((o, f) => ({ ...o, [f]: req.body[f] }), {}));
      const created = await items.readByQuery({ filter, limit: 1 });
      res.json({ data: created[0] });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:collection/by-keys', async (req: any, res, next) => {
    try {
      const keys = parseKeys(req.query.keys);
      const items = new ItemsService(req.params.collection, {
        schema: await getSchema(),
        accountability: req.accountability,
      });
      const updated = await items.updateByQuery({ filter: keys }, req.body);
      const count = updated.length;
      if (count === 0)
        throw createError({ status: 404, code: 'NOT_FOUND', message: 'Not found' });
      if (count > 1)
        throw createError({ status: 409, code: 'CONFLICT', message: 'Ambiguous composite key' });
      const result = await items.readByQuery({ filter: keys, limit: 1 });
      res.json({ data: result[0] });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:collection/by-keys', async (req: any, res, next) => {
    try {
      const keys = parseKeys(req.query.keys);
      const items = new ItemsService(req.params.collection, {
        schema: await getSchema(),
        accountability: req.accountability,
      });
      const deleted = await items.deleteByQuery({ filter: keys });
      const count = deleted.length;
      if (count === 0)
        throw createError({ status: 404, code: 'NOT_FOUND', message: 'Not found' });
      if (count > 1)
        throw createError({ status: 409, code: 'CONFLICT', message: 'Ambiguous composite key' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });
});
