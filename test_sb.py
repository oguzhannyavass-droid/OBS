import sys
from supabase import create_client, Client

url = "https://ncxjcfbympmsfimbsoh.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jeGpjb2ZieW1wdXNmaW1ic29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTE3MDMsImV4cCI6MjA5MzQ2NzcwM30.glHkolcMpayGVrrcZF2AG3cTbIbPx1v5x-oA5GJyD1g"

try:
    supabase: Client = create_client(url, key)
    res = supabase.table('user').select("*").limit(1).execute()
    print("Connection successful! Response:", res)
except Exception as e:
    print("Error connecting to Supabase:", e)
