# SynqSell SAM

This section stores all the infrastructure for SynqSell (including but not limited to: all Lambda functions to handle Shopify and Stripe webhook topics, API Gateway for Carrier Service API, deployment infra on AWS (RDS, ECR, ECS, etc).

To reference how to set up the project locally, please go back to the <a href="https://github.com/bobandash/synqsell_shopify">main README</a>.

## Helpful Links
- [CFN common pseudo parameters](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)
- [List of prebuilt managed policies](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html)

## Architecture Reasoning

This section aims to explain why I needed AWS, and what resources I provisioned / rationale for some of my decisions.

### Why AWS?
The primary reason I chose AWS was to reliably handle Shopify’s webhooks. SynqSell’s core functionality is to ensure real-time data synchronization between two Shopify stores. If my application server is down when a webhook event is received, I risk losing critical data. This could lead to significant issues, such as a product being deleted on the supplier's end but remaining in the retailer’s store due to the missed event. To prevent such scenarios, AWS provides the resilience and reliability I need for webhook processing, ensuring no data is lost.

### Key Design Decisions & Trade-offs
Serverless First Approach
Given that SynqSell doesn’t yet have a user base, I opted for a serverless architecture where possible to keep costs efficient and scale based on demand:

AWS Fargate over EC2: I chose Fargate for container orchestration to avoid the overhead of managing EC2 instances. Fargate’s serverless model automatically scales with my needs, which is ideal while I assess the application's load requirements. If the application usage stabilizes, I can transition to EC2 Reserved Instances for cost optimization.

### Resilient Webhook Handling with EventBridge and SQS
To ensure high availability and durability of Shopify webhooks:

#### EventBridge + FIFO SQS: 
I configured Amazon EventBridge to route all incoming Shopify webhooks to a FIFO SQS queue. This setup ensures that events are processed in order and eliminates duplicates. A Dead Letter Queue (DLQ) is attached to capture any events that fail processing, providing a fail-safe mechanism.

#### Single SQS Queue with a Webhook Coordinator: 
Instead of creating multiple SQS queues for each Shopify webhook topic, I chose a simpler design using one FIFO SQS and a coordinator function. This approach processes all events in order while reducing the complexity of managing multiple queues and their processing times. Although dedicated queues per topic could offer parallel processing, my current design ensures ordered processing across all topics, which is better for data consistency.

#### Decoupled and Scalable Processing with Lambda
The coordinator function asynchronously invokes separate Lambda functions to handle each webhook topic:

Async Lambda Invocation: By invoking Lambdas asynchronously, the coordinator function doesn't wait for them to complete, which speeds up the overall processing time.
Lambda DLQ for Error Handling: Each Lambda function should be by its own DLQ, which would allow me to retry failed webhook processing. This setup ensures robustness by isolating failures and enabling targeted retries without affecting the main event flow.

#### Future Considerations
As SynqSell gains users and traffic patterns become more predictable, I plan to revisit certain architectural decisions:

Multi-AZ Deployment: Currently, I’m not leveraging multiple Availability Zones for resources like Lambda and NAT Gateways to reduce costs. If the application scales, I will have to use more resilient, multi-AZ infra setup.
EC2 Reserved Instances: If load patterns become stable, migrating from Fargate to EC2 Reserved Instances could significantly reduce costs.

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
- I need to fix the error handling for a lot of the lambda functions (read about best practices too late), make the ECR immutable for prod w/ a CI/CD pipeline to automate build and deploy, and add DLQ to the Shopify webhook topics.
