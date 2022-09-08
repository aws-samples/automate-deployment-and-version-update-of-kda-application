#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {InfraPipelineStack} from '../lib/infra-pipeline-stack';
import {ApplicationPipelineStack} from "../lib/application-pipeline-stack";

const app = new cdk.App();
new ApplicationPipelineStack(app, 'ApplicationPipelineStack');
new InfraPipelineStack(app, 'InfraPipelineStack');
