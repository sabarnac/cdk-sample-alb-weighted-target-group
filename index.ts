import { exec } from "child_process"

const HttpQueue = require("http-queue")

type TargetHostType = ["TG1" | "TG2", "H1" | "H2" | "H3"];

const totalRequests = 1000
const targetCount = {TG1: 0, TG2: 0}
const hostCount = {H1: 0, H2: 0, H3: 0}
let done = 0

const httpQueue = new HttpQueue(50);

console.log("Getting deployed stack name");
exec("cdk list", (_: any , stdout: string, __: string) => {
  const stackName = stdout.trim();
  console.log(`Stack name: ${stackName}\nGetting ALB DNS name`);

  exec(`aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs[0].OutputValue" --output text`, (_: any , stdout: string, __: string) => {
    const dnsName = stdout.trim();
    console.log(`ALB DNS name: ${dnsName}\nPerforming ${totalRequests} requests`);

    console.log("Request responses:");
    for (let i = 0; i < totalRequests; i++) {
      httpQueue.newRequest(`http://${dnsName}`, (rawData: any) => {
        console.log(rawData);

        const [target, host]: TargetHostType = rawData.split(":") as TargetHostType;
  
        targetCount[target]++
        hostCount[host]++
        done++
  
        if (done >= totalRequests) {
          console.log("");
          console.log("Final results:");
          console.table(targetCount)
          console.table(hostCount)
        }
      })
    }
  })
})