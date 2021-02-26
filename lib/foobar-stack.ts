import {
  AmazonLinuxGeneration,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
  Vpc,
} from "@aws-cdk/aws-ec2"
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2"
import { InstanceTarget } from "@aws-cdk/aws-elasticloadbalancingv2-targets"
import * as cdk from "@aws-cdk/core"

export class FoobarStack extends cdk.Stack {
  public readonly vpc: Vpc;
  public readonly securityGroup: SecurityGroup;
  public readonly albSecurityGroup: SecurityGroup;
  public readonly instances: Record<string, Instance>;
  public readonly alb: ApplicationLoadBalancer;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new Vpc(this, "vpc");

    this.securityGroup = new SecurityGroup(this, "sg", {
      vpc: this.vpc
    });

    this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8080));
    this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22));

    this.albSecurityGroup = new SecurityGroup(this, "alb-sg", {
      vpc: this.vpc,
    });

    this.albSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    this.instances = {
      "H1": this.createInstance("instance-1", "TG1", "H1"),
      "H2": this.createInstance("instance-2", "TG1", "H2"),
      "H3": this.createInstance("instance-3", "TG2", "H3")
    };

    this.alb = new ApplicationLoadBalancer(this, "alb", {
      vpc: this.vpc,
      securityGroup: this.albSecurityGroup,
      http2Enabled: false,
      internetFacing: true
    })

    this.alb.addListener("listener", {
      protocol: ApplicationProtocol.HTTP,
      defaultAction: ListenerAction.weightedForward(
        [
          {
            weight: 1,
            targetGroup: new ApplicationTargetGroup(this, "TG1", {
              targetGroupName: "TG1",
              protocol: ApplicationProtocol.HTTP,
              port: 8080,
              vpc: this.vpc,
              healthCheck: {
                enabled: true
              },
              targets: [
                new InstanceTarget(this.instances.H1, 8080),
                new InstanceTarget(this.instances.H2, 8080)
              ]
            })
          },
          {
            weight: 1,
            targetGroup: new ApplicationTargetGroup(this, "TG2", {
              targetGroupName: "TG2",
              protocol: ApplicationProtocol.HTTP,
              port: 8080,
              vpc: this.vpc,
              healthCheck: {
                enabled: true
              },
              targets: [new InstanceTarget(this.instances.H3, 8080)]
            })
          }
        ]
      )
    })
  }

  private createInstance = (name: string, target: string, host: string): Instance => {
    const userData = UserData.custom(
`#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
cd /home/ec2-user
echo "Starting user script"
yum -y update
echo "Installing NodeJS"
curl --silent --location https://rpm.nodesource.com/setup_13.x | bash
yum -y install nodejs
npm i cross-env -g
echo "Installed NodeJS. Creating application."
touch index.js
echo "const http = require('http')" >> index.js
echo "" >> index.js
echo "const server = http.createServer((req, resp) => {" >> index.js
echo "  resp.writeHead(200)" >> index.js
echo "  resp.end('${target}:${host}')" >> index.js
echo "})" >> index.js
echo "" >> index.js
echo "server.listen(8080)" >> index.js
echo "Created application. Starting application..."
node index.js`
    )

    return new Instance(this, name, {
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC
      },
      securityGroup: this.securityGroup,
      userData: userData,
      userDataCausesReplacement: true,
    });
  }
}
