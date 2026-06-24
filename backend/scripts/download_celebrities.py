import os
import sys
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure backend is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from constants import CELEBRITIES

out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "celebrities")
os.makedirs(out_dir, exist_ok=True)

def fetch_and_download(name):
    filename = name.lower().replace(" ", "_").replace(".", "") + ".jpg"
    out_path = os.path.join(out_dir, filename)
    if os.path.exists(out_path):
        return f"Already have {name}"
        
    headers = {"User-Agent": "CuteCoupleFinder/1.0"}
    
    try:
        url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "prop": "pageimages",
            "format": "json",
            "piprop": "original",
            "titles": name
        }
        r = requests.get(url, params=params, headers=headers, timeout=5)
        data = r.json()
        pages = data.get("query", {}).get("pages", {})
        
        img_url = None
        for page_id, page_info in pages.items():
            if "original" in page_info:
                img_url = page_info["original"]["source"]
                break
                
        if not img_url:
            return f"No Wikipedia image found for {name}"
            
        r_img = requests.get(img_url, headers=headers, timeout=10)
        if r_img.status_code == 200:
            with open(out_path, "wb") as f:
                f.write(r_img.content)
            return f"Downloaded {name}"
        else:
            return f"Failed to download image for {name}"
            
    except Exception as e:
        return f"Error for {name}: {e}"

print("Starting Wikipedia celebrity download...")
with ThreadPoolExecutor(max_workers=10) as executor:
    futures = {executor.submit(fetch_and_download, name): name for name in CELEBRITIES}
    for future in as_completed(futures):
        print(future.result())

print("Done.")
