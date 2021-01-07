const admin = require('firebase-admin');
const functions = require('firebase-functions');
const fetch = require("node-fetch");
const cors = require('cors')({origin: functions.config().shopify.url});
const Shopify = require('shopify-api-node');
const { htmlToText } = require('html-to-text');
const PROJECT_ID = process.env.GCLOUD_PROJECT;

admin.initializeApp(functions.config().firebase);

// Log events when the cart items change
exports.cartUpdated = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            const updatedCart = request.body;
            const cartId = updatedCart.id;
            functions.logger.log(`Cart ${cartId} updated`);

            // retrieve the record for this cart & it's clientId/userId
            const docRef = admin.firestore().collection('carts').doc(cartId)
            const cartDoc = await docRef.get();
            if (!cartDoc.exists) {
                functions.logger.log(`Previous cart document not found in firestore`);
                return
            } 
            const cartData = cartDoc.data();
            const clientId = cartData.clientId;
            const userId = cartData.userId;

            // retrieve the previous cart object from firestore
            const previousCart = cartData.previousCart;
            functions.logger.log(`Previous cart json payload: ${JSON.stringify(previousCart)}`);
            functions.logger.log(`New cart json payload: ${JSON.stringify(updatedCart)}`);

            // TODO: compare the two cart objects
            if ( typeof previousCart !== 'undefined' && previousCart ){
                functions.logger.log(`previous cart found`);
                // find difference between carts

                // const productDifference = _compareCarts(previousCart, updatedCart)

                // log events
                const updateTimestamp = updatedCart.updated_at;
            } else{
                functions.logger.log(`no previous cart found`);

                // the cart was just created
                const addedItems = updatedCart.line_items;
                const productDetails = _parseLineItems(addedItems)
                console.log(JSON.stringify(productDetails));
                // const userEvent = {

                // }
            }
            // await logUserEventAsync(userEvent);

            // update cart object in firestore
            const updatedCartData = {
                clientId: clientId,
                userId: userId,
                previousCart: updatedCart,
            }
            await docRef.set(updatedCartData, { merge: true });
            response.status(200).send({'message': 'successfully completed cartUpdate function'})
        }
        catch(error){
            console.log(error)
            response.status(500).send(error)
            return
        }
    })
});

const _parseLineItems = function(lineItems) {
    return lineItems.map((item) => {
        return {
            id: `${item.product_id }`,
            currencyCode: item.price_set.presentment_money.currency_code,
            originalPrice: item.price,
            displayPrice: item.price,
            quantity: item.quantity
        };
    });
}

// Save which cart belongs to which user for use in cartUpdated webhook
exports.saveCart = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            const { clientId, userId, cartId } = request.body;
            const docRef = admin.firestore().collection('carts').doc(cartId);
            await docRef.set({
                'clientId': clientId,
                'userId': userId
            }, { merge: true });
            response.status(200).send({});
            return
        }
        catch(error){
            console.log(error)
            response.status(500).send(error)
            return
        }
    })
});


exports.getRecommendations = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            functions.logger.log(`User requested recs`);
            const { payload, placement } = request.body;
            const apiKey = functions.config().recs.predict_key;
            const url = `https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/placements/${placement}:predict?key=${apiKey}`;
            functions.logger.log(`Requesting predictions from ${url}`);
    
            const result = await fetch(url, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const status = result.status;
            functions.logger.log(`Call to recs API returned status ${status}`);
            response.status(status)
            const data = await result.json()
            response.send(data)
            return
        }
        catch(error){
            console.log(error)
            response.status(500).send(error)
            return
        }
    })
});

exports.logUserEvent = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            functions.logger.log(`Logging user event`);
            const event = request.body;
            functions.logger.log(`event ${JSON.stringify(event)}`);
            const apiKey = functions.config().recs.event_key;
            const url = `https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/userEvents:write?key=${apiKey}`
            functions.logger.log(`Requesting predictions from ${url}`);
    
            const result = await fetch(url, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
            const status = result.status;
            functions.logger.log(`Call to recs API returned status ${status}`);
            response.status(status)
            const data = await result.json()
            response.send(data)
            return
        }
        catch(error){
            console.log(error)
            response.status(500).send(error)
            return
        }
    })
});

getAccessTokenAsync = async () => {
    const scopes = "https://www.googleapis.com/auth/cloud-platform"
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=${scopes}`
    const result = await fetch(url, {
        headers: {
            "Metadata-Flavor": "Google"
        },
    });
    const status = result.status;
    functions.logger.log(`Call to get token has status ${status}`);
    const data = await result.json()
    functions.logger.log(`Call to get token has data ${JSON.stringify(data)}`);
    const accessToken = data.access_token;
    return accessToken;
}

exports.updateProductCatalog = functions.pubsub.schedule('every 15 minutes').onRun(async (context) => {
    try {
        functions.logger.log(`Updating product catalog`);

        // download product data from Shopify Admin
        const shopify = new Shopify({
            shopName: functions.config().shopify.shop_name,
            apiKey: functions.config().shopify.api_key,
            password: functions.config().shopify.password,
        });
        shopify.on('callLimits', (limits) => functions.logger.log(limits));

        const products = await shopify.product.list();
        functions.logger.log(`${products.length} products returned from shopify admin API:\n${JSON.stringify(products)}`)
        
        // TODO: generate category hierarchies based on shopify collections
        
        // parse data into format required by recommendations Ai
        const processedProducts = products.map((product) => {
            var tags = product.tags;
            if (tags.length === 0){
                tags = [];
            } else {
                tags = tags.split(',')
            }

            _getStockState = (variant) => {
                if (variant.inventory_quantity > 0){
                    return 'IN_STOCK';
                } else {
                    return 'OUT_OF_STOCK';
                }
            }

            // TODO: add categories from product if it is part of a collection
            _getCategoryHierarchies = (product) => {
                return [
                    { "categories": [ "catalog" ]  },
                    // { "categories": [ "home", "shirts" ]  } 
                ];
            }

            // see https://cloud.google.com/recommendations-ai/docs/reference/rest/v1beta1/projects.locations.catalogs.catalogItems#CatalogItem
            return {
                "id": `${product.id}`,
                "category_hierarchies": _getCategoryHierarchies(product),
                "title": product.title,
                "description": htmlToText(product.body_html, { wordwrap: false}),
                "language_code": functions.config().shopify.language_code,
                "tags": tags,
                "item_attributes": {
                    "categoricalFeatures": { 
                        "position": {"value": product.variants.map(v => `${v.position}`)}, 
                        "inventory_policy": {"value": product.variants.map(v => v.inventory_policy)}, 
                        "fulfillment_service": {"value": product.variants.map(v => v.fulfillment_service)}, 
                        "inventory_management": {"value": product.variants.map(v => v.inventory_management)}, 
                        "taxable": {"value": product.variants.map(v => `${v.taxable}`)},
                        "requires_shipping": {"value": product.variants.map(v => `${v.requires_shipping}`)}
                    },
                    "numericalFeatures": { 
                        "grams": {"value": product.variants.map(v => v.grams)},
                    }
                },
                "product_metadata": {
                    // TODO: determine stock state from product
                    "stock_state": _getStockState(product.variants[0]), // https://cloud.google.com/recommendations-ai/docs/reference/rest/v1beta1/StockState
                    "available_quantity": `${product.variants[0].inventory_quantity}`,
                    "exact_price": {
                        "display_price": product.variants[0].price,
                        "original_price": product.variants[0].price,
                    },
                    // "price_range": {
                    //     // "min": number,
                    //     // "max": number
                    // },
                    "costs": {
                        // "manufacturing": 35.99,
                        // "other": 20
                    },
                    "currency_code": functions.config().shopify.currency_code,
                    // "canonical_product_uri": "https://www.example.com/products/1234",
                    "images": product.images.map((image) => {
                        return {
                            "uri": image.src, 
                            "height": `${image.height}`, 
                            "width": `${image.width}`, 
                        }
                    })
                }
            };
        });
        functions.logger.log(`Products for import: ${JSON.stringify(processedProducts)}`)

        // import to recommendations Ai
        var accessToken = functions.config().gcp.default_access_token;
        try {
            accessToken = await getAccessTokenAsync();
        } catch(e){
            functions.logger.log(`Failed to retrieve accessToken: ${e}`)
        } 
        const payload = {
            "inputConfig": {
                "catalogInlineSource": {
                    "catalogItems": processedProducts
                }
            }
        };
        console.log(JSON.stringify(payload))
        const url = `https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/catalogItems:import`
        const headers = { 
            'Content-Type': 'application/json',  
            'Authorization': `Bearer ${accessToken}`
        };
        console.log(JSON.stringify(headers))
        const result = await fetch(url, { 
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        const status = result.status;
        functions.logger.log(`Call to recs catalog import API returned status ${status}`);
        const data = await result.json()
        functions.logger.log(`Data from recs catalog import API ${JSON.stringify(data)}`);
        return
    } 
    catch(error){
        functions.logger.log(error)
        return
    }
});
