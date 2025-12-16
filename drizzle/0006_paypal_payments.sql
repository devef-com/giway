CREATE TABLE "paypal_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pack_id" integer,
	"paypal_order_id" varchar(255) NOT NULL,
	"paypal_capture_id" varchar(255),
	"payer_id" varchar(255),
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"status" varchar(30) DEFAULT 'CREATED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paypal_payments_paypal_order_id_unique" UNIQUE("paypal_order_id")
);
--> statement-breakpoint
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paypal_payments" ADD CONSTRAINT "paypal_payments_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE set null ON UPDATE no action;
