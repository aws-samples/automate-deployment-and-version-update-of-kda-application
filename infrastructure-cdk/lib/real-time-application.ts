import {Stage, StageProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {ApplicationStack} from "./application-stack";
import {ApplicationRuntime} from "./constructs/application-runtime";
import {BUILD_FOR_RUNTIME} from "./shared-vars";


export class RealtimeApplication extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        // @ts-ignore
        if (BUILD_FOR_RUNTIME == ApplicationRuntime.JAVA)
            new ApplicationStack(this, 'ApplicationStack', {
                runtime: ApplicationRuntime.JAVA
            });
        else
            // For python
            new ApplicationStack(this, 'ApplicationStack', {
                runtime: ApplicationRuntime.PYTHON
            });
    }
}