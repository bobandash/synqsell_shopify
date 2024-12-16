# https://www.reddit.com/r/aws/comments/12zqh13/how_i_got_typescript_lambda_layers_working_with/
# https://dan.salvagni.io/b/aws-sam-and-typescript-building-functions-and-layers/
# TODO: change to Linux after figure out how to make it compatible w windows
.PHONY: build-UtilLayer

build-UtilLayer:
	npm.cmd install
	npm.cmd run build
	mkdir "$(ARTIFACTS_DIR)\nodejs"
	copy package.json "$(ARTIFACTS_DIR)\nodejs"
	copy package-lock.json "$(ARTIFACTS_DIR)\nodejs"
	npm.cmd install --omit=dev --prefix "$(ARTIFACTS_DIR)\nodejs"
	del "$(ARTIFACTS_DIR)\nodejs\package.json"
	xcopy /E /I opt\nodejs "$(ARTIFACTS_DIR)\nodejs"