# Shopify Recommendations Ai

## Prerequisites

- Install Google Cloud Platform CLI and authenticate
- Create a private app for your shopify store
- Create a new GCP project and add billing
- Select project

```bash
    export PROJECT_ID=<YOUR PROJECT ID>
    gcloud config set project ${PROJECT_ID}
```

- Select the project
- Enable the recommendations api

```bash
    gcloud services enable recommendationengine.googleapis.com
```


- Add the project to firebase

```bash
    firebase use --add

    firebase use <your alias>
```

- On the recs AI dashboard
    - create an unregistered API key to log user events
    - create a registered API key to request predictions

- Set environment variables

```bash
export RECS_EVENT_KEY=<your recs event key>
export RECS_PREDICT_KEY=<your predict key>
export SHOPIFY_URL=<your website homepage>
export SHOPIFY_SHOP_NAME=<your shop name>
export SHOPIFY_API_KEY=<your private app api key>
export SHOPIFY_APP_PASSWORD=<your private app password>
export SHOPIFY_CURRENCY_CODE=<currency code for products in shopify admin console>
export SHOPIFY_WEBHOOK_SECRET=<from settings > notifications > webhooks>

firebase functions:config:set shopify.webhook_secret=${SHOPIFY_WEBHOOK_SECRET} shopify.url=${SHOPIFY_URL} shopify.shop_name=${SHOPIFY_SHOP_NAME} shopify.api_key=${SHOPIFY_API_KEY} shopify.password=${SHOPIFY_APP_PASSWORD} recs.event_key=${RECS_EVENT_KEY} recs.predict_key=${RECS_PREDICT_KEY}

firebase functions:config:get > ./functions/.runtimeconfig.json
```

- Deploy cloud functions for shopify catalog syncing, event logging and predictions requests

```bash
firebase deploy --only functions
```

- Add webhooks in shopify > settings > notifications

## Record user events on your shopify storefront

- Go to store > themes > edit theme code
- Paste our google analytics tracking code directly under the <head> tag in your theme.liquid file

```html
<!-- Google Analytics & uid tracking -->
<script>
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', '<GOOGLE ANALYTICS ID>', 'auto');
ga('set', 'userId', '{{customer.id}}'); // Set the user ID using signed-in user_id.
</script>
```

- Add `./shopify_scripts/recommendation_events.js` & `./shopify_scripts/recommendation_requests.js` to the `assets` directory in your theme
- Load the new javascript assets in your `theme.liquid` file under `<script src="{{ 'theme.js' | asset_url }}" defer="defer"></script>`

```html
<script src="{{ 'recommendations_events.js' | asset_url }}" onload="pageVisit()"></script>
<script src="{{ 'recommendations_requests.js' | asset_url }}"></script>
```
- Log all kinds of user events in your theme code (see ToDo section below)
- Deploy event logging code and wait 1 week to record data
- Create models in recommendations Ai dashboard

## Serve recommendations to your users

- Have a front end developer add code to your theme to request and serve recommendations in the customer journey

## ToDo

On user cart creation:

1) Save the (cartId, clientId, userId) relationship to a firestore document
2) cartCreated webhook payload sent, which updates the cart document in firestore and deletes any old carts for that user.
3) firestore triggers attempt to retrieve the clientId and log events based on cart changes

The order of events 1 and 2 is not gauranteed. The front end request to add the clientId could complete before or after the backend trigger to save cart data.  1 must complete before 3. Or 3 must wait for 1.

That's fine. So long as both events trigger on cart creation and the clientId is added to the cart before that user completes payment. After this, the next add to cart event creates a new cart on the backend, repeating the process.

Then when a new cart is created, old carts are queried in firestore by their clientId and deleted.



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
- [ ] Start AB test
    - [ ] Add feature flags to turn recs on or off for shopify site
- [ ] Hexxee private application requirements
    - [x] Secure webhook calls
    - [x] Save reltionship between clientId and cartId to backend
    - [x] Log addToCart & removedFromCart from cloud functions
    - [x] Log purchases from checkout
    - [ ] Log remaining user events in theme
    - [ ] Train models after 7 days of data
    - [ ] Render recommendations in theme
- [ ] Minimum public application requirements
    - [ ] When app installed, add client info to firestore
    - [x] Save clientId and customerId with cartId to my backend
    - [ ] Save clientId and customerId with checkoutId to my backend
    - [x] Track cart in firestore & log events
    - [ ] Track purchases with webhook
    - [ ] Move all client-side tracking code out of liquid files and into javascript functions
    - [ ] Track events with webhooks and client-side javascript function calls
    - [ ] Load tracking code and javascript functions with script tags
    - [ ] Render recommendations with script tags

## Comparison

|       | Ollie | Certona | Shopify |
|-------|-------|---------|
| Setup | non-technical DIY in <10 mins | Contact team for custom integration | no setup |
| Price | $X per recommendations request (eg $150/month @ 60,000 sessions/month) | $10000's/month | free |
| Max products | unlimited | unlimited | 5000 |
| Types of recs | home, pdp, cart, recently viewed | home, pdp, cart, recently viewed| pdp, recently viewed |
| Custom user & product features | yes | yes | no |

## Integration

- Clients are bad at even simple tasks like setting up billing for GCP. I should transfer pre setup accounts to them rather than
