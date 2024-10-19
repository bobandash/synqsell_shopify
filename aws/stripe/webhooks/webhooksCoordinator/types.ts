export type Event = {
    resource: string;
    path: string;
    httpMethod: string;
    headers: {
        [key: string]: string;
    };
    multiValueHeaders: {
        [key: string]: string[];
    };
    queryStringParameters: null | {
        [key: string]: string;
    };
    multiValueQueryStringParameters: null | {
        [key: string]: string[];
    };
    pathParameters: null | {
        [key: string]: string;
    };
    stageVariables: null | {
        [key: string]: string;
    };
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
            cognitoIdentityPoolId: null | string;
            accountId: null | string;
            cognitoIdentityId: null | string;
            caller: null | string;
            sourceIp: string;
            principalOrgId: null | string;
            accessKey: null | string;
            cognitoAuthenticationType: null | string;
            cognitoAuthenticationProvider: null | string;
            userArn: null | string;
            userAgent: string;
            user: null | string;
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
