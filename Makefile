clean:
	rm -rf node_modules docs
docs:
	docco lib/*.js lib/vt/*.js

install: clean docs
	npm install

.PHONY: clean install docs
