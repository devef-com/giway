import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const winnerSelectionEnum = pgEnum('winner_selection', [
  'manually',
  'system',
])

export const giwayTypeEnum = pgEnum('giway_type', [
  'play_with_numbers', // raffle
  'no_numbers', // giveaway drawing
])

export const redemptionSourceEnum = pgEnum('redemption_source', [
  'purchase', // bought with money
  'coupon', // redeemed with coupon
  'ads', // earned by watching ads
  'monthly', // monthly free allowance
])

// Assets table (polymorphic)
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  modelType: varchar('model_type', { length: 50 }).notNull(), // 'drawing' or 'participant'
  modelId: varchar('model_id', { length: 255 }).notNull(), // drawing.id or participant.id
  url: text('url').notNull(),
  mimeType: varchar('mime_type', { length: 100 }), // e.g., 'image/jpeg', 'image/png'
  size: integer('size'), // File size in bytes
  s3Key: varchar('s3_key', { length: 500 }), // S3/R2 storage key
  ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }), // Owner of the asset
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Drawing Assets junction table (for multiple images per drawing)
export const drawingAssets = pgTable('drawing_assets', {
  id: serial('id').primaryKey(),
  drawingId: varchar('drawing_id', { length: 255 })
    .notNull()
    .references(() => drawings.id, { onDelete: 'cascade' }),
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0), // For ordering images
  isCover: boolean('is_cover').default(false), // Only one per drawing, used for OG meta image
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Number slots table (for efficient number availability tracking)
export const numberSlots = pgTable('number_slots', {
  id: serial('id').primaryKey(),
  drawingId: varchar('drawing_id', { length: 255 })
    .notNull()
    .references(() => drawings.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('available'), // 'available', 'reserved', 'taken'
  participantId: integer('participant_id').references(() => participants.id, {
    onDelete: 'set null',
  }),
  reservedAt: timestamp('reserved_at'),
  expiresAt: timestamp('expires_at'), // For temporary reservations
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Participants table
export const participants = pgTable('participants', {
  id: serial('id').primaryKey(),
  drawingId: varchar('drawing_id', { length: 255 })
    .notNull()
    .references(() => drawings.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }).notNull(),
  selectedNumber: integer('selected_number'), // The number chosen by participant (if applicable)
  logNumbers: integer('log_numbers').array(), // Track numbers selected by rejected participants
  isEligible: boolean('is_eligible'), // null = pending, true = approved, false = rejected
  paymentCaptureId: integer('payment_capture_id').references(() => assets.id), // Reference to payment proof asset
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Drawing Winners junction table
export const drawingWinners = pgTable('drawing_winners', {
  id: serial('id').primaryKey(),
  drawingId: varchar('drawing_id', { length: 255 })
    .notNull()
    .references(() => drawings.id, { onDelete: 'cascade' }),
  participantId: integer('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  selectedAt: timestamp('selected_at').notNull().defaultNow(),
  // Optional: Add fields like prize tier, announcement status, etc.
})

// Drawing table
export const drawings = pgTable('drawings', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  guidelines: text('guidelines').array(),
  isPaid: boolean('is_paid').notNull().default(false),
  price: integer('price').default(0),
  winnerSelection: winnerSelectionEnum('winner_selection').notNull(),
  quantityOfNumbers: integer('quantity_of_numbers').notNull().default(0),
  playWithNumbers: boolean('play_with_numbers').default(false),
  winnersAmount: integer('winners_amount').notNull().default(1), // how many winners to select
  winnerNumbers: integer('winner_numbers').array(), // Array of winning numbers(enter by user or randomly selected)
  endAt: timestamp('end_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Copilot: do Not delete this
export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Packs table - defines available packs for purchase/redemption
export const packs = pgTable('packs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  giwayType: giwayTypeEnum('giway_type').notNull(), // 'play_with_numbers' or 'no_numbers'
  participants: integer('participants').notNull().default(0), // max participants allowed
  images: integer('images').notNull().default(0), // max images that can be uploaded
  emails: integer('emails').notNull().default(0), // max email notifications
  price: integer('price').notNull().default(0), // price in cents
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  polarId: varchar('polar_id', { length: 250 }).unique(), // Polar product ID for subscriptions
})

// User balances table - tracks current available balance for users
export const userBalances = pgTable('user_balances', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  giwayType: giwayTypeEnum('giway_type').notNull(), // separate balances for each giway type
  participants: integer('participants').notNull().default(0),
  images: integer('images').notNull().default(0),
  emails: integer('emails').notNull().default(0),
  expiresAt: timestamp('expires_at'), // null = never expires (purchased), set = monthly allowance
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Pack redemptions table - logs all pack purchases/redemptions
export const packRedemptions = pgTable('pack_redemptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  packId: integer('pack_id').references(() => packs.id, {
    onDelete: 'set null',
  }),
  source: redemptionSourceEnum('source').notNull(), // 'purchase', 'coupon', 'ads', 'monthly'
  couponId: integer('coupon_id').references(() => coupons.id, {
    onDelete: 'set null',
  }),
  giwayType: giwayTypeEnum('giway_type').notNull(),
  participants: integer('participants').notNull().default(0), // amount added
  images: integer('images').notNull().default(0),
  emails: integer('emails').notNull().default(0),
  amountPaid: integer('amount_paid').default(0), // amount in cents if purchased
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Coupons table - for coupon redemption system
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  giwayType: giwayTypeEnum('giway_type').notNull(),
  participants: integer('participants').notNull().default(0),
  images: integer('images').notNull().default(0),
  emails: integer('emails').notNull().default(0),
  maxUses: integer('max_uses'), // null = unlimited
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at'), // null = never expires
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Better Auth tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
})

// Relations
export const usersRelations = relations(user, ({ many }) => ({
  drawings: many(drawings),
  balances: many(userBalances),
  packRedemptions: many(packRedemptions),
}))

export const drawingsRelations = relations(drawings, ({ one, many }) => ({
  user: one(user, {
    fields: [drawings.userId],
    references: [user.id],
  }),
  participants: many(participants),
  winners: many(drawingWinners),
  drawingAssets: many(drawingAssets),
}))

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    drawing: one(drawings, {
      fields: [participants.drawingId],
      references: [drawings.id],
    }),
    paymentCapture: one(assets, {
      fields: [participants.paymentCaptureId],
      references: [assets.id],
    }),
    numberSlots: many(numberSlots),
    wonDrawings: many(drawingWinners),
  }),
)

export const drawingWinnersRelations = relations(drawingWinners, ({ one }) => ({
  drawing: one(drawings, {
    fields: [drawingWinners.drawingId],
    references: [drawings.id],
  }),
  participant: one(participants, {
    fields: [drawingWinners.participantId],
    references: [participants.id],
  }),
}))

// Drawing Assets relations
export const drawingAssetsRelations = relations(drawingAssets, ({ one }) => ({
  drawing: one(drawings, {
    fields: [drawingAssets.drawingId],
    references: [drawings.id],
  }),
  asset: one(assets, {
    fields: [drawingAssets.assetId],
    references: [assets.id],
  }),
}))

// Assets relations
export const assetsRelations = relations(assets, ({ one, many }) => ({
  owner: one(user, {
    fields: [assets.ownerId],
    references: [user.id],
  }),
  drawingAssets: many(drawingAssets),
}))

// User balance relations
export const userBalancesRelations = relations(userBalances, ({ one }) => ({
  user: one(user, {
    fields: [userBalances.userId],
    references: [user.id],
  }),
}))

export const packRedemptionsRelations = relations(
  packRedemptions,
  ({ one }) => ({
    user: one(user, {
      fields: [packRedemptions.userId],
      references: [user.id],
    }),
    pack: one(packs, {
      fields: [packRedemptions.packId],
      references: [packs.id],
    }),
    coupon: one(coupons, {
      fields: [packRedemptions.couponId],
      references: [coupons.id],
    }),
  }),
)

export const packsRelations = relations(packs, ({ many }) => ({
  redemptions: many(packRedemptions),
}))

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(packRedemptions),
}))

// Type exports for TypeScript usage
export type Drawing = typeof drawings.$inferSelect
export type NewDrawing = typeof drawings.$inferInsert
export type Participant = typeof participants.$inferSelect
export type NewParticipant = typeof participants.$inferInsert
export type NumberSlot = typeof numberSlots.$inferSelect
export type NewNumberSlot = typeof numberSlots.$inferInsert
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type DrawingWinner = typeof drawingWinners.$inferSelect
export type NewDrawingWinner = typeof drawingWinners.$inferInsert
export type DrawingAsset = typeof drawingAssets.$inferSelect
export type NewDrawingAsset = typeof drawingAssets.$inferInsert
export type Pack = typeof packs.$inferSelect
export type NewPack = typeof packs.$inferInsert
export type UserBalance = typeof userBalances.$inferSelect
export type NewUserBalance = typeof userBalances.$inferInsert
export type PackRedemption = typeof packRedemptions.$inferSelect
export type NewPackRedemption = typeof packRedemptions.$inferInsert
export type Coupon = typeof coupons.$inferSelect
export type NewCoupon = typeof coupons.$inferInsert
