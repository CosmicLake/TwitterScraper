require('dotenv').config();
const axios = require('axios');

const headers = {
    'Authorization': process.env.AUTHORIZATION,
    'x-csrf-token': process.env.CSRF_TOKEN,
    'Cookie': process.env.COOKIE,
};

const userId = '1496397897742491653';  // Your user ID
const tweetCount = 5;  // Number of tweets to fetch

async function fetchTweets(cursor = null, collectedTweets = []) {
    const variables = {
        userId: userId,
        count: Math.min(tweetCount - collectedTweets.length, 20),
        includePromotedContent: true,
        withQuickPromoteEligibilityTweetFields: true,
        withVoice: true,
        withV2Timeline: true,
        cursor: cursor,
    };

    const features = {
        rweb_tipjar_consumption_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        communities_web_enable_tweet_community_results_fetch: true,
        c9s_tweet_anatomy_moderator_badge_enabled: true,
        articles_preview_enabled: true,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        creator_subscriptions_quote_tweet_preview_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        rweb_video_timestamps_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_enhance_cards_enabled: false,
    };

    try {
        const response = await axios.get(`https://x.com/i/api/graphql/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets`, {
            headers: headers,
            params: {
                variables: JSON.stringify(variables),
                features: JSON.stringify(features),
                fieldToggles: JSON.stringify({ withArticlePlainText: false }),
            },
        });

        const entries = response.data.data.user.result.timeline_v2.timeline.instructions.find(
            (instruction) => instruction.type === 'TimelineAddEntries'
        ).entries;

        for (const entry of entries) {
            if (entry.content.entryType === 'TimelineTimelineItem') {
                const tweet = entry.content.itemContent.tweet_results.result;
                const tweetData = {
                    tweetId: tweet.rest_id,
                    text: tweet.legacy.full_text,
                    timestamp: tweet.legacy.created_at,
                };
                collectedTweets.push(tweetData);
            }
        }

        if (collectedTweets.length < tweetCount) {
            const cursorEntry = entries.find(
                (entry) => entry.content.entryType === 'TimelineTimelineCursor'
            );
            if (cursorEntry) {
                return await fetchTweets(cursorEntry.content.value, collectedTweets);
            }
        }

        return collectedTweets;

    } catch (error) {
        console.error('Error fetching tweets:', error);
    }
}

(async () => {
    const tweets = await fetchTweets();
    console.log('Fetched tweets:', tweets);
})();
