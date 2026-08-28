CREATE TABLE "nominees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"relationship" text NOT NULL,
	"share_percentage" integer NOT NULL,
	"set_on" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "nominees" ADD CONSTRAINT "nominees_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "nominees_member_idx" ON "nominees" USING btree ("member_id");