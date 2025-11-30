CREATE TABLE "drawing_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"drawing_id" varchar(255) NOT NULL,
	"asset_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "mime_type" varchar(100);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "size" integer;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "s3_key" varchar(500);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "drawing_assets" ADD CONSTRAINT "drawing_assets_drawing_id_drawings_id_fk" FOREIGN KEY ("drawing_id") REFERENCES "public"."drawings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawing_assets" ADD CONSTRAINT "drawing_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;