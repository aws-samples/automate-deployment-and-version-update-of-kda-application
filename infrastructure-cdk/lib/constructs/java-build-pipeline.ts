import {Construct} from "constructs";
import {BuildSpec, LinuxBuildImage, PipelineProject} from "aws-cdk-lib/aws-codebuild";
import {IBucket} from "aws-cdk-lib/aws-s3";
import {Artifact, Pipeline} from "aws-cdk-lib/aws-codepipeline";
import {
    CodeBuildAction,
    LambdaInvokeAction,
    ManualApprovalAction,
    S3DeployAction
} from "aws-cdk-lib/aws-codepipeline-actions";
import {IFunction} from "aws-cdk-lib/aws-lambda/lib/function-base";


interface JavaBuildPipelineProps {
    repositoryName: string
    deployBucket: IBucket
    projectRoot?: string
    deployBucketBasePath?: string
    postActionLambda?: IFunction
}

export class JavaBuildPipeline extends Construct {
    constructor(scope: Construct, id: string, props: JavaBuildPipelineProps) {
        super(scope, id);

        let directory = ".";
        let s3BasePath = "jars";
        if (props.projectRoot) {
            directory = props.projectRoot;
        }
        if (props.deployBucketBasePath) {
            s3BasePath = props.deployBucketBasePath
        }

        const sourceAsset = new Artifact();
        const defaultBuildSpec = BuildSpec.fromObject({
            version: '0.2',
            phases: {
                install: {
                    "runtime-versions": {
                        "java": "corretto11"
                    }
                },
                build: {
                    commands: [
                        `curl ${props.repositoryName} --output app.zip`, // Download zip directly from Github
                        'unzip app.zip',
                        `cd ${directory}`,
                        'mvn clean package -B',
                        `mkdir -p ${s3BasePath}`,
                        `cp target/*.jar ${s3BasePath}/`
                    ]
                }
            },
            artifacts: {
                files: [
                    `${s3BasePath}/*.jar`
                ],
                'discard-paths': false,
                'base-directory': directory
            }
        });

        const project = new PipelineProject(this, 'Pipeline', {
            environment: {
                buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: defaultBuildSpec
        });

        const buildOutput = new Artifact();

        const pipeline = new Pipeline(this, 'CodePipeline', {
            stages: [
                // In real world use code snippet like below to work with repository
                //
                // {
                //     stageName: "source", actions: [new GitHubSourceAction({
                //         actionName: "CodeCheckout",
                //         oauthToken: SecretValue.secretsManager("github-secret"),
                //         output: sourceAsset,
                //         owner: "some-owner",
                //         repo: props.repositoryName
                //     })]
                // },
                {
                    stageName: "build", actions: [new CodeBuildAction({
                        actionName: "CodeBuild", input: sourceAsset, project: project, outputs: [buildOutput]
                    })]
                }, {
                    stageName: "saveArtefact", actions: [new S3DeployAction({
                        bucket: props.deployBucket,
                        actionName: "SaveArtefact",
                        input: buildOutput,
                        extract: true
                    })]
                }, {
                    stageName: "approval",
                    actions: [new ManualApprovalAction({
                        actionName: "Manual"
                    })]
                }]
        });

        if (props.postActionLambda) {
            pipeline.addStage({
                stageName: "deploy", actions: [new LambdaInvokeAction({
                    actionName: "Deploy",
                    lambda: props.postActionLambda
                })]
            });
        }
    }
}