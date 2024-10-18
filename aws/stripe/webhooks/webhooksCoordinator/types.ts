export type Event = {
    resource: string;
    path: string;
    httpMethod: string;
    headers: {
        Accept: string;
        'Accept-Encoding': string;
        'Cache-Control': string;
        'CloudFront-Forwarded-Proto': string;
        'CloudFront-Is-Desktop-Viewer': string;
        'CloudFront-Is-Mobile-Viewer': string;
        'CloudFront-Is-SmartTV-Viewer': string;
        'CloudFront-Is-Tablet-Viewer': string;
        'CloudFront-Viewer-ASN': string;
        'CloudFront-Viewer-Country': string;
        'Content-Type': string;
        Host: string;
        'Stripe-Signature': string;
        'User-Agent': string;
        Via: string;
        'X-Amz-Cf-Id': string;
        'X-Amzn-Trace-Id': string;
        'X-Forwarded-For': string;
        'X-Forwarded-Port': string;
        'X-Forwarded-Proto': string;
    };
    multiValueHeaders: {
        [key: string]: string[];
    };
    queryStringParameters: null;
    multiValueQueryStringParameters: null;
    pathParameters: null;
    stageVariables: null;
    requestContext: {
        resourceId: string;
        resourcePath: string;
        httpMethod: string;
        extendedRequestId: string;
        requestTime: string;
        path: string;
        accountId: string;
        protocol: string;
        stage: string;
        domainPrefix: string;
        requestTimeEpoch: number;
        requestId: string;
        identity: {
            cognitoIdentityPoolId: null;
            accountId: null;
            cognitoIdentityId: null;
            caller: null;
            sourceIp: string;
            principalOrgId: null;
            accessKey: null;
            cognitoAuthenticationType: null;
            cognitoAuthenticationProvider: null;
            userArn: null;
            userAgent: string;
            user: null;
        };
        domainName: string;
        deploymentId: string;
        apiId: string;
    };
    body: string;
    isBase64Encoded: boolean;
};

export type StripeEvent = {
    id: string;
    object: string;
    account: string;
    api_version: string;
    created: number;
    data: {
        object: {
            id: string;
            object: string;
            name: string;
        };
    };
    livemode: boolean;
    pending_webhooks: number;
    request: {
        id: null;
        idempotency_key: null;
    };
    type: string;
};

export type StripeSecrets = {
    STRIPE_SECRET_API_KEY: string;
    REACT_APP_STRIPE_PUBLISHABLE_KEY: string;
    WEBHOOK_SIGNING_SECRET: string;
};
