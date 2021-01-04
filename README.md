# Recommendations Ai

## Prerequisites

- Install Google Cloud Platform CLI and authenticate
- Create a private app for your shopify store

## GCP setup

- Create and enable a new project

```bash
    export PROJECT_ID=recommendations-ai-1234
    gcloud projects create ${PROJECT_ID} --name recommendations-ai 
    gcloud config set project ${PROJECT_ID}
```

- Link a billing account
- Enable the recommendations api

```bash
    gcloud services enable recommendationengine.googleapis.com
```

- Create a service account key so your application can interact with the catalogue API (TODO: add required permissions)

```bash
    export SERVICE_ACCOUNT_NAME=recommendations
    gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME}

    gcloud iam service-accounts keys create ~/key.json --iam-account ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com
```

- Create an API key to log user events (TODO - use cli or api call)

```bash

```

- Create a separate API key to request predictions (TODO - not working)

```bash
    export PREDICTIONS_API_KEY=AIzaSyC4Z2hz21QcoxrU9vA7sCRbK9MY5oQn7Qc
    curl -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json; charset=utf-8" --data "{"predictionApiKeyRegistration": {"apiKey": '${PREDICTIONS_API_KEY}'}}" "https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/predictionApiKeyRegistrations"
```


## Sync shopify products with the recommendations Ai catalog

- Set `SHOPIFY_SHOP_URL`, `SHOPIFY_API_VERSION` and `PRIVATE_APP_PASSWORD` environment variables
- Generate a json file of parsed product info

```bash
    python add_products.py
```

- Upload the products to bigquery

```bash
    bq mk catalog
    bq load --replace --source_format=NEWLINE_DELIMITED_JSON catalog.products ./data/preprocessed_products.json ./recommendations_ai_schema.json
```

- Set catalog level (TODO: not working)

```bash
curl -X PATCH -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json; charset=utf-8" --data "{"catalogItemLevelConfig": {"eventItemLevel": "MASTER","predictItemLevel":"MASTER"}" "https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/predictionApiKeyRegistrations"
```

- Set up a scheduler job to import products from Bigquery to recommednations AI every 0th minute of every hour

```bash
gcloud scheduler --project recommendations-ai-1234 \
jobs create http import_catalog_ip0ghe1truc1 \
--time-zone='America/Los_Angeles' \
--schedule='0 0 * * *' \
--uri='https://recommendationengine.googleapis.com/v1beta1/projects/39575376907/locations/global/catalogs/default_catalog/catalogItems:import' \
--description='Import Recommendations AI catalog data' \
--headers='Content-Type: application/json; charset=utf-8' \
--http-method='POST' \
--message-body='{"inputConfig":{"bigQuerySource":{"projectId":"recommendations-ai-1234","datasetId":"catalog","tableId":"products","dataSchema":"catalog_recommendations_ai"}}}' \
--oauth-service-account-email='recs-515@recommendations-ai-1234.iam.gserviceaccount.com'
```

## Record user events on your shopify website

Users can be identified by their sessionId (unique for a session), clientId (unique for a given device) or userId (unique).

### Prerequisites

- Go to store > theme > edit theme code
- Follow these instructions to [add analytics.js to your website](https://developers.google.com/analytics/devguides/collection/analyticsjs) with the correct google analytics project
- Create `/assets/user_events.js` in your theme code and copy code across
- Load the javascript in `theme.liquid` file

### Recording events

#### Required events

- detailPageView can be tracked with code added to product.liquid
- addedToCart can be tracked with code added to theme.js after call to AJAX api
- homePageView can be tracked with code added to index.liquid
- purchaseComplete can be tracked with code added to settings > checkout > additional scripts. You can test this code by [placing a test order](https://help.shopify.com/en/manual/checkout-settings/test-orders). [See this for looping through products in the order](https://help.shopify.com/en/manual/orders/status-tracking/customize-order-status/add-conversion-tracking)

#### Suggested events

#### Nice to have events

## Serve recommendations to your users

How can I serve predictions to my users? 

- Add an HTML container where you want to serve the recommendations
- Add a javascript function that finds your HTML container, requests recs and then appends products to DOM
- Call function whenever the user loads the home page

```bash
curl -X POST -H "Content-Type: application/json; charset=utf-8" --data  '{"dryRun": true, "userEvent": {"eventType": "detail-page-view","userInfo": {"visitorId": "645951754.1609442302"},"eventDetail": {},"productEventDetail": {"productDetails": [{"id": "6158282784966"}]}}}' https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/placements/recently_viewed_default:predict?key=AIzaSyCcX57W5aiUjWNeFfW4Qs8Gv8IND117iMc
```

You can serve recommendations anywhere in the customer journey.

There are 4 model types, 3 of which use ML and require sufficient data to be collected before they can be trained.

When you request recommendations, you pass a user event that triggered the request. This provides context. Eg if the user viewed a product detail page or landed on the home page you can pass as user event describing that to your call for recs.

The returned response contains a list of products and corresponding token (to identify these as recommendations). You need to pass this token in subsequent user events that correspond to these recs.

You can filter recs by their tags and whether or not they are in stock.

### [How to serve recs](https://shopify.dev/tutorials/develop-theme-recommended-products-using-json-api#tracking-conversions-for-product-recommendations)

## ToDo

- [ ] Serve recommendations
    - [x] Retrieve recently viewed recommendations via post request
    - [ ] Serve recently viewed recommendations on shopify site
    - [ ] Hide API key from browsers
- [ ] User events
    - [ ] Trigger encouraged events in shopify code
    - [ ] Trigger nice-to-have events in shopify code
    - [ ] Complete user_event payloads for different event types
        - [ ] Add customerId for addToCart
        - [ ] Add data for purchaseComplete event
    - [ ] Test user event code in various browsers
    - [ ] Change visitorId to sessionId? Docs recommend visitId be sessionId and customerId be userId. Is there space for the clientId somewhere?
    - [ ] Export existing user events from shopify to recs Ai
- [ ] Catalog
    - [ ] Add required catalog fields
        - [ ] add tags to filter recs
        - [ ] correctly add category heirarchies
    - [ ] Add optional catalog fields
        - [ ] https://cloud.google.com/recommendations-ai/docs/catalog#required-fields
    - [ ] Include custom feature maps
    - [ ] Use GCP python client library for robust product upload - [ ] https://googleapis.dev/python/recommendationengine/latest/index.html
    - [ ] Schedule product catalog updates

## Implementation Checklist

- [ ] Periodically sync product catalog with our service
- [ ] Log user events to our service
- [ ] Collect 1 week of data (or import historical user events)
- [ ] Train recommendation models for different placements
- [ ] Serve recommendations in customer journey

## Value Prop

- Personalize for a given session, visitor or authenticated user
- Ingest custom user and product features to improve recommendation quality
- Pay only for the recommendations you serve to your customers
- [4 core types of recommendations](https://cloud.google.com/recommendations-ai/docs/placements#model-types)
    - *others you may like* predicts the next product a user will engage with
    - *frequently bought together* predicts, given products currently being viewed, which items will be bought together within the same shopping session
    - *recommended for you* predicts the next product a user will engage with/purchase given their shopping/viewing history
    - *recently viewed* simply shows the most recently viewed products in order

## Comparison

|       | Ollie | Certona | 
|-------|-------|---------|
| Setup | non-technical DIY in <10 mins | Contact team for custom integration | 
| Price | $X per recommendations request | $X/month | 

## Making this an application

I can create a python or node application and use ngrok to expose it. Then I can creak webhooks in shopify admin, that send data to my application when things change. Webhooks allow the trigger to be on the shopify admin side :)

The application can process the data and make changes to GCP or shopify using API calls.

Webhooks will be a good solution for logging user purchase events or even updating the recommender catalog.

When users interact with the site, events must be logged from the frontend. This will require tracking code of some kind. To modify the front end, I can make changes to theme code, or I can use script tags. When the app is installed into a shop, the script tags are added to their storefront without the theme needing to be updated. This would be great for tracking events without the user needing to modify theme code.

To serve recs, I want a custom widget that displays on the front end... Ideally this would inherit shopify theme properties to have minimal UI work required.
