#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {InfraPipelineStack} from '../lib/infra-pipeline-stack';
import {ApplicationPipelineStack} from "../lib/application-pipeline-stack";
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';

const app = new cdk.App();
new ApplicationPipelineStack(app, 'ApplicationPipelineStack');
new InfraPipelineStack(app, 'InfraPipelineStack');

// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
