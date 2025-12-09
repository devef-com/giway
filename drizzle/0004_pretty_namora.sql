CREATE TYPE "public"."author_type" AS ENUM('host', 'participant');--> statement-breakpoint
CREATE TABLE "participant_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"participant_id" integer NOT NULL,
	"author_id" text,
	"author_type" "author_type" DEFAULT 'host' NOT NULL,
	"author_name" varchar(255),
	"comment" text NOT NULL,
	"is_visible_to_participant" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_comments" ADD CONSTRAINT "participant_comments_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_comments" ADD CONSTRAINT "participant_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;