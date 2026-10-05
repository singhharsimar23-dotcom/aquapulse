.PHONY: all preflight oracle check verify

all: verify

preflight:
	python -c "import urllib.request; [urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'AquaPulse-Preflight/1.0'}), timeout=10) for u in ['https://registry.npmjs.org/', 'https://earth-search.aws.element84.com/v1']]; print('PREFLIGHT OK')"

oracle:
	python reference/aquapulse_ref.py --selftest

check:
	python scripts/check.py --selftest
	python scripts/check.py

S ?= default

verify:
	python scripts/verify.py $(S)
