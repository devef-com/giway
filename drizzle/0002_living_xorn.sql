ALTER TABLE "balance_consumptions" DROP CONSTRAINT "balance_consumptions_drawing_id_drawings_id_fk";
--> statement-breakpoint
ALTER TABLE "balance_consumptions" ADD CONSTRAINT "balance_consumptions_drawing_id_drawings_id_fk" FOREIGN KEY ("drawing_id") REFERENCES "public"."drawings"("id") ON DELETE set null ON UPDATE no action;