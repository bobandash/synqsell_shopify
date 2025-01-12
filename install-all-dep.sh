#!/bin/bash

for dir in $(find . -name "package.json" -not -path "**/node_modules/*" -exec dirname {} \;); do cd "$dir" && npm install && cd -; done