clean:
	rm -rf node_modules docs
docs:
	docco *.js lib/*.js vt/*.js && sweeten-docco

install: clean docs
	npm install

.PHONY: clean install
