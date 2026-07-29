# API contracts

`openapi.json` is generated from the FastAPI application:

```bash
npm run api:client
```

The command exports the OpenAPI schema and regenerates
`apps/web/src/lib/api/schema.d.ts`. Do not hand-edit the generated client definition.
