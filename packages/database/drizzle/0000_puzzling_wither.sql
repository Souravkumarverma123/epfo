CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"reason" text,
	"trace_id" text,
	"operation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text,
	"actor_type" text DEFAULT 'SYSTEM' NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_number" text NOT NULL,
	"member_id" uuid NOT NULL,
	"type" text NOT NULL,
	"purpose" text,
	"amount_paise" bigint NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"reason_code" text,
	"reason_detail" text,
	"operation_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"employment_id" uuid NOT NULL,
	"month" text NOT NULL,
	"employee_share_paise" bigint NOT NULL,
	"employer_share_paise" bigint NOT NULL,
	"pension_share_paise" bigint NOT NULL,
	"posted_on" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'POSTED' NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dependency_state" (
	"dependency" text PRIMARY KEY NOT NULL,
	"mode" text DEFAULT 'UP' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"type" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"scan_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"employer_name" text NOT NULL,
	"establishment_code" text NOT NULL,
	"joined_on" text NOT NULL,
	"exited_on" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"actor_id" text NOT NULL,
	"operation" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"response" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_records_actor_id_operation_key_pk" PRIMARY KEY("actor_id","operation","key")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"transaction_id" uuid NOT NULL,
	"type" text NOT NULL,
	"direction" text NOT NULL,
	"amount_paise" bigint NOT NULL,
	"balance_after_paise" bigint NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_balances" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"current_balance_paise" bigint NOT NULL,
	"last_sequence_number" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uan" text NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"masked_aadhaar" text,
	"masked_pan" text,
	"mobile" text NOT NULL,
	"email" text,
	"bank_account_masked" text,
	"bank_ifsc" text,
	"kyc_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"code" text NOT NULL,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"locked_until" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_transitions" ADD CONSTRAINT "claim_transitions_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_employment_id_employments_id_fk" FOREIGN KEY ("employment_id") REFERENCES "public"."employments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employments" ADD CONSTRAINT "employments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_balances" ADD CONSTRAINT "member_balances_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_log_operation_idx" ON "audit_log" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "claim_transitions_claim_idx" ON "claim_transitions" USING btree ("claim_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "claims_number_idx" ON "claims" USING btree ("claim_number");--> statement-breakpoint
CREATE INDEX "claims_member_idx" ON "claims" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "claims_status_idx" ON "claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "claims_operation_idx" ON "claims" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "contributions_member_idx" ON "contributions" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contributions_member_month_idx" ON "contributions" USING btree ("member_id","employment_id","month");--> statement-breakpoint
CREATE INDEX "documents_claim_idx" ON "documents" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "employments_member_idx" ON "employments" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_member_sequence_idx" ON "ledger_entries" USING btree ("member_id","sequence_number");--> statement-breakpoint
CREATE INDEX "ledger_member_created_idx" ON "ledger_entries" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_txn_idx" ON "ledger_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_uan_idx" ON "members" USING btree ("uan");--> statement-breakpoint
CREATE INDEX "otp_codes_member_idx" ON "otp_codes" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "outbox_status_idx" ON "outbox_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "sessions_member_idx" ON "sessions" USING btree ("member_id");