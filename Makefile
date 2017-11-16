.PHONY: lint clean

bundle.js: deps src/index.js
	cp src/noop.js bundle.js
	cat deps/env.js >> bundle.js
	cat deps/interop.js >> bundle.js
	cat deps/types.js >> bundle.js
	cat deps/reader.js >> bundle.js
	cat deps/printer.js >> bundle.js
	cat deps/core.js >> bundle.js
	cat src/index.js >> bundle.js

lint: node_modules
	@./node_modules/.bin/standard

deps:
	@mkdir -p deps
	curl -o deps/types.js https://raw.githubusercontent.com/kanaka/mal/master/js/types.js
	curl -o deps/reader.js https://raw.githubusercontent.com/kanaka/mal/master/js/reader.js
	curl -o deps/printer.js https://raw.githubusercontent.com/kanaka/mal/master/js/printer.js
	curl -o deps/env.js https://raw.githubusercontent.com/kanaka/mal/master/js/env.js
	curl -o deps/core.js https://raw.githubusercontent.com/kanaka/mal/master/js/core.js
	curl -o deps/interop.js https://raw.githubusercontent.com/kanaka/mal/master/js/interop.js

clean:
	@rm -rf bundle.js

node_modules: package.json
	npm install
	@touch node_modules
