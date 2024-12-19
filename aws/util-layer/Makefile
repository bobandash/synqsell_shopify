# https://www.reddit.com/r/aws/comments/12zqh13/how_i_got_typescript_lambda_layers_working_with/
# https://dan.salvagni.io/b/aws-sam-and-typescript-building-functions-and-layers/
.PHONY: build-UtilLayer

ifeq ($(OS),Windows_NT)
    # Windows commands
    COPY = copy /Y
    CP_R = xcopy /E /I /Y
    RM = del /Q
    MKDIR = mkdir
    NPM = npm.cmd
    TARGET_DIR = $(subst /,\,$(ARTIFACTS_DIR)\nodejs)
    SOURCE_DIR = $(subst /,\,opt\nodejs\*)
    SLASH = \

else
    # Linux commands
    COPY = cp
    CP_R = cp -r
    RM = rm -f
    MKDIR = mkdir -p
    NPM = npm
    TARGET_DIR = $(ARTIFACTS_DIR)/nodejs/
    SOURCE_DIR = opt/nodejs/*
    SLASH = /

endif

build-UtilLayer:
	$(NPM) ci
	$(NPM) run build
	$(MKDIR) "$(TARGET_DIR)"
	$(COPY) package.json "$(TARGET_DIR)"
	$(COPY) package-lock.json "$(TARGET_DIR)"
	$(NPM) ci --omit=dev --prefix "$(TARGET_DIR)"
	$(RM) "$(TARGET_DIR)\package.json"
	$(CP_R) $(SOURCE_DIR) "$(TARGET_DIR)${SLASH}"