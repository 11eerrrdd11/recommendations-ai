import logging
import binascii
from dotenv import load_dotenv
import os
from google.cloud import bigquery
import shopify
import pandas as pd
import json
import html2text


class RecsProduct:
    def __init__(self, product: shopify.Product):
        self.id = str(product.id)
        self.title = product.title
        self.description = self._html_to_text(product.body_html)
        self.images = self._parse_image(product.image)
        self.price = self._parse_price(product)

    def _parse_price(self, product: shopify.Product) -> dict:
        variants = product.variants
        for variant in product.variants:
            price = {
                'original_price': variant.price,
                'display_price': variant.price,
            }
            return price

    
    def _html_to_text(self, html_text):
        try:
            return html2text.html2text(html_text)
        except:
            return ''

    def _parse_image(self, image: shopify.Image):
        return [{
            'uri': image.src,
            'height': str(image.width),
            'width': str(image.height),
        }]
    
    def to_json(self):
        return {
                'product_metadata': {
                    'images': self.images,
                    'exact_price': self.price,
                    'canonical_product_uri': None,
                    'currency_code': 'USD',
                },
                'language_code': 'EN',
                'description': self.description,
                'title': self.title,
                'tags': [],
                'category_hierarchies': [
                    {'categories': ['socks', 'funky']},
                    {'categories': ['socks', 'clearance']},
                ],
                'id': self.id
            }

def shopify_to_bigquery():
    """Download catalog data from shopify and upload to BigQuery
    """
    # get products from shopify
    session = shopify.Session(SHOPIFY_SHOP_URL, SHOPIFY_API_VERSION, PRIVATE_APP_PASSWORD)
    shopify.ShopifyResource.activate_session(session)
    products = shopify.Product.find()
    gcp_products = []
    for product in products:
        gcp_product = RecsProduct(product)
        gcp_products.append(gcp_product)
    shopify.ShopifyResource.clear_session()

    with open('./data/preprocessed_products.json', 'w') as f:
        for gcp_product in gcp_products:
            f.write(json.dumps(gcp_product.to_json())+'\n')
    

def run():
    """
    """
    shopify_to_bigquery()

    ############################
    # create a table in bigquery
    ############################

    # Construct a BigQuery client object.
    # client = bigquery.Client()
    # table_id = "recommendations-ai-1234.recommendations_ai.products"
    # table = bigquery.Table(table_id, schema='./recommendations_ai_schema.json')
    # table = client.create_table(table)  # Make an API request.
    # logging.info(
    #     "Created table {}.{}.{}".format(table.project, table.dataset_id, table.table_id)
    # )

if __name__ == '__main__':
    # setup
    logging.basicConfig(level=logging.INFO)
    load_dotenv(verbose=True)
    SHOPIFY_SHOP_URL = os.getenv('SHOPIFY_SHOP_URL')
    SHOPIFY_API_VERSION = os.getenv('SHOPIFY_API_VERSION')
    PRIVATE_APP_PASSWORD = os.getenv('PRIVATE_APP_PASSWORD')

    # run
    shopify_to_bigquery()
