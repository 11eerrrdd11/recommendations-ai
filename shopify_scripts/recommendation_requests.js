console.log('loaded recommendations AI requests functions');

async function requestRecommendationsAsync(payload) {
  const placement = 'recently_viewed_default';
  const url = `https://us-central1-recommendations-ai-1234.cloudfunctions.net/getRecommendations`
  const completePayload = {
    placement: placement,
    payload: payload,
  }
  console.log(JSON.stringify(completePayload));
  const response = await fetch(url, { 
    method: 'POST',
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(completePayload)
  });
  const data = await response.json();
  return data;
}

function getRecentlyViewedProducts(customerId, product){
  console.log(`User requested most recently viewed products`);
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    var filterString = "";
   	var dryRun = true;
    var contextEventType = "detail-page-view";
    
    console.log(`customer id = ${customerId}`);
    console.log(`client id = ${clientId}`);
    
    var payload = {
//       "filter": filterString,
      "dryRun": dryRun,
      "userEvent": {
        "eventType": `${contextEventType}`,
        "userInfo": {
          "visitorId": `${clientId}`, // unique across browser sessions
//           "userId": `${customerId}`, // unique across device sessions
//           "ipAddress": "ip-address",
//           "userAgent": "user-agent"
        },
        "eventDetail": {
//           "experimentIds": "experiment-group"
        },
        "productEventDetail": {
          "productDetails": [
            {
              "id": `${product.id}`,
            }
          ]
        }
      }
    }
    
   	var result = await requestRecommendationsAsync(payload);
    console.log(result);
    var recommendationToken = result.recommendationToken;
    var productIds = result.results.slice(1, 3); // TODO
    console.log(recommendationToken);
    console.log(productIds);
    var recentlyViewed = document.querySelector(".recently-viewed-recommendations");
    var newInnerHTMLPromises = productIds.map(function(product) { 
        return renderProductAsync(product.id, recommendationToken);
    })
    var listItems = (await Promise.all(newInnerHTMLPromises)).join(" ");
    recentlyViewed.innerHTML = `<ul>${listItems}</ul>`   
  });
}

async function renderProductAsync(productId, recommendationToken){
  // returns HTML to render a product
  
  // TODO: retrieve the storefront product object given the productId
  // I do not want to do this asynchronously...
  var productId = '6158283178182'; // TODO: remove
  var data = await fetch(`/search/suggest.json?type=product&q=id:${productId}&resources[type]=product`)
  var json = await data.json();
  var products = json.resources.results.products;
  console.log(products);
  if (products.length == 1){
    return renderProduct(products[0], recommendationToken);
  } else {
    return '';
  }
}

function renderProduct(product, recToken) {
  var productUrl = updateQueryStringParameter(product.url, 'recToken', recToken);
  
  return [
    '<li style=display:inline; background-color: lightblue;>',
//     'HELLO',
    '<a href="' + productUrl + '" class="product__anchor">',
    '<img class="product__img" src="' + product.image + '" alt="'+ product.title +'"/>',
    '<p class="product__title" display: inline;>' + product.title + '</p>',
    '<p class="product__price">' + formatMoney(product.price, window.moneyFormat) + '</p>',
    '</a>',
    '</li>'
  ].join("");
}



function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */

const moneyFormat = '${{amount}}';

/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */
function formatMoney(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  let value = '';
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || moneyFormat;

  function formatWithDelimiters(
    number,
    precision = 2,
    thousands = ',',
    decimal = '.'
  ) {
    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split('.');
    const dollarsAmount = parts[0].replace(
      /(\d)(?=(\d\d\d)+(?!\d))/g,
      `$1${thousands}`
    );
    const centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}