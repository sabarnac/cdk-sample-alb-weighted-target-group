# cdk-sample-alb-weighted-target-group

## Pre-requisites
* Install AWS CLI
* Install TypeScript
* Install CDK

## Configure
The weights of the target groups can be defined in `config/weights.json`

## Execute
* Run `npm run bootstrap` to bootstrap CDK resources in your AWS account.
* Run `npm run deploy` to deploy the stack into your AWS account.
* After you've confirmed the application is running, run `npm run count` to get the look at the traffic distribution between the target groups and hosts.