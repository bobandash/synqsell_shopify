<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/bobandash/synqsell_shopify">
  <img src="https://github.com/bobandash/synqsell_shopify/blob/main/application/app/assets/SynqSell.png" alt="Logo" width="120" height="120">
  </a>
  <h3 align="center">SynqSell</h3>
  <p align="center">
    A Shopify App that allows merchants to seamlessly import and customize products from other Shopify stores.
    <br />
    <a href="https://github.com/bobandash/synqsell_shopify"><strong>Explore the docs »</strong></a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details open>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#deployment">Deployment Status</a></li>   
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#uninstallation">Uninstallation</a></li>
      </ul>
    </li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#technical-approach-and-obstacles">Technical Approach and Obstacles</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>

## About The Project

![image](https://github.com/user-attachments/assets/2317aef8-2a5b-4fdd-95ad-fbe742d0d974)

When I worked in the eCommerce space selling anime merchandise, I had some key observations:

<ol>
  <li>Product performance on one online store or marketplace didn't necessarily translate to sales on another platform.</li>
  <li>Even high-quality products with a clear market struggled to gain sales traction, ending up as unsold inventory.</li>
  <li>Successful products created a positive feedback loop:
    <ul>
      <li>Wholesale customers were more willing to purchase and stock items with proven sales records.</li>
      <li>Increased visibility of successful products generally led to more purchases and brand recognition and attracted new retail and wholesale customers.</li>
      <li>Strong sales of one product often boosted sales of complementary products</li>
    </ul>
</ol>

These observations led me to a crucial question: could I create a risk-free method for wholesale customers to test out manufacturers' promising but underperforming products, and potentially trigger the positive feedback loop of successful products? That was my motivation for building SynqSell, a Shopify app that allows cross-store product imports between suppliers and retailers, and automatic synchronization of prices, orders, and payments.

### Deployment Status
- Submitted to Shopify App Store for Review
- Video Demo: https://www.youtube.com/watch?v=D-RJJmcRiks&feature=youtu.be
- Main Features (Text): https://aback-thistle-ade.notion.site/Features-At-A-Glance-8be5cba5a5254a67bb59845c5b1c738a
- Basic Information Site: https://www.synqsell.com/

### Built With

- [![Remix][Remix.run]][Remix-url]
- [![Typescript][Typescript]][Typescript-url]
- [![GraphQL][GraphQL]][GraphQL-url]
- [![Prisma][Prisma]][Prisma-url]
- [![PostgreSQL][PostgreSQL]][PostgreSQL-url]
- [![Shopify Polaris][Shopify-Polaris]][Shopify-Polaris-url]
- [![Shopify Webhooks][Shopify-Webhooks]][Shopify-url]
- [![AWS][AWS]][AWS-url]
- [![YAML][YAML]][YAML-url]
- [![Node.js][NodeJs]][NodeJs-url]
- [![Stripe][Stripe]][Stripe-url]

## Getting Started

<strong>Note: because this application uses AWS resources to handle real-time data synchronization between SynqSell's database and Shopify, we need to provision cloud resources, which will cost money. To make the current dev resources be mostly covered by the AWS Free Tier, we should change the NAT Gateway to a NAT Instance and remove the bastion host for dev and use a VPN instead.</strong>
<br /><br />
To get a local copy up and running follow these steps:

### Prerequisites

1. Install [Node.js](https://nodejs.org/en) and the latest version of npm
   ```sh
   npm install npm@latest -g
   ```
2. Install the Shopify CLI
   ```sh
   npm install -g @shopify/cli@latest
   ```
3. Install [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
4. Install [pgAdmin4](https://www.postgresql.org/ftp/pgadmin/pgadmin4/v8.12/windows/)
5. Register for a Stripe Account that has access to [Stripe Payments](https://dashboard.stripe.com/register) and [Stripe Connect](https://dashboard.stripe.com/register/connect)
   - For the Stripe connect account, create it with the following [settings](https://docs.stripe.com/connect/design-an-integration?connect-onboarding-surface=hosted&connect-dashboard-type=full&connect-economic-model=revshare&connect-loss-liability-owner=stripe&connect-charge-type=direct)
   - Securely store and retrieve the [Stripe's Test API Keys](https://docs.stripe.com/keys)
6. Become a [Shopify Partner](https://www.shopify.com/partners) and create an application
   - Set up a connection between [AWS Eventbridge and Shopify](https://shopify.dev/docs/apps/build/webhooks/subscribe/get-started?framework=remix&deliveryMethod=eventBridge) (step 1.1)
   - Securely store the generated event bus and event source ARN
   - Go to the left sidebar of the app, and navigate to the API access sidebar and "Protected customer data access" section
     - Click "manage" and mark all "Protected customer fields" as app functionality and "Data protection details" as "Yes"
7. Create an [AWS account](https://aws.amazon.com/) and set up an [administrative IAM](https://www.sweetprocess.com/procedures/_eG30mkvYDrfAmevj78A0i6E1GZE/add-an-administrator-to-your-amazon-aws-account/)
   - Retrieve and securely store the [access key id and secret access key](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey)
   - Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
   - Using the AWS CLI, configure your computer to use your AWS account
     ```sh
     aws configure
     ```
   - Using the AWS website, navigate to EC2
     - Create a key-pair at the "Network & Security" > "Key Pairs" tab (choose the .PEM file extension option)
     - Securely store both the key pair name and the generated .PEM file
   - Using the AWS website or CLI, navigate to AWS Secrets Manager
     - Create a secrets manager with the name `<dev/appConfig>`, and store the following values:
       - `<bastionHostKeyPair>` - this was created in the EC2 step with the key pair name
       - `<shopifyEventBusIdentifier>` - this was created in the Shopify partner step; the format should be similar to aws.partner/shopify.com/174043561985/dev
       - `<myCidrIP>`- Locate your public [iPv4 IP](https://www.whatismyip.com/) and append a /32 after it (e.g. 123.123.123.123/32)
       - `<dbPort>` - Default value is 5432
       - `<dbName>` = Default value is postgres
       - `<dbUsername>` - Default value is postgres
     - Create a secrets manager with the name `<dev/apiKeys>` and store the following values (make sure you store the test mode values):
       - stripeSecretApiKey - Locatable in [Stripe Connect](https://docs.stripe.com/keys#:~:text=In%20the%20Developers%20Dashboard%2C%20select,key%20value%20by%20clicking%20it.), prefixed with sk_test
       - stripeReactAppPublishableKey - Locatable in [Stripe Connect](https://docs.stripe.com/keys#:~:text=In%20the%20Developers%20Dashboard%2C%20select,key%20value%20by%20clicking%20it.), prefixed with pk_test
       - stripeWebhookSigningSecret - Locatable in [Stripe Webhooks in Toolbox](https://dashboard.stripe.com/login?redirect=%2Ftest%2Fwebhooks), prefixed with whsec
8. Clone the repository:
   ```sh
   git clone https://github.com/bobandash/synqsell_shopify.git
   ```
9. <strong>(Windows Only)</strong> OpenSSH may not be installed by default for windows. Install [OpenSSH](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse?tabs=gui&pivots=windows-server-2025).

### Installation

For AWS:

1. In the samconfig.toml, change the s3_bucket in the dev.deploy.parameters to a value other than "synqsell-sam"; bucket names are fully unique on AWS.
2. Change the working directory to aws
   ```sh
      cd aws
   ```
3. Build the IaC for deployment
   ```sh
   sam build
   ```
4. Deploy your cloud resources onto your AWS account
   ```sh
   sam deploy --config-env dev
   ```
5. Important values will be outputted in the terminal after the changeset is deployed. Please record these values, which are important in setting up the local application

For the Shopify Application:

1. Open your terminal as an administrator
2. Create a tunnel from your local database to RDS via the bastion host created:
   ```sh
   ssh -i <BASTION_KEY.PEM> -NL 8886:<DB_ENDPOINT_ADDRESS>:5432 ec2-user@<BASTION_HOST_IP> -v
   ```
   - `<BASTION_KEY.PEM>` - The file path of the private key file you generated and downloaded in Prerequisites
   - `<DB_ENDPOINT_ADDRESS>`, `<BASTION_HOST_IP>` - Found in the CloudFormation/SAM outputs after deployment.
3. Open another terminal instance in your IDE
4. Change the working directory to the application
   ```sh
   cd application
   ```
5. Install all the dependencies
   ```sh
   npm install
   ```
6. Edit the shopify.app.dev.toml file to match your Shopify partners account configuration. Navigate to your app in the [partners dashboard](https://partners.shopify.com/) and update the following values:

   - `<client_id>` - At the "Overview" tab, it's the "Client Id" in the "Client Credentials" box
   - `<name>`, `<handle>` - At the "Configuration" tab, it's the box with the "App name" and "App handle"
   - `<dev_store_url>` - At the "Overview" tab, there's a "Test your app" box. Click "Select Store" and create a development store and get the url in the format (`<STORE_NAME>`.myshopify.com)
   - `<uri>` - This is the uri of the EventBridge source

7. Install all the dependencies
   ```sh
   npm install
   ```
8. Use the dev toml file
   ```sh
   npm run config:use dev
   ```
9. Obtain your database password (the "password" field from this output)
   ```sh
    aws secretsmanager get-secret-value --secret-id <DB_SECRETS_ARN> --query 'SecretString' --output text
   ```
   - `<DB_SECRETS_ARN>` - Found in the CloudFormation/SAM outputs after deployment.
10. Create a .env file inside the working directory and copy and paste the values in the .sample.env
    - `<DATABASE_URL>` - postgresql://postgres:<DB_PASSWORD>@localhost:8886/postgres, with the DB_PASSWORD being the password you obtained in step 5
    - `<AWS_ACCESS_KEY_ID>` and `<AWS_SECRET_ACCESS_KEY>` - Generated and stored in Prerequisites
    - `<STRIPE_SECRET_API_KEY>` and `<REACT_APP_STRIPE_PUBLISHABLE_KEY>` - Generated and stored in Prerequisites
    - `<ADMIN_SESSION_ID>` - This is the same value as the dev*store_url you configured in shopify.app.dev.toml with offline* prefixed to it (e.g. offline_`<STORE_NAME>`.myshopify.com)
    - `<NODE_ENV>`: Set it to "development"
    - `<CARRIER_SERVICE_CALLBACK_URL>`, `<AWS_REGION>`, `<S3_BUCKET>` - found in SAM outputs after deployment
11. Run the following command to start the application.
    ```sh
    npm run dev
    ```
12. Your database migrations should start running. AFter the migrations are finished, click on the preview URL that was generated in the terminal.
13. Run the following command:
    ```sh
    npx prisma db seed
    ```
14. Refresh your preview, and your Shopify account should become an admin of the application and the checklist tables should be loaded.
15. Add more development stores to the application and start importing products from other stores!

### Uninstallation

When you are done with the local development, navigate to AWS CloudFormation on AWS and delete the stack, so you are not billed for the resources in use.

## Architecture

This is the current architecture of SynqSell.
<br />
<br />
Note: the architecture currently has many single points of failure. This is intentional because of the application's lack of users; If the application scales with more users, the architecture should continue to evolve alongside the growth.
<br />
<br />
![SynqSell Architecture (2)](https://github.com/user-attachments/assets/524ce31d-2c4a-47ff-92a7-aeafa9d70e29)

## Technical Approach and Obstacles

This section delves into the rationale behind key technical decisions when working on this project and highlights the challenges I encountered during the project's development.
<br />
<br />
Regarding automated testing, I purposely chose not to write many automated tests. This was for a few reasons:

<ul>
  <li><strong>Development Team Size:</strong> As the sole developer on this project, the risk of unexpected breaking changes is minimized. This allows for a more agile development process without the immediate need for extensive test coverage.</li>
  <li><strong>Anticipated Future Changes:</strong> Given the early nature of this SaaS application, I expect significant changes and modifications to the SaaS. Investing a lot of time in automated tests could just lead to inefficient use of development resources.</li>
  <li><strong>Focus on MVP and User Feedback:</strong> My goal was to create an MVP or POC to gather real-world feedback as soon as possible. In doing so, the future development direction and user needs could be identified more rapidly.</li>
</ul>
<br />
However, I wanted to also balance this project as a learning opportunity, to experiment and deepen my knowledge of technologies such as:

### Remix.run

Before this project, I had never used a full-stack web framework before. While I had used Next.js, I never used the full-stack web capabilities of Next.js, instead, I relied on separate backend services for API calls. In Remix.run, I originally developed under the assumption that actions were the equivalent of POST, DELETE, PATCH API in traditional backends, returning JSON data to update the UI.
<br />
<br />
However, as I delved deeper into the project and Remix's documentation, I realized this approach wasn't optimal, and that actions automatically trigger the route's loader (the GET request to server-side render the page again). This meant I could simplify my code and allow my UI to automatically update based on the refreshed loader data whenever my route calls an action. This revelation sparked a paradigm shift in my thinking: I understood at a higher level the trade-offs between tightly coupling your backend and frontend into a full-stack framework and keeping a loosely coupled backend and frontend. While you sacrifice the ability to make your backend API consumable by multiple frontend, it significantly streamlines the development for a single frontend consumer with UI rendering depending on actions.
<br />
<br />
As a side note, for a platform like Shopify that's encouraging most of their app developers to switch to embedded apps (apps running within an iFrame on Shopify, creating a seamless experience for merchants), setting the default development experience as a full-stack framework like Remix both makes it easier for Shopify developers to create an app and more more challenging to migrate to a non-embedded app in the future. This highlights an important consideration in the future for choosing a development approach for platform-specific applications.

### AWS

Despite this project's early stage, I decided to learn and implement scalable cloud solutions using AWS. While I recently obtained the AWS Certified Cloud Practioner certification, I recognized that the certificate primarily involved memorizing AWS microservices rather than gaining practical experience.

In this project, I wanted to move beyond theoretical knowledge and acquire hands-on experience using AWS microservices and IaC tools like CloudFormation/AWS SAM. When developing AWS Lambda functions, I initially struggled with manually testing if the functions were properly receiving Shopify's webhooks and updating the database. Despite my general approach of minimizing automated tests, I initially resorted to writing integration tests to verify function calls, aiming to maximize development efficiency.
<br />
<br />
However, I later learned about AWS SAM Accelerate and log watch features. These tools allowed me to sync Lambda function code with my AWS infrastructure in real-time, eliminating the need for frequent deployments or extensive integration testing. This hands-on approach, while challenging, provided invaluable insights into cloud-based application development and significantly enhanced my practical skills with AWS services.
<br />
<br />
These are a few problems that I faced when developing this app. I learned a tremendous amount developing this project, and I'm excited to further my knowledge of development, cloud computing, system design, and other concepts.

## Contributing

This GitHub repo will host the public version of the MVP/PoC. There will be a separate, private repo with new features/changes. If you would like to contribute to the live application, please reach out to me at brucehsu1126@gmail.com. I would love to work with other developers to build a better platform that helps both manufacturers and retailers sell more products.

## License

This project is primarily intended for portfolio and educational purposes.

Copyright (c) Bruce Hsu

While this code is publicly viewable, it is not open-source. All rights are reserved.
No use, modification, or distribution is permitted without explicit permission from the author.

For potential employers: You are granted permission to review, run, and evaluate this code as part of the job application process.

If you wish to use this code for any other purpose, please contact brucehsu1126@gmail.com for permission.

## Contact

For questions about this project, or if you just want to connect, please feel free to reach out! [Bruce Hsu](https://www.linkedin.com/in/brucehsu1126/), email: brucehsu1126@gmail.com

## Acknowledgements

Servers perfect for asking questions about Shopify App Development and frantically searching with Control-F to figure out poorly documented APIs and features 😂

- [Shopify Slack Channel](https://join.slack.com/t/shopifypartners/shared_invite/zt-sdr2quab-mGkzkttZ2hnVm0~8noSyvw)
- [Remix Discord Server](https://rmx.as/discord)

<!-- MARKDOWN LINKS & IMAGES -->

[Remix.run]: https://img.shields.io/badge/REMIX.RUN-black?style=for-the-badge&logo=remix
[Remix-url]: https://remix.run/
[Typescript]: https://img.shields.io/badge/TYPESCRIPT-%23F0F0F0?style=for-the-badge&logo=typescript&logoColor=%23FFFFFF&color=%233178C6
[Typescript-url]: https://www.typescriptlang.org/
[GraphQL]: https://img.shields.io/badge/GRAPHQL-black?style=for-the-badge&logo=graphql&logoColor=%23FFFFFF&color=%23E10098
[graphql-url]: https://graphql.org/
[Shopify-Polaris]: https://img.shields.io/badge/SHOPIFY%20POLARIS-%23F0F0F0?style=for-the-badge&logo=shopify&logoColor=FFFFFF&color=%237AB55C
[Shopify-Polaris-url]: https://polaris.shopify.com/
[Shopify-Webhooks]: https://img.shields.io/badge/SHOPIFY%20WEBHOOKS-%23F0F0F0?style=for-the-badge&logo=shopify&logoColor=FFFFFF&color=%237AB55C
[Shopify-url]: https://shopify.dev/docs/apps/build/webhooks
[Prisma]: https://img.shields.io/badge/PRISMA%20ORM-%23F0F0F0?style=for-the-badge&logo=prisma&logoColor=FFFFFF&color=%232D3748
[Prisma-url]: https://www.prisma.io/
[PostgreSQL]: https://img.shields.io/badge/POSTGRESQL-%23F0F0F0?style=for-the-badge&logo=postgresql&logoColor=FFFFFF&color=%234169E1
[PostgreSQL-url]: https://www.postgresql.org/
[AWS]: https://img.shields.io/badge/AMAZON%20WEB%20SERVICES-%23F0F0F0?style=for-the-badge&logo=amazonwebservices&logoColor=FFFFFF&color=%23232F3E
[AWS-url]: https://aws.amazon.com/
[YAML]: https://img.shields.io/badge/YAML-%23F0F0F0?style=for-the-badge&logo=yaml&logoColor=FFFFFF&color=%23CB171E
[YAML-url]: https://yaml.org/
[NodeJs]: https://img.shields.io/badge/NODE.JS-%23F0F0F0?style=for-the-badge&logo=nodedotjs&logoColor=FFFFFF&color=%235FA04E
[NodeJs-url]: https://nodejs.org/en
[Stripe]: https://img.shields.io/badge/STRIPE-%23F0F0F0?style=for-the-badge&logo=stripe&logoColor=FFFFFF&color=%23008CDD
[Stripe-url]: https://stripe.com/
