CREATE TABLE "balance_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"drawing_id" varchar(255) NOT NULL,
	"giway_type" "giway_type" NOT NULL,
	"participants" integer DEFAULT 0 NOT NULL,
	"images" integer DEFAULT 0 NOT NULL,
	"emails" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drawing_assets" ADD COLUMN "is_cover" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "balance_consumptions" ADD CONSTRAINT "balance_consumptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_consumptions" ADD CONSTRAINT "balance_consumptions_drawing_id_drawings_id_fk" FOREIGN KEY ("drawing_id") REFERENCES "public"."drawings"("id") ON DELETE cascade ON UPDATE no action;