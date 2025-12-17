import { Sandbox } from '@deno/sandbox'

if (!Deno.env.get('DB_URL')) {
  throw new Error('Missing DB_URL env var')
}

const sandbox = await Sandbox.create({
  env: {
    DB_URL: Deno.env.get('DB_URL') || '',
  },
})

const PACKAGE_JSON = {
  imports: {
    '@neon/serverless': 'jsr:@neon/serverless@^1.0.1',
  },
}

await sandbox.writeTextFile('deno.json', JSON.stringify(PACKAGE_JSON, null, 2))

await sandbox.writeTextFile(
  'server.ts',
  `import { neon } from "@neon/serverless";
  try{
    const sql = neon(Deno.env.get('DB_URL') || '');
    await sql\`SELECT 1 AS value\`;
    console.log("Connected to the database successfully!");
  }catch(e){
    console.error("Failed to connect to the database:", e);
  }

  // Deno.serve(() => new Response("Hello from Deno!"));
`,
)
await sandbox.sh`deno install`

await sandbox.sh`deno run --allow-net --allow-env server.ts`

await sandbox.kill()
