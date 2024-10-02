<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/bobandash/synqsell_shopify">
    <!-- TODO: ADD LOGO -->
    {ADD LOGO HERE}
  </a>
  <h3 align="center">SynqSell</h3>
  <p align="center">
    A Shopify App that allows merchants to seamlessly import and customize products from other Shopify stores.
    <br />
    <a href="https://github.com/bobandash/synqsell_shopify"><strong>Explore the docs »</strong></a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#deployment">Deployment</a></li>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#features-at-a-glance">Features At A Glance</a></li>
    <li><a href="#technical-approach-and-obstacles">Technical Approach and Obstacles</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>

## About The Project
<!-- TODO: INSERT SCREENSHOT OF PROJECT -->
{ADD SCREENSHOT OF MAIN FEATURES OF PROJECT}

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

These observations led me to a crucial question: could I create a risk-free method for wholesale customers to test out manufacturers' promising but underperforming products, and potentially trigger the positive feedback loop of successful products? That was my motivation for building Synqsell, a Shopify app that allows cross-store product imports between suppliers and retailers, and automatic synchronization of prices, orders, and payments.

### Deployment
Pending deployment on the Shopify App Store 
<!-- TODO: INSERT SCREENSHOT OF PENDING APPROVAL STATUS -->
{ADD SCREENSHOT OF PENDING APPROVAL STATUS}

### Built With
* [![Remix][Remix.run]][Remix-url]
* [![Typescript][Typescript]][Typescript-url]
* [![Prisma][Prisma]][Prisma-url]
* [![PostgreSQL][PostgreSQL]][PostgreSQL-url]
* [![Shopify Polaris][Shopify-Polaris]][Shopify-Polaris-url]
* [![Shopify Webhooks][Shopify-Webhooks]][Shopify-url]
* [![AWS][AWS]][AWS-url]
* [![YAML][YAML]][YAML-url]
* [![Node.js][NodeJs]][NodeJs-url]
* [![Stripe][Stripe]][Stripe-url]

## Getting Started

To get a local copy up and running follow these steps.

### Prerequisites
1. Install npm
    ```sh
    npm install npm@latest -g
    ```
2. Become a [Shopify Partner](https://www.shopify.com/partners)
3. Register for a Stripe Account that has access to [Stripe Payments](https://dashboard.stripe.com/register) and [Stripe Connect](https://dashboard.stripe.com/register/connect)
  - Store and retrieve the [Test API Keys](https://docs.stripe.com/keys)
4. Create an [AWS account](https://aws.amazon.com/) and set up an [administrative IAM](https://www.sweetprocess.com/procedures/_eG30mkvYDrfAmevj78A0i6E1GZE/add-an-administrator-to-your-amazon-aws-account/)
  - Store and retrieve an [access key id and secret access key](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey)
  - Install [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) 



<!-- MARKDOWN LINKS & IMAGES -->
[Remix.run]: https://img.shields.io/badge/REMIX.RUN-black?style=for-the-badge&logo=remix
[Remix-url]: https://remix.run/
[Typescript]: https://img.shields.io/badge/TYPESCRIPT-%23F0F0F0?style=for-the-badge&logo=typescript&logoColor=%23FFFFFF&color=%233178C6
[Typescript-url]: https://www.typescriptlang.org/
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










