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

- Create an API key to log user events in the console

```bash
TODO
```

- Create a separate API key to request predictions in the console

```bash
    export PREDICTIONS_API_KEY=AIzaSyC4Z2hz21QcoxrU9vA7sCRbK9MY5oQn7Qc
    curl -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json; charset=utf-8" --data "{"predictionApiKeyRegistration": {"apiKey": '${PREDICTIONS_API_KEY}'}}" "https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/predictionApiKeyRegistrations"
```



## Sync shopify products with the recommendations Ai catalog

- Set environment variables for your project

```bash
export RECS_EVENT_KEY=<your recs event key>
export RECS_PREDICT_KEY=<your predict key>
export SHOPIFY_URL=<your website homepage>
firebase functions:config:set shopify.url=${SHOPIFY_URL} recs.event_key=${RECS_EVENT_KEY} recs.predict_key=${RECS_PREDICT_KEY}
firebase functions:config:get
```

- Deploy cloud functions for catalog syncing, event logging and predictions requests

```bash
firebase deploy --only functions
```

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

### Prerequisites

- Go to store > theme > edit theme code
- Follow these instructions to [add analytics.js to your website](https://developers.google.com/analytics/devguides/collection/analyticsjs) with the correct google analytics project
- Create `/assets/user_events.js` in your theme code and copy code across
- Load the javascript in `theme.liquid` file
- Add scripts to trigger js functions elsewhere in theme

### Recording events

## Serve recommendations to your users

I need to create `recommended-for-you.liquid` section that defines a product recs carousel using other templates from the theme such as the product grid template. Then in that section I want to access a list of recommended products.

The `theme.ProductRecommendations` function returns a function that sets the innerHTML of it's container. This function is registered to the `production-recommendations` section.

The recommendations section simply uses the recommendations liquid object to render recs. I do not have this.

I can add code to my liquid file that loads recs when the section loads. Since it's in liquid, I can load the template for the products?

## ToDo

- [ ] Track user events
    - [x] Trigger required events in shopify theme code
        - [x] detail-page-view (product.liquid)
        - [x] added-to-cart (theme.js `/cart/add.js` and `cart/update.js`)
        - [x] home-page-view (index.liquid)
        - [x] purchase-complete (settings > checkout > additional scripts or  webhook?)
    - [x] Trigger encouraged events in shopify theme code
        - [x] checkout-start (`onClick` to checkout button)
        - [x] category-page-view (collection.liquid)
        - [x] remove-from-cart (theme.js `/cart/change.js` and `cart/update.js`)
        - [x] search (search.liquid)
        - [x] shopping-cart-page-view (cart.liquid)
    - [ ] Trigger nice-to-have events in shopify theme code
        - [x] page-visit (onload method of js script loader)
        - [ ] refund (`refunds/create` webhook)
        - [ ] add-to-list (not available for Hexxee)
        - [ ] remove-from-list (not available for Hexxee)
    - [ ] Complete required event payloads
        - [x] detail-page-view ()
        - [ ] added-to-cart (customerId missing)
        - [x] home-page-view ()
        - [ ] purchase-complete (everything missing)
    - [ ] Complete encouraged event payloads
        - [ ] checkout-start ()
        - [ ] category-page-view ()
        - [ ] remove-from-cart ()
        - [ ] search ()
        - [ ] shopping-cart-page-view ()
    - [ ] Complete nice-to-have event payloads
        - [ ] page-visit ()
        - [ ] refund ()
        - [ ] add-to-list (not available for Hexxee)
        - [ ] remove-from-list (not available for Hexxee)
    - [x] Hide API key from browsers with restricted cloud function
    - [ ] Use script tags to trigger user events where possible
- [ ] Sync catalog
    - [ ] Schedule product catalog updates with cloud function
    - [ ] Add required catalog fields
        - [ ] add tags to filter recs
        - [ ] correctly add category heirarchies
    - [ ] Add optional catalog fields
        - [ ] https://cloud.google.com/recommendations-ai/docs/catalog#required-fields
    - [ ] Include custom feature maps
- [ ] Serve recommendations
    - [x] Retrieve recently viewed recommendations via post request
    - [x] Retrieve recently viewed recommendations json response on shopify site
    - [x] Hide API key from browsers with restricted cloud function
    - [x] Render recommendations in theme from response
    - [ ] In a separate HTML file, render recommendations identically to Hexee page
    - [ ] Render recs on shopify site professionally
- [ ] Start AB test
    - [ ] Add feature flags to turn recs on or off for shopify site

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

|       | Ollie | Certona | Shopify |
|-------|-------|---------|
| Setup | non-technical DIY in <10 mins | Contact team for custom integration | no setup |
| Price | $X per recommendations request | $X/month | free |
| Max products | unlimited | unlimited | 5000 |
| Types of recs | home, pdp, cart | home, pdp, cart | pdp |


## Making this an application

I can create a python or node application and use ngrok to expose it. Then I can creak webhooks in shopify admin, that send data to my application when things change. Webhooks allow the trigger to be on the shopify admin side :)

The application can process the data and make changes to GCP or shopify using API calls.

Webhooks will be a good solution for logging user purchase events or even updating the recommender catalog.

When users interact with the site, events must be logged from the frontend. This will require tracking code of some kind. To modify the front end, I can make changes to theme code, or I can use script tags. When the app is installed into a shop, the script tags are added to their storefront without the theme needing to be updated. This would be great for tracking events without the user needing to modify theme code.

To serve recs, I want a custom widget that displays on the front end... Ideally this would inherit shopify theme properties to have minimal UI work required.
