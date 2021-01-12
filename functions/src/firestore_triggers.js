const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logUserEventAsync, getUserFromCartAsync, parseLineItems } =  require("./helpers");


exports.logCartEvents = functions.firestore.document("carts/{cartId}").onWrite(async (change, context) => {
    try {
        const cartId = context.params.cartId;
        if (!change.after.exists) {
            functions.logger.log(`Cart ${cartId} deleted`);
            return;
        } else {
            const newCart = change.after.data();
            var eventName;
            var productDetails;
            var clientId;
            var userId;
            var userEvent;
            var deletePromise;
    
            if (!change.before.exists) {
                functions.logger.log(`Cart ${cartId} created`);
                
                productDetails = parseLineItems(newCart.line_items);
                if (productDetails.length < 1){
                    functions.logger.log(`Created cart has no items.`);
                    return
                }

                [clientId, userId] = await getUserFromCartAsync(cartId);
                deletePromise = _deletePreviousCartsAsync(cartId, clientId);
                userEvent = {
                    "userInfo": {
                        "visitorId": `${clientId}`, // unique across browser sessions
                        "userId": `${userId}` // unique across device sessions
                    },
                    "eventDetail" : {
                //     	"experimentIds": "321"
                    }
                }
                eventName = "add-to-cart";
                Object.assign(
                    userEvent,
                    {
                        "eventType": eventName,
                        "productEventDetail": {
                            "cartId" : `${cartId}`,
                            "productDetails": productDetails
                        },
                        "eventTime": newCart.created_at,
                    }
                );
            } else {
                functions.logger.log(`Cart ${cartId} updated`); 

                const previousCart = change.before.data();
                [eventName, productDetails] = _compareCarts(previousCart, newCart);
                if (productDetails.length < 1){
                    functions.logger.log(`Updated cart has no variant changes.`);
                    return
                }

                [clientId, userId] = await getUserFromCartAsync(cartId);
                deletePromise = _deletePreviousCartsAsync(cartId, clientId);
                userEvent = {
                    "userInfo": {
                        "visitorId": `${clientId}`, // unique across browser sessions
                        "userId": `${userId}` // unique across device sessions
                    },
                    "eventDetail" : {
                //     	"experimentIds": "321"
                    }
                }   
                Object.assign(
                    userEvent,
                    {
                        "eventType": eventName,
                        "productEventDetail": {
                            "cartId" : `${cartId}`,
                            "productDetails": productDetails
                        },
                        "eventTime": newCart.updated_at,
                    }
                );
            }
            await Promise.all([logUserEventAsync(userEvent), deletePromise]);
            return;
        }
    } catch (e){
        console.log(e)
    }
});

const _compareCarts = function(previousCart, nextCart){
    // returns productDetails denoting what changed in the cart 
    previousItems = previousCart.line_items;
    nextItems = nextCart.line_items;
    functions.logger.log(`Previous lines: ${JSON.stringify(previousItems.map(i => {return {product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity}}))}`);
    functions.logger.log(`New lines: ${JSON.stringify(nextItems.map(i => {return {product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity}}))}`);

    var eventName = null;
    var productDetails = [];

    if (previousItems.length === 0 && nextItems.length > 0){
        // an item was added to cart
        // functions.logger.log(`Items added to empty cart`);
        eventName = "add-to-cart";
        productDetails = parseLineItems(nextItems);
        return [eventName, productDetails];
    }

    previousItems.every(currentItem => {
        // functions.logger.log(`Checking if line with variant ${currentItem.id} changed in new cart.`);
        
        // A line_item represents a single line in the shopping cart. There is one line item for each distinct product variant in the cart.
        // https://shopify.dev/docs/themes/liquid/reference/objects/line_item
        const matchingLines = nextItems.filter(item => {
            return item.id === currentItem.id;
        });
        if (matchingLines.length < 1){
            // functions.logger.log(`Line does not exist in new cart`);
            eventName = "remove-from-cart";
            productDetails = [{
                id: `${currentItem.product_id }`,
                currencyCode: currentItem.price_set.presentment_money.currency_code,
                originalPrice: currentItem.price,
                displayPrice: currentItem.price,
                quantity: currentItem.quantity
            }];
            return false; // breaks out of loop
        } else {
            // functions.logger.log(`Matching line found`);
            var matchingLine = matchingLines[0];
            if (matchingLine.quantity !== currentItem.quantity){
                // functions.logger.log(`Line quantity changed`);
                var quantityChange = matchingLine.quantity - currentItem.quantity;
                if (quantityChange > 0){
                    eventName = "add-to-cart";
                    productDetails = [{
                        id: `${matchingLine.product_id }`,
                        currencyCode: matchingLine.price_set.presentment_money.currency_code,
                        originalPrice: matchingLine.price,
                        displayPrice: matchingLine.price,
                        quantity: quantityChange
                    }];
                    return false; // breaks out of loop
                } else {
                    eventName = "remove-from-cart";
                    productDetails = [{
                        id: `${matchingLine.product_id }`,
                        currencyCode: matchingLine.price_set.presentment_money.currency_code,
                        originalPrice: matchingLine.price,
                        displayPrice: matchingLine.price,
                        quantity: -quantityChange
                    }];
                    return false; // breaks out of loop
                }
            } else {
                // functions.logger.log(`Line did not change quantity. Continuing to next item.`);
                return true;
            }
        }
    });

    return [eventName, productDetails];
}

const _deletePreviousCartsAsync = async (cartId, clientId) => {
    functions.logger.log(`Attempting to delete previous carts for client ${clientId}`)

    // get a list of the user's carts from the client document
    const docRef = admin.firestore().collection('clients').doc(clientId);
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new Error(`Client document not in firestore`);
    } else {
        // delete their previous carts
        const cartIds = doc.data().cartIds; // array of string
        functions.logger.log(`Client ${clientId} has carts ${JSON.stringify(cartIds)}`);
        const deletePromises = [];
        const collectionRef = admin.firestore().collection('carts');
        cartIds.forEach(id => {
            if (id !== cartId){
                deletePromises.push(collectionRef.doc(id).delete());
            }
        });
        functions.logger.log(`Deleting ${deletePromises.length} previous carts`)

        await Promise.all([
            ...deletePromises
        ]);
    }
};
