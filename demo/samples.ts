// The demo's sample pull requests. All synthetic: written for the demo, no third-party code.
// Each one is committed into a throwaway repo at build time and carved by the real analyzer.

type Files = Record<string, string>;

export type Sample = {
  id: string;
  title: string;
  // One line on what the sample shows.
  note: string;
  // Files on `main` before the PR.
  base: Files;
  // Files the PR adds or rewrites.
  head: Files;
};

// A rules table the size an agent writes when asked for "full validation": one branch per rule.
const rules = (n: number) =>
  "import type { Order } from \"@/types/order\";\n\nexport function check(order: Order): string[] {\n  const errors: string[] = [];\n" +
  Array.from({ length: n }, (_, i) => `  if (order.lines.length > ${i} && !order.lines[${i}].sku) {\n    errors.push("line ${i + 1} has no SKU");\n  }\n`).join("") +
  "  return errors;\n}\n";

export const SAMPLES: Sample[] = [
  {
    id: "profiles",
    title: "Add user profiles",
    note: "A feature written top to bottom in one PR: types, storage, API, UI and a doc. Carved into four layers, each small enough to pass.",
    base: {
      "package.json": '{ "name": "shop", "type": "module" }\n',
      "src/db/client.ts": "export const db = { query: async (sql: string, args: unknown[]) => ({ sql, args, rows: [] as unknown[] }) };\n",
    },
    head: {
      "src/types/profile.ts": "export type Profile = {\n  id: string;\n  name: string;\n  bio?: string;\n  avatarUrl?: string;\n};\n\nexport type ProfileInput = Omit<Profile, \"id\">;\n",
      "src/data/profileRepo.ts":
        'import { db } from "../db/client.ts";\nimport type { Profile, ProfileInput } from "../types/profile.ts";\n\nexport async function findProfile(id: string): Promise<Profile | undefined> {\n  const { rows } = await db.query("select * from profiles where id = $1", [id]);\n  return rows[0] as Profile | undefined;\n}\n\nexport async function saveProfile(id: string, input: ProfileInput): Promise<Profile> {\n  await db.query("insert into profiles values ($1, $2, $3, $4)", [id, input.name, input.bio, input.avatarUrl]);\n  return { id, ...input };\n}\n',
      "src/data/validate.ts":
        'import type { ProfileInput } from "../types/profile.ts";\n\nexport function validate(input: ProfileInput): string | undefined {\n  if (!input.name.trim()) return "name is required";\n  if (input.bio && input.bio.length > 280) return "bio is over 280 characters";\n  return undefined;\n}\n',
      "src/api/profiles.ts":
        'import { findProfile, saveProfile } from "../data/profileRepo.ts";\nimport { validate } from "../data/validate.ts";\nimport type { ProfileInput } from "../types/profile.ts";\n\nexport async function getProfile(id: string) {\n  const profile = await findProfile(id);\n  return profile ? { status: 200, body: profile } : { status: 404, body: { error: "not found" } };\n}\n\nexport async function putProfile(id: string, input: ProfileInput) {\n  const error = validate(input);\n  if (error) return { status: 400, body: { error } };\n  return { status: 200, body: await saveProfile(id, input) };\n}\n',
      "src/ui/ProfileCard.tsx":
        'import type { Profile } from "../types/profile.ts";\n\nexport function ProfileCard({ profile }: { profile: Profile }) {\n  return (\n    <article>\n      {profile.avatarUrl && <img src={profile.avatarUrl} alt="" />}\n      <h2>{profile.name}</h2>\n      {profile.bio ? <p>{profile.bio}</p> : <p>No bio yet.</p>}\n    </article>\n  );\n}\n',
      "src/ui/ProfilePage.tsx":
        'import { useEffect, useState } from "react";\nimport { getProfile } from "../api/profiles.ts";\nimport type { Profile } from "../types/profile.ts";\nimport { ProfileCard } from "./ProfileCard.tsx";\n\nexport function ProfilePage({ id }: { id: string }) {\n  const [profile, setProfile] = useState<Profile>();\n  useEffect(() => {\n    getProfile(id).then((r) => r.status === 200 && setProfile(r.body as Profile));\n  }, [id]);\n  return profile ? <ProfileCard profile={profile} /> : <p>Loading...</p>;\n}\n',
      "docs/profiles.md": "# Profiles\n\n`GET /profiles/:id` and `PUT /profiles/:id`. A bio holds up to 280 characters.\n",
    },
  },
  {
    id: "checkout",
    title: "Checkout validation through path aliases",
    note: "Imports go through a tsconfig `@/` alias and the PR edits existing files. One layer holds a 120-branch rules file and fails the score, so a reviewer knows where to slow down.",
    base: {
      "tsconfig.json": '{\n  "compilerOptions": {\n    "strict": true,\n    "paths": { "@/*": ["./src/*"] }\n  }\n}\n',
      "src/types/order.ts": "export type Order = { id: string; lines: { sku: string; qty: number }[] };\n",
      "src/checkout/submit.ts":
        'import type { Order } from "@/types/order";\n\nexport async function submit(order: Order) {\n  return { ok: true, id: order.id };\n}\n',
    },
    head: {
      "src/types/order.ts": "export type Order = { id: string; coupon?: string; lines: { sku: string; qty: number }[] };\n",
      "src/checkout/rules.ts": rules(120),
      "src/checkout/coupon.ts":
        'import type { Order } from "@/types/order";\n\nexport function couponError(order: Order): string | undefined {\n  if (!order.coupon) return undefined;\n  return /^[A-Z0-9]{6}$/.test(order.coupon) ? undefined : "coupon codes are six letters or digits";\n}\n',
      "src/checkout/submit.ts":
        'import type { Order } from "@/types/order";\nimport { check } from "@/checkout/rules";\nimport { couponError } from "@/checkout/coupon";\n\nexport async function submit(order: Order) {\n  const errors = check(order);\n  const coupon = couponError(order);\n  if (coupon) errors.push(coupon);\n  if (errors.length > 0) return { ok: false, errors };\n  return { ok: true, id: order.id };\n}\n',
      "src/checkout/SubmitButton.tsx":
        'import { submit } from "@/checkout/submit";\nimport type { Order } from "@/types/order";\n\nexport function SubmitButton({ order }: { order: Order }) {\n  return <button onClick={() => submit(order)}>Place order</button>;\n}\n',
    },
  },
  {
    id: "unrelated",
    title: "Two unrelated changes in one PR",
    note: "A logger and a date helper that never import each other. Layers order by import depth only, so the two share layers. Splitting them into separate stacks is on the roadmap.",
    base: {},
    head: {
      "src/log/levels.ts": 'export const LEVELS = ["debug", "info", "warn", "error"] as const;\nexport type Level = (typeof LEVELS)[number];\n',
      "src/log/logger.ts":
        'import { LEVELS, type Level } from "./levels.ts";\n\nexport function logger(min: Level) {\n  return (level: Level, msg: string) => {\n    if (LEVELS.indexOf(level) >= LEVELS.indexOf(min)) console.log(`[${level}] ${msg}`);\n  };\n}\n',
      "src/dates/parse.ts": "export const parseIso = (s: string) => {\n  const d = new Date(s);\n  return Number.isNaN(d.getTime()) ? undefined : d;\n};\n",
      "src/dates/format.ts":
        'import { parseIso } from "./parse.ts";\n\nexport const shortDate = (s: string) => parseIso(s)?.toISOString().slice(0, 10) ?? "invalid date";\n',
    },
  },
  {
    id: "one-file",
    title: "A one-file fix",
    note: "Nothing to carve. DiffCarve says so and stops instead of inventing layers.",
    base: { "src/price.ts": "export const total = (cents: number) => cents / 100;\n" },
    head: { "src/price.ts": "export const total = (cents: number) => Math.round(cents) / 100;\n" },
  },
];
