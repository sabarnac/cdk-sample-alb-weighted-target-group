import { exec } from "child_process"
import * as http from "http"

type TargetHostType = ["TG1" | "TG2", "H1" | "H2" | "H3"];

const targetCount = {TG1: 0, TG2: 0}
const hostCount = {H1: 0, H2: 0, H3: 0}

let done = 0

console.log("Getting deployed stack name");
exec("cdk list", (_: any , stdout: string, __: string) => {
  const stackName = stdout.trim();
  console.log(`Stack name: ${stackName}\nGetting ALB DNS name`);

  exec(`aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs[0].OutputValue" --output text`, (_: any , stdout: string, __: string) => {
    const dnsName = stdout.trim();
    console.log(`ALB DNS name: ${dnsName}\nPerforming 100 requests`);

    console.log("Request responses:");
    for (let i = 0; i < 100; i++) {
      http.get(`http://${dnsName}`, (res) => {
        let rawData = ""
        res.on("data", (chunk: string) => (rawData += chunk))
        res.on("end", () => {
          console.log(rawData);

          const [target, host]: TargetHostType = rawData.split(":") as TargetHostType;
    
          targetCount[target]++
          hostCount[host]++
          done++
    
          if (done >= 100) {
            console.log("");
            console.log("Final results:");
            console.table(targetCount)
            console.table(hostCount)
          }
        })
      })
    }
  })
})