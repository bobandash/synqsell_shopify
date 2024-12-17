# SynqSell SAM

This section stores all the infrastructure for SynqSell (including but not limited to: all Lambda functions to handle Shopify and Stripe webhook topics, API Gateway for Carrier Service API, deployment infra on AWS (RDS, ECR, ECS, etc).

To reference how to set up the project locally, please go back to the <a href="https://github.com/bobandash/synqsell_shopify">main README</a>.

## Helpful Links

- [CFN common pseudo parameters](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)
- [List of prebuilt managed policies](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html)

## Architecture Reasoning

This section aims to explain why I needed AWS, and what resources I provisioned / rationale for some of my decisions.

### Why AWS?

The primary reason I chose AWS was to reliably handle Shopify’s webhooks, which are critical for SynqSell’s core functionality—ensuring real-time data synchronization between two Shopify stores.

If I processed webhooks directly within my application (running on ECS/Fargate) and my server crashed, it could cause data inconsistencies. For example, consider this scenario:

- A supplier deletes a product on Shopify.
- If my application is down, it misses Shopify’s webhook event, and the product ID remains in SynqSell’s PostgreSQL database.
- When the application recovers, a retailer attempting to view the supplier's products triggers a GraphQL query for a product ID that no longer exists.
- The query fails, leading to an unrecoverable UI error.
- Fixing this issue would require manual intervention—checking logs for errors and verifying each supplier’s product list to identify unprocessed deletions. This process is time-consuming and error-prone.

To prevent such scenarios, AWS provides the resilience and reliability I need:

EventBridge receives and routes webhook events as a serverless solution.

FIFO SQS ensures:

- Webhooks are deduplicated.
- Events are processed in order.
- AWS Lambda processes the webhook events.
- If the Lambda function fails, the webhook is sent to a Dead Letter Queue (DLQ).
- I receive an email alert to inspect the DLQ, review logs, fix the issue, and reprocess the event.
  This approach ensures:
- No missed webhooks, even if my application is down.
- Automatic retries for failed events.
- A robust, scalable solution that eliminates manual cleanup and minimizes downtime.

### Key Design Decisions & Trade-offs

Serverless First Approach
Given that SynqSell doesn’t yet have a user base, I opted for a serverless architecture where possible to keep costs efficient and scale based on demand:

AWS Fargate over EC2: I chose Fargate for container orchestration to avoid the overhead of managing EC2 instances. Fargate’s serverless model automatically scales with my needs, which is ideal while I assess the application's load requirements. If the application usage stabilizes, I can transition to EC2 Reserved Instances for cost optimization.

### Resilient Webhook Handling with EventBridge and SQS

To ensure high availability and durability of Shopify webhooks:

#### EventBridge + FIFO SQS:

I configured Amazon EventBridge to route all incoming Shopify webhooks to a FIFO SQS queue. This setup ensures that events are processed in order and eliminates duplicates. A Dead Letter Queue (DLQ) is attached to capture any events that fail processing, providing a fail-safe mechanism.

#### Single SQS Queue with a Webhook Coordinator:

Instead of just filtering every webhook topic by Event Rules in EventBridge, I chose to use a FIFO SQS and a webhook coordinator function that invokes the webhook by topic. Webhooks are basically POST requests that send the event payload, and you create logic to process the event payload. But, it's possible for the same webhook to be sent multiple times. The Lambda functions I've written are idempotent, and I didn't want to deal with the scenario that the same webhook is processed twice for an important webhook topic such as fulfillmentsUpdate. If fulfillmentsUpdate was called twice, then the retailer may end up paying the supplier twice if I didn't handle it properly. By using an SQS, I can ensure deduplication (so webhooks are not sent multiple times) while also reliably storing the message in the queue for retry without losing data.

#### Decoupled and Scalable Processing with Lambda

The coordinator function asynchronously invokes separate Lambda functions to handle each webhook topic:

Async Lambda Invocation: By invoking Lambdas asynchronously, the coordinator function doesn't wait for them to complete, which speeds up the overall processing time.
Lambda DLQ for Error Handling: Each Lambda function has its own DLQ, which would allow me to retry failed webhook processing. This setup ensures robustness by isolating failures and enabling targeted retries without affecting the main event flow.

#### Future Considerations

As SynqSell gains users and traffic patterns become more predictable, I plan to revisit certain architectural decisions:

Multi-AZ Deployment: Currently, I’m not leveraging multiple Availability Zones for resources like Lambda and NAT Gateways to reduce costs. If the application scales, I will have to use more resilient, multi-AZ infra setup.
EC2 Reserved Instances: If load patterns become stable, migrating from Fargate to EC2 Reserved Instances could reduce costs.

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
