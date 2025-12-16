ALTER TABLE "pack_redemptions" ADD COLUMN "paypal_payment_id" integer;--> statement-breakpoint
ALTER TABLE "pack_redemptions" ADD CONSTRAINT "pack_redemptions_paypal_payment_id_unique" UNIQUE("paypal_payment_id");--> statement-breakpoint
ALTER TABLE "pack_redemptions" ADD CONSTRAINT "pack_redemptions_paypal_payment_id_paypal_payments_id_fk" FOREIGN KEY ("paypal_payment_id") REFERENCES "public"."paypal_payments"("id") ON DELETE set null ON UPDATE no action;
