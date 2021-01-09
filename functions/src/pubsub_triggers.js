const functions = require('firebase-functions');
const fetch = require("node-fetch");
const Shopify = require('shopify-api-node');
const { htmlToText } = require('html-to-text');
const PROJECT_ID = process.env.GCLOUD_PROJECT;


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
    if (accessToken === null){
        throw new Error(`Failed to retrieve access token`);
    }
    return accessToken;
}

const _getShopifyProductsAsync = async (shopify) => {
    let products = [];
    let params = { limit: 250 };
    /* eslint-disable no-await-in-loop */
    do {
        var productBatch = await shopify.product.list(params);
        products.push(...productBatch)
        params = productBatch.nextPageParameters;
    } 
    while (params !== undefined);
    /* eslint-enable no-await-in-loop */
    functions.logger.log(`${products.length} products returned from Shopify API`);
    return products;  
}

const _parseShopifyProduct = (product) => {
    _getTags = (product) => {
        var tags = product.tags;
        if (tags.length === 0){
            tags = [];
        } else {
            tags = tags.split(',')
        }
        return tags;
    }
    

    _getStockState = (product) => {
        const noVariantInStock = product.variants.every(variant => {
            if (variant.inventory_quantity < 0 && variant.inventory_management === 'shopify'){
                return true;
            } else {
                return false;
            }
        });
        if (noVariantInStock){
            return 'OUT_OF_STOCK';
        }
        return 'IN_STOCK';
    }

    _getAvailableQuantity = (variant) => {
        const shopify_quantity = variant.inventory_quantity;
        if (shopify_quantity >= 0){
            return `${shopify_quantity}`;
        } else {
            return `${0}`;
        }
    }

    // TODO: add categories from product if it is part of a collection
    _getCategoryHierarchies = (product) => {
        return [
            { "categories": [ "catalog" ]  },
            // { "categories": [ "home", "shirts" ]  } 
        ];
    }

    _getPrice = (product) => {
        const shopifyPrice = product.variants[0].price;
        if (shopifyPrice >= 1e+08){
            throw new Error(`Product price too large`);
        } else {
            return shopifyPrice;
        }
    }

    // see https://cloud.google.com/recommendations-ai/docs/reference/rest/v1beta1/projects.locations.catalogs.catalogItems#CatalogItem
    return {
        "id": `${product.id}`,
        "category_hierarchies": _getCategoryHierarchies(product),
        "title": product.title,
        "description": htmlToText(product.body_html, { wordwrap: false}),
        "language_code": functions.config().shopify.language_code,
        "tags": _getTags(product),
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
            "stock_state": _getStockState(product), // https://cloud.google.com/recommendations-ai/docs/reference/rest/v1beta1/StockState
            "available_quantity": _getAvailableQuantity(product.variants[0]),
            "exact_price": {
                "display_price": _getPrice(product),
                "original_price": _getPrice(product),
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

        const products = await _getShopifyProductsAsync(shopify);
        
        // TODO: generate category hierarchies based on shopify collections
        
        // parse data into format required by recommendations Ai
        var processedProducts = products.map((product, index) => {
            if (product.title === 'Candy Floss Camo'){
                // this product should two orderable items and 2 out of stock items
                functions.logger.log(JSON.stringify(product))
            }
            try {
                return _parseShopifyProduct(product);    
            } catch (e){
                functions.logger.error(e);
                return;
            }
        });
        processedProducts = processedProducts.filter((p) => p !== null);
        functions.logger.log(`Products for import: ${JSON.stringify(processedProducts)}`)

        // import to recommendations Ai
        const accessToken = await getAccessTokenAsync();
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
        functions.logger.error(error);
        return
    }
});
