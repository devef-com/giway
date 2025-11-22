CREATE TABLE "drawing_winners" (
	"id" serial PRIMARY KEY NOT NULL,
	"drawing_id" varchar(255) NOT NULL,
	"participant_id" integer NOT NULL,
	"selected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drawings" RENAME COLUMN "winner_number" TO "winners_amount";--> statement-breakpoint
ALTER TABLE "drawings" ADD COLUMN "winner_numbers" integer[];--> statement-breakpoint
ALTER TABLE "drawing_winners" ADD CONSTRAINT "drawing_winners_drawing_id_drawings_id_fk" FOREIGN KEY ("drawing_id") REFERENCES "public"."drawings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawing_winners" ADD CONSTRAINT "drawing_winners_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawings" DROP COLUMN "winner_id";