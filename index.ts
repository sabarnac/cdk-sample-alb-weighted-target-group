import { exec } from "child_process"

const HttpQueue = require("http-queue");

type TargetHostType = ["TG1" | "TG2", "H1" | "H2" | "H3"];

const DISPLAY_REFRESH_INTERVAL_MILLIS = 1000;
const TOTAL_REQUESTS = 1000;
const QUEUE_WAIT_TIME_MILLIS = 100;

let targetCount = { TG1: 0, TG2: 0 };
let hostCount = { H1: 0, H2: 0, H3: 0 };
let pass = 0;
let fail = 0;

const httpQueue = new HttpQueue(QUEUE_WAIT_TIME_MILLIS);

const getCdkStackName = (): Promise<string> =>
  new Promise((resolve, _) => {
    exec("cdk list", (_: any, stdout: string, __: string) => {
      resolve(stdout.trim());
    });
  });

const getAlbDnsName = (stackName: string): Promise<string> =>
  new Promise((resolve, _) => {
    exec(
      `aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs[0].OutputValue" --output text`,
      (_: any, stdout: string, __: string) => {
        resolve(stdout.trim());
      },
    );
  });

const queueRequest = (dnsName: string): Promise<string> =>
  new Promise((resolve, reject) => {
    httpQueue.newRequest(
      `http://${dnsName}`,
      (rawData: string) => {
        resolve(rawData);
      },
      (error: any) => {
        reject(error);
      },
    );
  });

const successResponseHandler = (rawData: string) => {
  const [target, host]: TargetHostType = rawData.split(":") as TargetHostType;

  targetCount[target]++;
  hostCount[host]++;

  pass++;
};

const failureResponseHandler = () => {
  fail++;
};

const printResponseCounts = () => {
  console.clear();
  console.log(`Performing ${TOTAL_REQUESTS} requests`);
  console.log(`Completed ${pass} requests. Failed ${fail} requests`);
  console.log("");
  console.log("Results:");
  console.table(targetCount);
  console.table(hostCount);
};

console.log("Setting up...");
getCdkStackName()
  .then(getAlbDnsName)
  .then((dnsName) => {
    console.log(`Setup complete`);

    const printId = setInterval(printResponseCounts, DISPLAY_REFRESH_INTERVAL_MILLIS);

    let requests = [];
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      requests.push(queueRequest(dnsName).then(successResponseHandler).catch(failureResponseHandler));
    }

    Promise.all(requests).then(() => {
      printResponseCounts();
      console.log("");
      console.log("Completed!");
      clearInterval(printId);
    });
  });
