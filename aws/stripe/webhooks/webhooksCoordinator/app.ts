import { Lambda } from 'aws-sdk';

const lambda = new Lambda();

async function invokeLambda(functionName: string, payload: any) {
    const params = {
        FunctionName: functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify(payload),
    };

    try {
        await lambda.invoke(params).promise();
        console.log(`Successfully invoked ${functionName}`);
    } catch (error) {
        console.error(error);
        console.error(payload);
        console.error(`Error invoking ${functionName}.`);
    }
}
// serves as coordinator from sqs to this function to invoke other lambda functions
export const lambdaHandler = async (event: any) => {
    try {
        console.log(event);
    } catch (error) {
        console.error(error);
    }
};
