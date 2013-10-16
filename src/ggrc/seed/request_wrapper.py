import requests

if __name__ == "__main__":
  site_domain = "http://localhost:8080"
  seed_path = "/admin/seedrandom"
  requests.get(site_domain + "/dashboard")
  requests.get(site_domain + seed_path)
