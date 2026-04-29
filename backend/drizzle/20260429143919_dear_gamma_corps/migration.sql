CREATE TABLE "app_state" (
	"id" serial PRIMARY KEY,
	"state" jsonb DEFAULT '{"createNewAdmin":true}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_page_subtitle" (
	"id" serial PRIMARY KEY,
	"chapter_page_id" serial,
	"author_id" text NOT NULL,
	"box" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_pages" (
	"id" serial PRIMARY KEY,
	"chapter_id" serial,
	"author_id" text NOT NULL,
	"hashing" text NOT NULL,
	"page_number" serial,
	"image_url" text NOT NULL,
	"content" text NOT NULL,
	"subtitle_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter" (
	"id" serial PRIMARY KEY,
	"comic_id" serial,
	"author_id" text NOT NULL,
	"index" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"page_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comic" (
	"id" serial PRIMARY KEY,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"chapter_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"username" text NOT NULL,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"description" text,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"profile_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"admin_role" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "comics_updated_at_idx" ON "comic" ("updated_at");--> statement-breakpoint
CREATE INDEX "comics_created_at_idx" ON "comic" ("created_at");--> statement-breakpoint
CREATE INDEX "comics_updated_at_id_idx" ON "comic" ("updated_at","id");--> statement-breakpoint
CREATE INDEX "comics_created_at_id_idx" ON "comic" ("created_at","id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chapter_page_subtitle" ADD CONSTRAINT "chapter_page_subtitle_chapter_page_id_chapter_pages_id_fkey" FOREIGN KEY ("chapter_page_id") REFERENCES "chapter_pages"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chapter_pages" ADD CONSTRAINT "chapter_pages_chapter_id_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapter"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chapter" ADD CONSTRAINT "chapter_comic_id_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comic"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;