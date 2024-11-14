# SynqSell SAM

This section stores all the lambda functions to handle the Shopify webhook topics necessary for SynqSell, the public API endpoint to calculate an orders' shipping cost, and the Cloudformation/AWS SAM template to deploy the application.

To reference how to set up the project, please click <a href="https://github.com/bobandash/synqsell_shopify">here</a>.

# Helpful Links

# https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html

# https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html

## Common Commands

Here are a list of common commands used for development.

- To validate the template.yaml after building to make sure there's no errors
  ```sh
  sam validate
  ```
- To build the template.yaml / cloudformation template
  ```sh
  sam build --config-file samconfig.app.toml
  ```
- To deploy the sam application
  ```sh
  sam deploy --parameter-overrides BastionHostKeyName=<ParameterValue1> StripeSecretsManagerARN=<ParameterValue2> EventBusArn=<ParameterValue3> MyCidrIP=<ParameterValue4>
  ```
- When developing in the lambda function, and you need Shopify graphql's type safety
  ```sh
  npm run graphql-codegen -- --watch
  ```
- When developing in lambda, and you need real-time logs in your console
  ```sh
  sam logs -n <FunctionName> --stack-name SynqSell -t
  ```
  - `<FunctionName>` - this is found in your CloudFormation template
- When you want to sync your local changes into the deployed cloudformation stack without running sam build + sam deploy everytime (cd into aws/infrastructure)
  ```sh
  sam sync --stack-name  Synqsell-Dev --watch
  ```
  - `<FunctionName>` - this is found in your CloudFormation template
- For deploying to staging or prod, go to ACM -> Create records in Route 53 after you run deploy

# Common Commands

# sam build

# sam validate --template-file <name> --lint

# sam deploy --config-env dev

# sam deploy --config-env prod

## TODO: I need to setup a CD pipeline --> basically it has to run iam first then pass it as the --role-arn
