install:
	npm install

build:
	./node_modules/gulp/bin/gulp.js build

test:
	./node_modules/karma/bin/karma start karma.conf.js --single-run

tdd:
	./node_modules/karma/bin/karma start karma.conf.js