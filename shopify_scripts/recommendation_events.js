// functions to log user behaviour to GCP recommendations AI
async function logUserEvent(payload) {
  const url = `https://us-central1-recommendations-ai-1234.cloudfunctions.net/logUserEvent`
  console.log(JSON.stringify(payload));
  const response = await fetch(url, { 
    method: 'POST',
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  console.log(data);
//   alert(JSON.stringify(data));
  return data;
}


function getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

async function getCartAsync(){
  const response = await fetch('/cart.js', {method: 'GET'})
  const json = await response.json();
  return json;
}

///////////////////////////////
// required for live experiment
///////////////////////////////
function clickedAddToCart(product_json){
  console.log(`User added product to cart`)
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    var customerId = tracker.get('userId');
    console.log(`client id = ${clientId}`);
    console.log(`customerId = ${customerId}`);
    var attributionToken = getParameterByName('recToken');
    console.log(`attribution token = ${attributionToken}`);
    
    const response = await fetch('/cart.js', {method: 'GET'})
    const json = await response.json();
    const currencyCode = json.currency;
    const items = json.items;
    const cartId = json.token;
    
    var productDetails = [
      {
        id: `${product_json.product_id }`,
        currencyCode: currencyCode,
        originalPrice: product_json.price / 100,
        displayPrice: product_json.price / 100,
        quantity: 1
      }
    ];
    console.log(productDetails);
    
    var user_event = {
      "eventType": "add-to-cart",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail" : {
        "recommendationToken": `${attributionToken}`
//     	"experimentIds": "321"
      },
      "productEventDetail": {
        "cartId" : `${cartId}`,
        "productDetails": productDetails
      }
    }
    logUserEvent(user_event);
  });
};

function detailPageView(product, attributionToken){
  console.log(`User viewed product detail page`);
  
  ga(function(tracker) {
    var clientId = tracker.get('clientId');
    console.log(`client id = ${clientId}`);
    var customerId = tracker.get('userId');
    console.log(`customer id = ${customerId}`);
    var attributionToken = getParameterByName('recToken');
    console.log(`attribution token = ${attributionToken}`);
    var user_event = {
      "eventType" : "detail-page-view",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail" : {
        "recommendationToken": `${attributionToken}`,
//     	"experimentIds": "321"
      },
      "productEventDetail": {
        "productDetails": [
          {
            "id": `${product.id}`,
          }
        ]
      }
    };
    logUserEvent(user_event);
  });
};

function homePageView(product){
  console.log(`User viewed home page`)
  
  ga(function(tracker) {
    var clientId = tracker.get('clientId');
    console.log(`client id = ${clientId}`);
    var customerId = tracker.get('userId');
    console.log(`customer id = ${customerId}`);
    var user_event = {
      "eventType": "home-page-view",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail": {
//         "experimentIds": "321"
      },
    }
    logUserEvent(user_event);
  });
};

// function purchaseComplete(checkout, shop){
//   console.log(`User completed purchase`)
  
//   ga(async function(tracker) {
//     var clientId = tracker.get('clientId');
//     var customerId = tracker.get('userId');
//     console.log(`client id = ${clientId}`);
//     console.log(`customerId = ${customerId}`);
    
//     var user_event = {
//       "eventType": "purchase-complete",
//       "userInfo": {
//         "visitorId": `${clientId}`, // unique across browser sessions
//         "userId": `${customerId}` // unique across device sessions
//       },
//       "eventDetail": {
// //         "experimentIds": "321"
//       },
//       "productEventDetail": {
//         "cartId" : {{ checkout.id }},
//         "productDetails": [],
//         "purchaseTransaction": {
//           	"id": {{ checkout.order_id }},
//             "revenue": {{ checkout.total_price | money_without_currency }},
// //             "taxes": {"state": 3.4, "local": 0.41},
// //             "costs": {"manufacturing": 45.5, "cost": 12.4},
//             "currencyCode": {{ checkout.currency }}
//          }
//       }
//     }
//     logUserEvent(user_event);
//   });
// };

///////////////////////////////////////
// important to improve model over time
///////////////////////////////////////

function checkoutStart(){
  console.log(`User started checkout`)
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    var customerId = tracker.get('userId');
    console.log(`client id = ${clientId}`);
    console.log(`customerId = ${customerId}`);
    
    const response = await fetch('/cart.js', {method: 'GET'})
    console.log(response);
    const json = await response.json();
    const currencyCode = json.currency;
    const items = json.items;
    const cartId = json.token;
    
    var productDetails = [];
    items.forEach(function(item){
      productDetails.push({
        id: `${item.product_id}`,
        currencyCode: currencyCode,
        originalPrice: item.price / 100,
        displayPrice: item.price / 100,
        quantity: item.quantity
      });
    });
    console.log(productDetails);
    
    var user_event = {
      "eventType": "checkout-start",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail" : {
//     	"experimentIds": "321"
      },
      "productEventDetail": {
        "cartId" : `${cartId}`,
        "productDetails": productDetails,
        "purchaseTransaction": {
//             "id": "143",
            "revenue": json.total_price / 100,
  //           "taxes": {"state": 3.4, "local": 0.41},
  //           "costs": {"manufacturing": 45.5, "cost": 12.4},
            "currencyCode": currencyCode
        }
      },
    }
    logUserEvent(user_event);
  });
}

function categoryPageView(collectionTags){
  console.log(`User viewed category page`)
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    var customerId = tracker.get('userId');
    console.log(`client id = ${clientId}`);
    console.log(`customerId = ${customerId}`);
    
    var user_event = {
      "eventType": "category-page-view",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail" : {
//     	"experimentIds": "321"
      },
      "productEventDetail": {
        "pageCategories": [
          {"categories": collectionTags}
        ]
      },
    }
    logUserEvent(user_event);
  });
}

function removedProductDifference(prevCartItems, nextCartItems){
  // an item was removed from cart (all quantities)
  const nextCartItemIds = nextCartItems.map(item => item.id);
  return prevCartItems.filter(item => {
    return nextCartItemIds.indexOf(item.id) < 0;
  });
}

function clickedRemoveFromCart(removeIndex){
  console.log(`User removed product from cart`)
//   console.log(previousCart);
//   console.log(newCart);
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    console.log(`client id = ${clientId}`);
    var customerId = tracker.get('userId');
    console.log(`customer id = ${customerId}`);
    
    const cart = await getCartAsync();
    const currencyCode = cart.currency;
    const cartId = cart.token;
    const removedItems = [cart.items[parseInt(removeIndex)-1]];
    
    const productDetails = [];
    removedItems.forEach(function(item){
      productDetails.push({
        id: `${item.product_id }`,
        currencyCode: currencyCode,
        originalPrice: item.price / 100,
        displayPrice: item.price / 100,
        quantity: item.quantity
      });
    });
    console.log(productDetails);
    
    var user_event = {
      "eventType": "remove-from-cart",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail" : {
//     	"experimentIds": "321"
      },
      "productEventDetail": {
        "cartId" : `${cartId}`,
        "productDetails": productDetails
      }
    }
    logUserEvent(user_event);
  });
}

function cartQuantityChanged(index, quantity){
  console.log(`User change quantity in cart`)
//   console.log(previousCart);
//   console.log(newCart);
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    console.log(`client id = ${clientId}`);
    var customerId = tracker.get('userId');
    console.log(`customer id = ${customerId}`);
    
    const cart = await getCartAsync();
    const currencyCode = cart.currency;
    const cartId = cart.token;
    const changedItems = [cart.items[parseInt(index)-1]];
    const oldItemQuantity = changedItems[0].quantity;
    var eventName;
    if (oldItemQuantity < quantity){
    	eventName = "add-to-cart";
    } else {
    	eventName = "remove-from-cart";
    }
    const productDetails = [];
    changedItems.forEach(function(item){
      productDetails.push({
        id: `${item.product_id }`,
        currencyCode: currencyCode,
        originalPrice: item.price / 100,
        displayPrice: item.price / 100,
        quantity: 1
      });
    });
    console.log(productDetails);
    
    var user_event = {
      "eventType": eventName,
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail" : {
//     	"experimentIds": "321"
      },
      "productEventDetail": {
        "cartId" : `${cartId}`,
        "productDetails": productDetails
      }
    }
    logUserEvent(user_event);
  });
}

function search(query){
  console.log(`User searched`)
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    console.log(`client id = ${clientId}`);
    var customerId = tracker.get('userId');
    console.log(`customer id = ${customerId}`);

    var user_event = {
      "eventType": "search",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
        },
      "eventDetail": {
//         "experimentIds": "321"
      },
      "productEventDetail": {
        "searchQuery": query
      }
    }
    logUserEvent(user_event);
  });
}

function shoppingCartPageView(){
  console.log(`User viewed shopping cart page`)
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    console.log(`client id = ${clientId}`);
    var customerId = tracker.get('userId');
    console.log(`customer id = ${customerId}`);
    
    const response = await fetch('/cart.js', {method: 'GET'})
    const json = await response.json();
    const currencyCode = json.currency;
    const items = json.items;
    const cartId = json.token;
    
    var productDetails = [];
    items.forEach(function(item){
      productDetails.push({
        id: `${item.product_id}`,
        currencyCode: currencyCode,
        originalPrice: item.price / 100,
        displayPrice: item.price / 100,
        quantity: item.quantity
      });
    });
    console.log(productDetails);
    
    var user_event = {
      "eventType": "shopping-cart-page-view",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail" : {
//     	"experimentIds": "321"
      },
      "productEventDetail": {
        "cartId" : `${cartId}`,
        "productDetails": productDetails
      }
    }
    logUserEvent(user_event);
  });
}

///////////////
// nice to have
///////////////

function pageVisit(){
  console.log(`User visited page`)
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    console.log(`client id = ${clientId}`);
    var customerId = tracker.get('userId');
    console.log(`customer id = ${customerId}`);
    
    var user_event = {
      "eventType": "page-visit",
      "userInfo": {
        "visitorId": `${clientId}`, // unique across browser sessions
        "userId": `${customerId}` // unique across device sessions
      },
      "eventDetail": {
//         "experimentIds": "321"
      },
      "productEventDetail": {
//         "productDetails": [{
//           "id": "123"
//         }]
      }
    }
    logUserEvent(user_event);
  });
}

function refund(){
  console.log(`User processed refund`)
}

function removeFromList(){
  console.log(`User removed from list`)
}

function addToList(){
  console.log(`User added product to list`)
}

console.log('loaded recommendations AI events functions');
