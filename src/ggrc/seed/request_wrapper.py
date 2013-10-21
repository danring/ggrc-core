import requests
from sys import argv

if __name__ == "__main__":
  site_domain = "http://localhost:8080"
  if len(argv) == 2:
    seed_path = "/admin/seedrandom/withprefix/{0}".format(argv[1])
  elif len(argv) > 2:
    seed_path = "/admin/seedrandom/custom/{0}/{1}/{2}/{3}".format(
        argv[1],  # prefix
        argv[2],  # number of governance objects
        argv[3],  # number of business objects
        argv[4],  # number of mappings
    )
  else:
    seed_path = "/admin/seedrandom"
  requests.get(site_domain + "/dashboard")
  requests.get(site_domain + seed_path)
