# Shopify setup

Register your own standalone Shopify app. Configure server environment variables `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`. Set your deployed origin as the app URL and `<origin>/api/shopify/callback` as an allowed redirect. Request `read_products,write_products`.

Use a development store first. Verify OAuth, catalog retrieval and owner isolation. Product writing is not implemented yet.
