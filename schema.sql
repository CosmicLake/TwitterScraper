-- Create the database
CREATE DATABASE tweet_database;

-- Connect to the database
\c tweet_database;

-- Create the schema
CREATE TABLE tweets (
    tweet_id BIGINT PRIMARY KEY,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    prior_tweet_id BIGINT,
    module_id TEXT
);
