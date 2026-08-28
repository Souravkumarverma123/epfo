ALTER TABLE "ledger_entries" ADD COLUMN "employment_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD COLUMN "contribution_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_employment_id_employments_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."employments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_contribution_id_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_employment_idx" ON "ledger_entries" USING btree ("employment_id");