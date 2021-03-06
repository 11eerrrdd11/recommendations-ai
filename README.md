# Shopify Recommendations Ai

## Client setup

- Create a private app for your shopify store
- Set up Google Cloud Platform
    - Sign up for GCP
    - Add a billing account
    - Create a new project
    - Link your billing account to the project
    - Add contractor to project with the following roles
        - Editor
        - Recommendations Ai Admin
- Create an optimizely account and add ojapringe@gmail.com as developer

## Deploy recommendations Ai backend

- Install Google Cloud Platform CLI and authenticate
- Select GCP project

```bash
    export PROJECT_ID=<YOUR PROJECT ID>
    gcloud config set project ${PROJECT_ID}
```

- Enable the recommendations & retail APIs

```bash
    gcloud services enable recommendationengine.googleapis.com
    gcloud services enable retail.googleapis.com
```

- Initialize the firebase project. Make sure to select GCP project and enable only required resources. The only file that shoudl change is `.firebaserc`.

```bash
    firebase init
```

- On the recs AI dashboard in GCP
    - create an unregistered API key to log user events

- Set environment variables

```bash
export RECS_EVENT_KEY=<your recs event key>
export SHOPIFY_URL=<your website homepage>
export SHOPIFY_SHOP_NAME=<your shop name>
export SHOPIFY_API_KEY=<your private app api key>
export SHOPIFY_APP_PASSWORD=<your private app password>
export SHOPIFY_CURRENCY_CODE=<currency code for products in shopify admin console>
export SHOPIFY_WEBHOOK_SECRET=<from settings > notifications > webhooks>
export OPTIMIZELY_SDK_KEY=<your optimizely production sdk key>
```

- Configure firebase

```bash
firebase functions:config:set shopify.webhook_secret=${SHOPIFY_WEBHOOK_SECRET} shopify.currency_code=${SHOPIFY_CURRENCY_CODE} shopify.url=${SHOPIFY_URL} shopify.shop_name=${SHOPIFY_SHOP_NAME} shopify.api_key=${SHOPIFY_API_KEY} shopify.password=${SHOPIFY_APP_PASSWORD} recs.event_key=${RECS_EVENT_KEY} optimizely.sdk_key=${OPTIMIZELY_SDK_KEY}

firebase functions:config:get > ./functions/.runtimeconfig.json
```

- Deploy cloud functions for shopify catalog syncing, event logging and predictions requests

```bash
firebase deploy --only functions
```

- Trigger your first catalog update (gcp > cloud scheduler > run)
- Add webhooks (shopify > settings > notifications > webhooks) for cart creation, cart update and order payment

## Phase 1 - record user events on your shopify storefront

- Go to store > themes > edit theme code
- Paste the following code directly under the <head> tag in your theme.liquid file

```html
<!-- START PERSONALIZATION CLIENT ID TRACKING -->
<script>
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', '<GOOGLE ANALYTICS ID>', 'auto');
ga('set', 'userId', '{{customer.id}}');
</script>
<!-- END PERSONALIZATION CLIENT ID TRACKING -->

<!-- START PERSONALIZATION AB TESTING -->
<script src="https://unpkg.com/@optimizely/optimizely-sdk@3.5/dist/optimizely.browser.umd.min.js"></script>
<script src="https://cdn.optimizely.com/datafiles/UxFYZqB5NpjGBo6f84uCE.json/tag.js"></script>
<script>
var optimizelyClientInstance = optimizelySdk.createInstance({
    datafile: window.optimizelyDatafile,
});
</script>
<script>window.moneyFormat = {{ shop.money_format | json }};</script>
<!-- END PERSONALIZATION AB TESTING -->
```

- Add `./shopify_scripts/recommendation_events.js` & `./shopify_scripts/recommendation_requests.js` to the `assets` directory of your theme
- Update cloud function urls in javascript files to match your deployed functions
- Load the new javascript assets in your `theme.liquid` file under `<script src="{{ 'theme.js' | asset_url }}" defer="defer"></script>`

```html
<script src="{{ 'recommendations_events.js' | asset_url }}" onload="pageVisit()"></script>
<script src="{{ 'recommendations_requests.js' | asset_url }}"></script>
```
- Log the following user events from your theme code

- [x] detail-page-view (product.liquid)
- [x] home-page-view (index.liquid)
- [x] checkout-start (`onClick` to checkout button)
- [x] category-page-view (collection.liquid)
- [x] search (search.liquid)
- [x] shopping-cart-page-view (cart.liquid and delayed onclick if dynamic drawer)

## Phase 2 - serve recommendations in the customer journey

- Train a model when you have collected enough data
- Add html to your theme to render recommendations
- Use functions in `recommendation_requests.js` to load recommendations

## ToDo

Hypotheses:

Using new product carousels does not change revenue per session
Using new product carousels does not change PDP page views
Using GCP recs over shopifies increases revenue per session
Using GCP recs over shopifies increases PDP page views
Adding recs to home page increases revenue per session
Adding recs to home page increases PDP page views


- [ ] fix image bottom getting chopped off when image aspect ratio different
- [ ] Hexxee phase 2
    - [x] Ability to populate *you may also like* with shopify recs or GCP
    - [x] Ability to add recommended for you to homepage
    - [x] OK new carousels with Hexxee team
    - [ ] Train *recommended for you*
    - [ ] run AB test to compare adding *recommended for you* to home page (make sure to use production optimizely keys)
    - [x] Train *others you may like*
    - [ ] run AB test to compare carousels
    - [ ] run AB test to compare *you may also like* backends
    - [ ] run AB test to compare *recently viewed* backends
    - [ ] Train *shopping cart model*
    - [ ] run AB test to compare adding shopping cart expansion
- [ ] Display recommendations
    - [x] mobile layout and controls
    - [x] desktop layout and controls
    - [ ] fix delay in rendering currency in correct format
    - [ ] load minimum required cdn code and minify javascript assets
- [ ] Start AB test with client
    - [x] Add optimizely to theme
    - [x] Save experimentId when logging all user events (front/backend)
    - [x] Toggle recommendations based on optimizely variation
    - [x] Track % change to revenue per visitor for with/without recommendations
- [ ] Sync catalog
    - [x] Schedule product catalog updates with cloud function
    - [x] Add required catalog fields
    - [x] Add optional catalog fields
    - [x] Add all possible custom product features
    - [ ] Add category hierarchies based on shopify collections
- [ ] Serve recommendations
    - [x] Retrieve recently viewed recommendations via post request
    - [x] Retrieve recently viewed recommendations json response on shopify site
    - [x] Hide API key from browsers with restricted cloud function
    - [x] Render recommendations in theme from response
    - [ ] In a separate HTML file, render recommendations identically to Hexxee page
    - [ ] Render recs on shopify site professionally
- [ ] Record user events
    - [x] Trigger required events in shopify theme code
        - [x] detail-page-view (product.liquid)
        - [x] added-to-cart (webhook)
        - [x] home-page-view (index.liquid)
        - [x] purchase-complete (webhook)
    - [x] Trigger encouraged events in shopify theme code
        - [x] checkout-start (`onClick` to checkout button)
        - [x] category-page-view (collection.liquid)
        - [x] removed-from-cart (webhook)
        - [x] search (search.liquid)
        - [x] shopping-cart-page-view (cart.liquid)
    - [ ] Trigger nice-to-have events in shopify theme code
        - [x] page-visit (onload method of js script loader)
        - [ ] refund (`refunds/create` webhook)
        - [ ] add-to-list (not available for Hexxee)
        - [ ] remove-from-list (not available for Hexxee)
    - [x] Complete required event payloads
        - [x] detail-page-view
        - [x] added-to-cart
        - [x] home-page-view
        - [x] purchase-complete
    - [x] Complete encouraged event payloads
        - [x] checkout-start
        - [x] category-page-view
        - [x] remove-from-cart
        - [x] search
        - [x] shopping-cart-page-view ()
    - [ ] Complete nice-to-have event payloads
        - [ ] page-visit (requires all products on the visited page)
        - [ ] refund (webhook can trigger)
        - [x] add-to-list (not available for Hexxee)
        - [x] remove-from-list (not available for Hexxee)
    - [x] Hide API key from browsers with restricted cloud function
- [ ] Minimum public application requirements
    - [ ] When app installed, add client info to firestore
    - [ ] Move all client-side tracking code out of liquid files and into javascript functions
    - [ ] Track events with webhooks and client-side javascript function calls
    - [ ] Load tracking code and javascript functions with script tags
    - [ ] Render recommendations with script tags
- [ ] Update front and backend to use retail API v2
    - [ ] update logUserEventAsync to new endpoint
    - [ ] remove unused user events from front/backend
    - [ ] update all user event payloads to new format with all info
    - [ ] update catalog syncing code to use new api

## Comparison

|       | Ollie | Certona | Shopify |
|-------|-------|---------|
| Setup | non-technical DIY in <10 mins | Contact team for custom integration | no setup |
| Price | $X per recommendations request (eg $150/month @ 60,000 sessions/month) | $10000's/month | free |
| Max products | unlimited | unlimited | 5000 |
| Types of recs | home, pdp, cart, recently viewed | home, pdp, cart, recently viewed| pdp, recently viewed |
| Custom user & product features | yes | yes | no |

## Thoughts

- Clients are bad at even simple tasks like setting up a GCP account with billing
- Clients don't understand that *recommended for you* doesn't appear unless that user has a browsing history
- Clients don't understand they can just AB test to safely roll out
- GCP model training requires significant data. To get up and running fast I need to import the customer's existing data. The obvious data formats are facebook, google and shopify analytics. The problem is for each event I need to join it with other sources and match these back to the user Ids I'm tracking with my own analytics code.