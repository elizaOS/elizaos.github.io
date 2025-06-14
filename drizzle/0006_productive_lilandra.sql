-- Also drop the index on the score field
DROP INDEX IF EXISTS "idx_users_score"; 

-- Migration to remove the score field from users table since scores are now stored in user_daily_scores
ALTER TABLE "users" DROP COLUMN "score";

