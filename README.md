# Recommendations Ai

## Prerequisites

- Install Google Cloud Platform CLI and authenticate

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


## Add shopify products to the recommendations Ai catalog

- Export products from shopify dashboard to simple csv and move to `./data/products_export_1.csv`
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

- Create `/assets/user_events.js` in your theme code and copy code across
- Load the javascript in `theme.liquid` file
- Trigger events from your website

When a user completes an action that can be used to train the model, you must send data to recommendations AI, which can be used for training.

This involves adding tags to your website, which 'fire' when the user completes an important action. You need to pass information when firing the tag, like the id of the user and the id of the product.

### How can I add javascript code to my website?

- Edit the code for the website theme
- Add `assets/recommendations_ai.js` with functions for recommendations AI
- Load javascript file in theme liquid template
- Trigger functions at various places in your website
- `console.log('stuff')` or `alert('fired!')` from your javascript functions to see when they fire 
- Save and preview, then try to trigger your event :)

### Where should I trigger recommendations AI specific events from?

### How an I pass data from shopify liquid backend to my javascript functions?
https://www.youtube.com/watch?v=BaDbmXQXpxA&ab_channel=CodewithChristheFreelancer

- Shopify liquid exposes data to the frontend so the website can render it - https://shopify.dev/docs/themes/liquid/reference/filters. This will be great for passing info to the functions you trigger.
- The storefront API also allows me to access data from a third party. I could use this with a cloud function to retrieve everything I need for sending events and simplify the code that gets added to the shopify theme... However, then I have unecessary cost associated with firing cloud functions millions of times.
- 


- Can I just have a cloud function trigger on a pageview and use that function to send tracking data to recommendations ai? - https://tonyxu.io/posts/2018/use-firebase-cloud-function-to-count-website-visitors/

## Show recs on your website

- Shopify has a themed recs widget! I can simply request recs and show them if returned on the site - https://shopify.dev/tutorials/develop-theme-recommended-products-using-json-api#tracking-conversions-for-product-recommendations

## Start an AB test

- Before 

## ToDo

### Product Catalog

- Pass session and user id from frontend to recommendations AI
- Add required catalog fields
    - correctly add category heirarchies
- Add optional catalog fields
    - https://cloud.google.com/recommendations-ai/docs/catalog#required-fields
- Include custom feature maps per customer
- Use shopify python client for robust product download
- Use GCP python client library for robust product upload - https://googleapis.dev/python/recommendationengine/latest/index.html
- Schedule product catalog updates with cloud scheduler

### User events