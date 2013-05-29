clean:
	rm -rf node_modules docs build
docs:
	docco session/**/*.js screen/js/*.js

install: clean docs
	npm install

test:
	jasmine-node ./test/ --forceexit

.PHONY: clean install docs test
