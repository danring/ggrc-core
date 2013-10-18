import requests
from sys import argv

if __name__ == "__main__":
  site_domain = "http://localhost:8080"
  if len(argv) >= 2:
    seed_path = "/admin/seedrandom/withprefix/{0}".format(argv[1])
  else:
    seed_path = "/admin/seedrandom"
  requests.get(site_domain + "/dashboard")
  requests.get(site_domain + seed_path)
