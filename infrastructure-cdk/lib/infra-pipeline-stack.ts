import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {CodePipeline, ShellStep} from "aws-cdk-lib/pipelines";
import {RealtimeApplication} from "./real-time-application";
import {REPOSITORY_FILE_PATH} from "./shared-vars";

export class InfraPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);


        const pipeline = new CodePipeline(this, 'Pipeline', {
            selfMutation: false,
            synth: new ShellStep('Synth', {
                commands: [
                    "curl " + REPOSITORY_FILE_PATH + " --output app.zip",
                    "unzip app.zip",
                    "cd infrastructure-cdk",
                    "npm ci",
                    "npm run build",
                    "npm cdk synth"
                ],
                primaryOutputDirectory: 'infrastructure-cdk/cdk.out'
            })
        });

        pipeline.addStage(new RealtimeApplication(this, 'app'));
    }
}
