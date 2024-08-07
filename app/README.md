## STRATEGY

I will not test my application until the proof of concept is complete, and there are users that I can talk to
Instead, I have to make sure that my logs are written correctly, so that I can just debug it if any users have issues
And, my priority / what I've been focusing on the past few days, is figuring out the best way to approach a two database system (postgresql and shopify admin api)

## LOGS ARE IN THE FORMAT:

FUNCTION NAME (ANY IMPORTANT PARAMS THAT ARE NOT PII): ERROR MESSAGE
TIMESTAMP AND LEVEL ARE GIVEN
What's the point in logging.info?

## COMMON COMMANDS

RUN TESTS:
npm run test -- --watch --detectOpenHandles

GENERATE TYPES:
npm run graphql-codegen -- --watch

Database Schema
https://lucid.app/lucidchart/323a5447-790f-476f-8e8d-3cc7d767a6a0/edit?from_internal=true

Format to adopt for logs and errors
FunctionName shop ${shop} message
