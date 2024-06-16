# Tweet Scraper

This project is a Node.js application designed to scrape tweets from a specific user's timeline and save them either to a file or a PostgreSQL database.

This was initially designed and tested against scraping my own tweets, because the twitter archive functionality has been broken forever and I want to export my own data. If you want to use it for something else, your own mileage my vary.

The application uses the Twitter API just as your browser does, potentially with a lot of junk that is not needed, but I kept all the config the same as Chrome. You must provide the necessary authentication tokens through environment variables.

## Features

- Fetch tweets from a specific user's timeline.
- Save tweets to a text file.
- Insert tweets into a PostgreSQL database.

## Requirements

- Node.js
- NPM
- PostgreSQL (optional if you are using the database feature)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository_url>
   cd <repository_directory>
   ```

2. Install the required packages:

   ```Copy code
   npm install
   ```

3. Create a .env file in the root directory and provide the following environment variables:

   ```
   AUTHORIZATION=your_authorization_token
   CSRF_TOKEN=your_csrf_token
   COOKIE=your_cookie

   PGUSER=your_postgres_user
   PGHOST=your_postgres_host
   PGDATABASE=your_postgres_database
   PGPASSWORD=your_postgres_password
   PGPORT=your_postgres_port
   ```

4. If you are scraping to postgres, you first need to create the database and tables:

   ```
   CREATE DATABASE tweet_database;

   CREATE TABLE tweets (
    tweet_id BIGINT PRIMARY KEY,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    prior_tweet_id BIGINT,
    module_id TEXT
   );
   ```

## Usage

You need to configure:

userId: The user ID of the account from which to fetch tweets.
tweetCount: The number of tweets to fetch.
delayTime: The delay time between requests to prevent rate limiting. I use 10 seconds.

`node scrape_to_file.js`

`node scrape_to_postgres.js`
