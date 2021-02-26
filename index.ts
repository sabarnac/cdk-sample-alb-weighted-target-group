import { exec } from "child_process"
import * as http from "http"

type TargetHostType = ["TG1" | "TG2", "H1" | "H2" | "H3"];

const targetCount = {TG1: 0, TG2: 0}
const hostCount = {H1: 0, H2: 0, H3: 0}

let done = 0

exec("cdk list", (_: any , stdout: string, __: string) => {
  const stackName = stdout.trim();

  exec(`aws cloudformation describe-stacks --stack-name ${stackName} --query "Stacks[0].Outputs[0].OutputValue" --output text`, (_: any , stdout: string, __: string) => {
    const dnsName = stdout.trim();

    for (let i = 0; i < 100; i++) {
      http.get(`http://${dnsName}`, (res) => {
        let rawData = ""
        res.on("data", (chunk: string) => (rawData += chunk))
        res.on("end", () => {
          const [target, host]: TargetHostType = rawData.split(":") as TargetHostType;
    
          targetCount[target]++
          hostCount[host]++
          done++
    
          if (done >= 100) {
            console.table(targetCount)
            console.table(hostCount)
          }
        })
      })
    }
  })
})