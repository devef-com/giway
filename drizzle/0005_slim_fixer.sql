CREATE TABLE "mercadopago_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pack_id" integer,
	"preference_id" varchar(255) NOT NULL,
	"payment_id" varchar(255),
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'ARS' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mercadopago_payments_preference_id_unique" UNIQUE("preference_id"),
	CONSTRAINT "mercadopago_payments_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
ALTER TABLE "pack_redemptions" ADD COLUMN "mercadopago_payment_id" integer;--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD CONSTRAINT "mercadopago_payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mercadopago_payments" ADD CONSTRAINT "mercadopago_payments_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_redemptions" ADD CONSTRAINT "pack_redemptions_mercadopago_payment_id_mercadopago_payments_id_fk" FOREIGN KEY ("mercadopago_payment_id") REFERENCES "public"."mercadopago_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_redemptions" ADD CONSTRAINT "pack_redemptions_mercadopago_payment_id_unique" UNIQUE("mercadopago_payment_id");