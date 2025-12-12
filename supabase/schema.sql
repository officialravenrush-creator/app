-- USER PROFILE
CREATE TABLE user_profiles (
  user_id text PRIMARY KEY,
  username text,
  avatar_url text,
  referral_code text UNIQUE NOT NULL,
  referred_by text,
  created_at timestamptz DEFAULT now()
);

-- MINING DATA
CREATE TABLE mining_data (
  user_id text PRIMARY KEY REFERENCES user_profiles(user_id),
  mining_active boolean DEFAULT false,
  last_start timestamptz,
  last_claim timestamptz,
  balance bigint DEFAULT 0
);

-- REFERRAL DATA
CREATE TABLE referral_data (
  user_id text PRIMARY KEY REFERENCES user_profiles(user_id),
  total_referred integer DEFAULT 0,
  referred_users text[] DEFAULT '{}'
);

-- BOOST DATA
CREATE TABLE boost_data (
  user_id text PRIMARY KEY REFERENCES user_profiles(user_id),
  used_today integer DEFAULT 0,
  last_reset timestamptz,
  balance bigint DEFAULT 0
);

-- DAILY CLAIM DATA
CREATE TABLE daily_claim_data (
  user_id text PRIMARY KEY REFERENCES user_profiles(user_id),
  last_claim timestamptz,
  streak integer DEFAULT 0,
  total_earned bigint DEFAULT 0
);

-- WATCH EARN DATA
CREATE TABLE watch_earn_data (
  user_id text PRIMARY KEY REFERENCES user_profiles(user_id),
  total_watched integer DEFAULT 0,
  total_earned bigint DEFAULT 0
);
