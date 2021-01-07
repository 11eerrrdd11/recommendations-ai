#  host files

# create tags
curl -X POST -H "Content-Type: application/json" -d '{"script_tag": {"event": "onload", "src": "https://djavaskripped.org/fancy.js"}}' https://olivanders-test-store.myshopify.com/admin/api/2021-01/script_tags.json
