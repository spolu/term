clean:
	rm -rf node_modules docs
docs:
	docco lib/**/*.js 

install: clean docs
	npm install

test:
	jasmine-node ./test/ --forceexit

.PHONY: clean install docs test
