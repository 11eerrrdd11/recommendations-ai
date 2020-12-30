import logging
import binascii
from dotenv import load_dotenv
import os
from google.cloud import bigquery
import shopify
import pandas as pd
import json
import html2text

def _parse_shopify_products_csv() -> pd.DataFrame:
    useful_columns = [
        'Handle', 'Title', 'Body (HTML)', 
    #     'Vendor', 
        'Type', 
    #     'Tags', 
        'Published', 
    #     'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value', 
    #     'Variant SKU', 
    #     'Variant Grams', 
    #     'Variant Inventory Tracker', 
    #     'Variant Inventory Qty', 
    #     'Variant Inventory Policy', 
    #     'Variant Fulfillment Service', 
        'Variant Price', 
    #     'Variant Compare At Price', 
        'Variant Requires Shipping', 
    #     'Variant Taxable', 
    #     'Variant Barcode', 
        'Image Src', 
        'Image Position', 
        'Image Alt Text', 
        'Gift Card', 
        'SEO Title', 
        'SEO Description', 
    #     'Google Shopping / Google Product Category', 
    #     'Google Shopping / Gender', 'Google Shopping / Age Group', 'Google Shopping / MPN', 
    #     'Google Shopping / AdWords Grouping', 'Google Shopping / AdWords Labels', 
    #     'Google Shopping / Condition', 'Google Shopping / Custom Product', 
    #     'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1', 
    #     'Google Shopping / Custom Label 2', 'Google Shopping / Custom Label 3', 
    #     'Google Shopping / Custom Label 4', 
        'Variant Image', 'Variant Weight Unit', 'Variant Tax Code', 'Cost per item', 
        'Status'
    ]
    products_df = pd.read_csv('./data/products_export_1.csv', usecols=useful_columns)
    
    # only upload active, published, shippable products
    products_df = products_df.loc[
        (products_df['Status'] == 'active') & 
        (products_df['Published'] == True) &
        (products_df['Variant Requires Shipping'] == True)
    ]

    # add cols required by recs AI
    products_df['language_code'] = 'en'
    products_df['canonical_product_uri'] = None
    products_df['currency_code'] = 'GBP'

    def html_to_text(html_text):
        try:
            return html2text.html2text(html_text)
        except:
            return ''
    def parse_images(x):
        return [{
            'uri': x,
            'height': None,
            'width': None,
        }]
    def parse_price(price: float):
        return {
            'original_price': price,
            'display_price': price,
        }
    def parse_id(img_src: str):
        try:
            id = img_src.split('?v=')[-1]
            return id
        except:
            return None

    products_df['description'] = products_df['Body (HTML)'].apply(lambda html: html_to_text(html))
    products_df['images'] = products_df['Image Src'].apply(lambda x: parse_images(x))
    products_df['exact_price'] = products_df['Variant Price'].apply(lambda x: parse_price(x))
    products_df['id'] = products_df['Image Src'].apply(lambda x: parse_id(x))
    products_df.rename(columns={
        'Title': 'title',
    }, inplace=True)
    cols = [
        # product metadata
        'images',
        'exact_price',
        # 'canonical_product_uri',
        'currency_code',
        
        # other
        'language_code',
        'description',
        'title',
        'id',
    ]
    recommendations_ai_df = products_df[cols]
    recommendations_ai_df.dropna(inplace=True)
    logging.info("{} products parsed".format(recommendations_ai_df.shape[0]))
    return recommendations_ai_df


def _df_to_json(df: pd.DataFrame) -> dict:
    lines = []
    for idx, row in df.iterrows():
        lines.append(
            # see - https://cloud.google.com/recommendations-ai/docs/upload-catalog#json-format
            {
                'product_metadata': {
                    'images': row.images,
                    'exact_price': row.exact_price,
                    'canonical_product_uri': None,
                    'currency_code': 'GBP',
                },
                'language_code': row.language_code,
                'description': row.description,
                'title': row.title,
                'tags': [],
                'category_hierarchies': [
                    {'categories': ['socks', 'funky']},
                    {'categories': ['socks', 'clearance']},
                ],
                'id': row.id
            }
        )
    return lines


def shopify_to_bigquery():
    """Download catalog data from shopify and upload to BigQuery
    """
    df = _parse_shopify_products_csv()
    json_dict = _df_to_json(df)
    with open('./data/preprocessed_products.json', 'w') as f:
        for d in json_dict:
            f.write(json.dumps(d)+'\n')
    

def bigquery_to_recommendations_ai():
    """Upload products from bigquery to recommendations Ai
    """
    pass

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
    SHOPIFY_API_KEY = os.getenv('SHOPIFY_API_KEY')
    SHOPIFY_API_SECRET = os.getenv('SHOPIFY_API_SECRET')

    # run
    shopify_to_bigquery()
