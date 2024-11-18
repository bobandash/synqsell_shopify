# SynqSell SAM

This section stores all the infrastructure for SynqSell (including but not limited to: all Lambda functions to handle Shopify and Stripe webhook topics, API Gateway for Carrier Service API, deployment infra on AWS (RDS, ECR, ECS, etc).

To reference how to set up the project locally, please click <a href="https://github.com/bobandash/synqsell_shopify">here</a>.

# Helpful Links
- [CFN common pseudo parameters](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)
- [List of prebuilt managed policies](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html)

## Architecture Reasoning



// There are pros and cons to my approach; this is the explanation to my coordinator function
// My two main options are using an SQS as the EventBridge's rule, or directly using a Lambda functions and directing the event to each one
// I chose to use an SQS because it would be able to automatically process the webhooks using FIFO, decouple the webhook application logic from the webhook delivery (so only one event is processed at once), and I could use a DLQ to reprocess the request
// And, even from this, I have multiple options too: create multiple SQS with each Shopify webhook topic; create one SQS and a webhooks coordinator function
// It could potentially be better to do multiple SQS for each Shopify webhook topic, but this configuration with a coordinator function is just simpler and it processes all the webhooks in order through FIFO; rather than every SQS having FIFO rules and processing at different times ACROSS topics depending on the lambda
// And, I can use the coordinator function to invoke the Lambdas async (so I'm not waiting for the Lambdas to finish running inside the coordinator function), and just set up a DLQ on the Lambda functions handling each topic, so that I can retry the Lambda functions with the prompt in case something fails

## Common Commands

Here are a list of common commands used for development. Most of these commands require cd into aws.

- To validate the CFN files to ensure there's no errors
  ```sh
  sam validate --template-file <name> --lint
  ```
- To build the template.yaml / cloudformation template
  ```sh
  sam build
  ```
- To deploy the sam application (Environment can only be dev, staging, prod)
  ```sh
  sam deploy --config-env <Environment>
  ```
- When developing in the lambda function, and you need Shopify graphql's type safety
  ```sh
  npm run graphql-codegen -- --watch
  ```
- When developing in lambda, and you need real-time logs in your console
  ```sh
  sam logs -n <FunctionName> --stack-name Synqsell-Dev -t
  ```
  - `<FunctionName>` - this is found in your CloudFormation template
- When you want to sync your local changes into the deployed cloudformation stack without running sam build + sam deploy everytime (cd into aws/infrastructure)
  ```sh
  sam sync --stack-name Synqsell-Dev --watch
  ```
  - `<FunctionName>` - this is found in your CloudFormation template
- NOTE: For deploying to staging or prod, this may be frozen for a little bit. You have to make sure the ALB Certificate is approved. Go to ACM -> Create records in Route 53 for the ALB Certificate.

## Roadmap
I will add the roadmap after talking to users, but before I continue:
- I need to fix the error handling for a lot of the lambda functions (read about best practices too late), and add DLQ to the Shopify webhook topics.
